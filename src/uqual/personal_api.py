"""User-authenticated endpoints; developer API keys cannot access personal vaults."""
from datetime import date, datetime, timezone
import io
import os
import re
import threading
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile, Query
import pandas as pd
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from starlette.concurrency import run_in_threadpool

from .accounts import CONSENT_VERSION
from .mobile import MAX_UPLOAD_BYTES, analyze_sample
from .scoring import simulate
from .ingestion import MIME, IngestionError
from .processing import process_statement
from .behaviour import financial_behaviour
from .behaviour import scenario as behaviour_scenario
from .classification import ALLOWED, classify, classification_summary
from .scoring import score_statement
from .passport_pdf import render_passport
from .demo_statement import generated_statement

router = APIRouter(prefix="/v1")
SYNC_SLOTS = threading.BoundedSemaphore(2)


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator('email')
    @classmethod
    def email_format(cls, value):
        value = value.strip().casefold()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Enter a valid email address')
        return value


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=80)
    accept_storage_policy: bool

    @field_validator('name')
    @classmethod
    def name_not_blank(cls, value):
        if not value.strip():
            raise ValueError('Name cannot be blank')
        return value.strip()


class DeleteAccount(BaseModel):
    password: str = Field(min_length=12, max_length=128)


class PassportConsent(BaseModel):
    consent: bool
    recipient: str = Field(min_length=2, max_length=100)

    @field_validator('recipient')
    @classmethod
    def recipient_not_blank(cls, value):
        if len(value.strip()) < 2:
            raise ValueError('Enter the intended recipient name')
        return value.strip()


class CategoryCorrection(BaseModel):
    transaction_id: str = Field(min_length=1, max_length=200)
    category: str
    expected_revision: int = Field(ge=0)

    @field_validator('category')
    @classmethod
    def allowed_category(cls, value):
        if value not in ALLOWED:
            raise ValueError('Choose a supported category')
        return value


class BehaviourScenario(BaseModel):
    discretionary_cut_pct: float = Field(ge=0, le=30)


class DemoConsent(BaseModel):
    consent: bool


def store(request: Request):
    if request.app.state.accounts is None:
        raise HTTPException(503, 'Personal accounts are not configured on this server')
    return request.app.state.accounts


def bearer(authorization: Annotated[str | None, Header()] = None):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Please sign in')
    return authorization[7:]


def user(request: Request, token=Depends(bearer)):
    return store(request).authenticate(token)


@router.get('/info')
def info(request: Request):
    return {'accounts_available': request.app.state.accounts is not None,
            'synthetic_demo_available': request.app.state.synthetic_bundle is not None,
            'consent_version': CONSENT_VERSION, 'email_verification': False,
            'supported_formats': list(MIME), 'processing_jobs': True,
            'pdf_support': 'Verified text layouts; scanned/OCR PDFs are rejected'}


@router.post('/auth/register', status_code=201)
def register(body: Registration, request: Request):
    if not body.accept_storage_policy:
        raise HTTPException(422, 'Accept the account storage policy before registering')
    return store(request).register(body.name, body.email, body.password, request.client.host)


@router.post('/auth/login')
def login(body: Credentials, request: Request):
    return store(request).login(body.email, body.password, request.client.host)


@router.post('/auth/logout')
def logout(request: Request, current=Depends(user), token=Depends(bearer)):
    store(request).logout(token)
    return {'signed_out': True}


@router.get('/me')
def me(current=Depends(user)):
    return current


@router.delete('/me')
def delete_account(body: DeleteAccount, request: Request, current=Depends(user)):
    store(request).delete_account(current['id'], body.password)
    return {'deleted': True}


@router.get('/statements')
def history(request: Request, current=Depends(user)):
    return {'statements': store(request).history(current['id'])}


@router.get('/statements/{identifier}/document')
def document(identifier: str, request: Request, current=Depends(user)):
    metadata = store(request).statement(current['id'],identifier)
    extension = metadata.get('format','csv')
    return Response(store(request).document(current['id'], identifier), media_type=MIME.get(extension,'application/octet-stream'),
                    headers={'Content-Disposition': f'attachment; filename="statement.{extension if extension in MIME else "bin"}"', 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff'})


@router.delete('/statements/{identifier}')
def delete_statement(identifier: str, request: Request, current=Depends(user)):
    store(request).delete_statement(current['id'], identifier)
    return {'deleted': True}


@router.post('/statements', status_code=201)
async def upload(request: Request, current=Depends(user), file: UploadFile = File(...),
                 consent: bool = Form(False), statement_end: date | None = Form(None),
                 date_format: str = Form('%Y-%m-%d')):
    try:
        if not consent:
            raise HTTPException(422, 'Consent is required for analysis and encrypted storage')
        if statement_end is None:
            raise HTTPException(422, 'Enter the actual statement end date')
        if request.app.state.synthetic_bundle is None:
            raise HTTPException(503, 'The demo model is unavailable')
        if os.environ.get('UQUAL_SYNC_UPLOADS','true').lower() != 'true':
            raise HTTPException(503, 'Use /v1/statement-jobs for asynchronous processing')
        payload = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(payload) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, 'Statement exceeds 10 MB')
        if not SYNC_SLOTS.acquire(blocking=False):
            raise HTTPException(429, 'Synchronous processing is busy; use the processing queue')
        try:
            result, normalized = await run_in_threadpool(process_statement, request.app.state.synthetic_bundle, file.filename or 'statement.csv', payload, date_format, statement_end)
            return await run_in_threadpool(store(request).save, current['id'], file.filename or 'statement.csv', payload, result, normalized)
        finally:
            SYNC_SLOTS.release()
    except IngestionError as exc:
        raise HTTPException(422, {'code':exc.code,'message':str(exc)}) from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(422, 'Cannot analyze this statement: ' + str(exc)) from exc
    finally:
        await file.close()


@router.post('/statements/generated-demo', status_code=201)
async def save_generated_demo(body: DemoConsent, request: Request, current=Depends(user)):
    if not body.consent:
        raise HTTPException(422, 'Consent is required before saving a generated statement')
    if request.app.state.synthetic_bundle is None:
        raise HTTPException(503, 'The demo model is unavailable')
    source = generated_statement()
    result, normalized = await run_in_threadpool(
        process_statement, request.app.state.synthetic_bundle,
        'UQUAL-generated-demo-2026.csv', source, '%Y-%m-%d', date(2026, 6, 30))
    result['statement_source'] = 'generated_sample_saved'
    result['processing'] = 'Generated synthetic statement saved in this private account for demonstration'
    return await run_in_threadpool(store(request).save, current['id'],
                                   'UQUAL-generated-demo-2026.csv', source, result, normalized)


@router.get('/statements/{identifier}')
def statement(identifier: str, request: Request, current=Depends(user)):
    return store(request).statement(current['id'],identifier)


@router.get('/statements/{identifier}/normalized.csv')
def normalized(identifier: str, request: Request, current=Depends(user)):
    return Response(store(request).normalized(current['id'],identifier),media_type='text/csv',
                    headers={'Content-Disposition':'attachment; filename="normalized-transactions.csv"','X-Content-Type-Options':'nosniff'})


@router.get('/statements/{identifier}/transactions')
def transactions(identifier: str, request: Request, current=Depends(user),
                 offset: int=Query(0,ge=0), limit: int=Query(100,ge=1,le=500)):
    frame = pd.read_csv(io.BytesIO(store(request).normalized(current['id'],identifier)),dtype=str).fillna('')
    return {'offset':offset,'limit':limit,'total':len(frame),'transactions':frame.iloc[offset:offset+limit].to_dict('records')}


@router.get('/statements/{identifier}/classifications')
def classifications(identifier: str, request: Request, current=Depends(user),
                    offset: int=Query(0,ge=0), limit: int=Query(100,ge=1,le=500)):
    account = store(request)
    record = account.statement(current['id'], identifier)
    frame = classify(pd.read_csv(io.BytesIO(account.normalized(current['id'], identifier)), dtype=str))
    flagged = frame.classification_status.isin(['suggested_review', 'unclassified']) | frame.possible_duplicate | frame.possible_refund
    frame = frame.assign(_priority=flagged).sort_values(['_priority', 'date'], ascending=[False, False], kind='stable')
    page = frame.iloc[offset:offset+limit].drop(columns=['_priority']).copy()
    page['date'] = page.date.dt.strftime('%Y-%m-%d')
    return {'total': len(frame), 'offset': offset, 'limit': limit,
            'revision': record.get('analysis_revision', 0), 'summary': classification_summary(frame),
            'transactions': page.fillna('').to_dict('records'), 'categories': sorted(ALLOWED)}


@router.post('/statements/{identifier}/category')
def correct_category(identifier: str, body: CategoryCorrection, request: Request, current=Depends(user)):
    account = store(request)
    record = account.statement(current['id'], identifier)
    frame = classify(pd.read_csv(io.BytesIO(account.normalized(current['id'], identifier)), dtype=str))
    hits = frame.transaction_id.eq(body.transaction_id)
    if hits.sum() != 1:
        raise HTTPException(404, 'Transaction not found in this statement')
    direction = frame.loc[hits, 'direction'].iloc[0]
    if direction == 'debit' and body.category in {'salary','pension','freelance_income','business_income','refund','loan_disbursement'}:
        raise HTTPException(422, 'This category applies only to credits')
    if direction == 'credit' and body.category in {'loan_payment','rent','insurance','utility','groceries','transport','shopping','bank_fee','penalty'}:
        raise HTTPException(422, 'This category applies only to debits')
    previous_category = str(frame.loc[hits, 'category'].iloc[0])
    frame.loc[hits, 'category'] = body.category
    frame.loc[hits, 'classification_status'] = 'user_confirmed'
    frame.loc[hits, 'classification_confidence'] = 1.0
    frame.loc[hits, 'classification_basis'] = 'Corrected by account owner'
    frame = classify(frame)
    prior = record['analysis']
    end = pd.Timestamp(prior['statement_period']['end'])
    assessment = {'assessment_id': prior['assessment_id'], 'account_id': str(frame.account_id.iloc[0]),
                  'customer_id': str(frame.customer_id.iloc[0]), 'country': 'IN', 'currency': 'INR',
                  'as_of': str((end + pd.Timedelta(days=1)).date())}
    if request.app.state.synthetic_bundle is None:
        raise HTTPException(503, 'The demo model is unavailable')
    updated = score_statement(request.app.state.synthetic_bundle, frame, assessment, synthetic_demo=True)
    updated.update({key: prior[key] for key in ['statement_source','statement_period','import_report','processing'] if key in prior})
    updated['classification'] = classification_summary(frame)
    updated['previous_synthetic_risk_index'] = prior.get('synthetic_risk_index')
    updated['correction_note'] = 'Category correction changed model inputs; difference is not a causal effect of future behaviour'
    updated['score_change_context'] = {'transaction_id': body.transaction_id,
                                       'old_category': previous_category, 'new_category': body.category,
                                       'previous_index': prior.get('synthetic_risk_index'),
                                       'current_index': updated.get('synthetic_risk_index')}
    buffer = io.StringIO()
    frame.to_csv(buffer, index=False, date_format='%Y-%m-%d')
    return account.revise_analysis(current['id'], identifier, body.expected_revision, updated, buffer.getvalue().encode())


@router.post('/statements/{identifier}/passport')
def passport(identifier: str, body: PassportConsent, request: Request, current=Depends(user)):
    if not body.consent:
        raise HTTPException(422, 'Explicit consent is required for each passport export')
    account = store(request)
    record = account.statement(current['id'], identifier)
    analysis = record['analysis']
    behaviour = behaviour_for_record(account, current['id'], identifier, analysis)
    with account.db() as db:
        account.audit(db, current['id'], identifier, 'passport_export', int(datetime.now(timezone.utc).timestamp()))
    return {'report_type': 'UQUAL financial passport', 'generated_at': datetime.now(timezone.utc).isoformat(),
            'recipient_entered_by_user': body.recipient.strip(), 'statement_period': analysis.get('statement_period'),
            'source': 'user_uploaded_statement', 'behaviour': behaviour,
            'synthetic_demo_index': analysis.get('synthetic_risk_index'),
            'notices': ['User initiated export; UQUAL has not sent this report to a lender.',
                        'This is not an official bureau score or validated lending decision.',
                        'The recipient must verify source authenticity and identity independently.']}


@router.post('/statements/{identifier}/passport-links', status_code=201)
def create_passport_link(identifier: str, body: PassportConsent, request: Request, current=Depends(user)):
    report = passport(identifier, body, request, current)
    return store(request).create_passport_share(current['id'], identifier, body.recipient, render_passport(report))


@router.get('/statements/{identifier}/passport-links')
def list_passport_links(identifier: str, request: Request, current=Depends(user)):
    return {'links': store(request).passport_shares(current['id'], identifier)}


@router.delete('/statements/{identifier}/passport-links/{share_id}')
def revoke_passport_link(identifier: str, share_id: str, request: Request, current=Depends(user)):
    return store(request).revoke_passport(current['id'], identifier, share_id)


@router.get('/passport-links/{token}.pdf')
def download_passport(token: str, request: Request):
    return Response(store(request).passport_pdf(token), media_type='application/pdf', headers={
        'Content-Disposition': 'attachment; filename="uqual-financial-passport.pdf"',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


def behaviour_for_record(account, owner, identifier, analysis):
    if analysis.get('financial_behaviour') is not None:
        return analysis['financial_behaviour']
    frame = pd.read_csv(io.BytesIO(account.normalized(owner, identifier)), dtype=str)
    end = pd.Timestamp(analysis['statement_period']['end'])
    assessment = {'customer_id': frame.customer_id.iloc[0], 'account_id': frame.account_id.iloc[0],
                  'as_of': str((end + pd.Timedelta(days=1)).date())}
    return financial_behaviour(frame, assessment)


@router.get('/statements/{identifier}/behaviour')
def statement_behaviour(identifier: str, request: Request, current=Depends(user)):
    account = store(request)
    analysis = account.statement(current['id'], identifier)['analysis']
    return behaviour_for_record(account, current['id'], identifier, analysis)


@router.post('/statements/{identifier}/behaviour/scenario')
def statement_scenario(identifier: str, body: BehaviourScenario, request: Request, current=Depends(user)):
    account = store(request)
    analysis = account.statement(current['id'], identifier)['analysis']
    frame = pd.read_csv(io.BytesIO(account.normalized(current['id'], identifier)), dtype=str)
    end = pd.Timestamp(analysis['statement_period']['end'])
    assessment = {'customer_id': frame.customer_id.iloc[0], 'account_id': frame.account_id.iloc[0],
                  'as_of': str((end + pd.Timedelta(days=1)).date())}
    return behaviour_scenario(frame, assessment, body.discretionary_cut_pct)


def queue(request):
    if request.app.state.jobs is None:
        raise HTTPException(503,'Processing queue is not configured')
    return request.app.state.jobs


@router.post('/statement-jobs',status_code=202)
async def submit_job(request: Request, current=Depends(user), file: UploadFile=File(...),
                     consent: bool=Form(False), statement_end: date | None=Form(None), date_format: str=Form('%Y-%m-%d')):
    try:
        if not consent:
            raise HTTPException(422,'Consent is required for analysis and encrypted storage')
        if request.app.state.synthetic_bundle is None:
            raise HTTPException(503,'The demo model is unavailable')
        payload = await file.read(MAX_UPLOAD_BYTES+1)
        if len(payload)>MAX_UPLOAD_BYTES:
            raise HTTPException(413,'Statement exceeds 10 MB')
        return await run_in_threadpool(queue(request).submit,current['id'],file.filename or '',payload,date_format,statement_end)
    except IngestionError as exc:
        raise HTTPException(422, {'code':exc.code,'message':str(exc)}) from exc
    finally:
        await file.close()


@router.get('/statement-jobs')
def jobs(request: Request, current=Depends(user)):
    return {'jobs':queue(request).history(current['id'])}


@router.get('/statement-jobs/{identifier}')
def job(identifier: str, request: Request, current=Depends(user)):
    result = queue(request).get(current['id'],identifier)
    if result['status']=='completed':
        result['result'] = store(request).statement(current['id'],result['statement_id'])
    return result


@router.delete('/statement-jobs/{identifier}')
def cancel_job(identifier: str, request: Request, current=Depends(user)):
    return queue(request).cancel(current['id'],identifier)


@router.post('/sample')
async def sample(request: Request, current=Depends(user)):
    if request.app.state.synthetic_bundle is None:
        raise HTTPException(503, 'The demo model is unavailable')
    return await run_in_threadpool(analyze_sample, request.app.state.synthetic_bundle)


@router.post('/simulate')
def simulation(request: Request, body: dict, current=Depends(user)):
    # Reuse the existing validated request contract without a circular import at module load.
    from .api import SimulationRequest
    try:
        values = SimulationRequest.model_validate(body)
    except ValueError as exc:
        raise HTTPException(422, 'Enter valid simulation inputs') from exc
    return simulate(**values.model_dump())
