from pathlib import Path
import io

from fastapi.testclient import TestClient
import pdfplumber

from uqual.api import create_app
from uqual.behaviour import financial_behaviour
from uqual.statements import import_csv
from uqual.demo_statement import generated_statement


FIXTURE = Path('mobile/demo/behaviour-test-statement.csv')


def test_generated_demo_is_saved_and_exposes_full_features(monkeypatch, tmp_path):
    monkeypatch.setenv('UQUAL_ACCOUNT_DIR', str(tmp_path / 'vault'))
    monkeypatch.setenv('UQUAL_WORKER_ENABLED', 'false')
    assert len(generated_statement().splitlines()) == 44
    with TestClient(create_app(api_key='a' * 32)) as client:
        created = client.post('/v1/auth/register', json={'name': 'Demo', 'email': 'demo@example.test',
            'password': 'test-passphrase-2026', 'accept_storage_policy': True})
        headers = {'Authorization': 'Bearer ' + created.json()['token']}
        assert client.post('/v1/statements/generated-demo', headers=headers,
                           json={'consent': False}).status_code == 422
        response = client.post('/v1/statements/generated-demo', headers=headers, json={'consent': True})
        assert response.status_code == 201, response.text
        saved = response.json()
        assert saved['analysis']['statement_source'] == 'generated_sample_saved'
        assert saved['analysis']['financial_behaviour']['index'] == 85.7
        assert saved['analysis']['score_explanation']['method']
        base = '/v1/statements/' + saved['id']
        assert client.get(base + '/classifications', headers=headers).json()['total'] == 43
        assert client.post(base + '/behaviour/scenario', headers=headers,
            json={'discretionary_cut_pct': 10}).status_code == 200
        assert client.post(base + '/passport-links', headers=headers,
            json={'consent': True, 'recipient': 'Demo panel'}).status_code == 201


def test_behaviour_factor_math_and_unknown_income_abstention():
    tx = import_csv(FIXTURE, 'a', 'c', 'IN', 'INR')
    assessment = {'account_id': 'a', 'customer_id': 'c', 'as_of': '2026-07-01'}
    result = financial_behaviour(tx, assessment)
    assert result['status'] == 'descriptive_only'
    assert result['complete_months'] == 6
    assert result['index'] == sum(f['contribution'] for f in result['factors'])
    assert result['index'] == 85.7
    assert result['factors'][2]['observed_ratio'] == .3
    assert result['factors'][3]['observed_ratio'] == .36
    tx.loc[tx.category.eq('salary'), 'category'] = 'unknown'
    missing = financial_behaviour(tx, assessment)
    assert missing['index'] is None
    assert missing['status'] == 'insufficient_data'


def test_uploaded_statement_passport_requires_owner_and_consent(monkeypatch, tmp_path):
    monkeypatch.setenv('UQUAL_ACCOUNT_DIR', str(tmp_path / 'vault'))
    monkeypatch.setenv('UQUAL_WORKER_ENABLED', 'false')
    with TestClient(create_app(api_key='a' * 32)) as client:
        def register(email):
            response = client.post('/v1/auth/register', json={'name': 'Fixture', 'email': email,
                'password': 'test-passphrase-2026', 'accept_storage_policy': True})
            assert response.status_code == 201, response.text
            return {'Authorization': 'Bearer ' + response.json()['token']}
        owner = register('fixture-owner@example.test')
        other = register('fixture-other@example.test')
        uploaded = client.post('/v1/statements', headers=owner,
            files={'file': ('behaviour.csv', FIXTURE.read_bytes(), 'text/csv')},
            data={'consent': 'true', 'statement_end': '2026-06-30'})
        assert uploaded.status_code == 201, uploaded.text
        record = uploaded.json()
        assert record['analysis']['financial_behaviour']['index'] == 85.7
        endpoint = f"/v1/statements/{record['id']}/passport"
        behaviour_endpoint = f"/v1/statements/{record['id']}/behaviour"
        assert client.get(behaviour_endpoint, headers=other).status_code == 404
        assert client.get(behaviour_endpoint, headers=owner).json()['index'] == 85.7
        assert client.post(endpoint, headers=other, json={'consent': True, 'recipient': 'Test lender'}).status_code == 404
        assert client.post(endpoint, headers=owner, json={'consent': False, 'recipient': 'Test lender'}).status_code == 422
        assert client.post(endpoint, headers=owner, json={'consent': True, 'recipient': '  '}).status_code == 422
        response = client.post(endpoint, headers=owner, json={'consent': True, 'recipient': 'Test lender'})
        assert response.status_code == 200, response.text
        passport = response.json()
        assert passport['behaviour']['index'] == 85.7
        assert passport['recipient_entered_by_user'] == 'Test lender'
        assert 'not sent' in passport['notices'][0]
        issued = client.post(endpoint + '-links', headers=owner,
            json={'consent': True, 'recipient': 'Test lender'})
        assert issued.status_code == 201, issued.text
        link = issued.json()
        downloaded = client.get(link['path'])
        assert downloaded.status_code == 200 and downloaded.content.startswith(b'%PDF')
        assert 'application/pdf' in downloaded.headers['content-type']
        with pdfplumber.open(io.BytesIO(downloaded.content)) as pdf:
            rendered_text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
        assert 'Financial Behaviour Index' in rendered_text
        assert '85.7 / 100' in rendered_text
        assert 'Ideathon' not in rendered_text
        listed = client.get(endpoint + '-links', headers=owner).json()['links'][0]
        assert listed['path'] == link['path']
        assert client.get(endpoint + '-links', headers=other).status_code == 404
        assert client.delete(endpoint + '-links/' + link['id'], headers=other).status_code == 404
        assert client.delete(endpoint + '-links/' + link['id'], headers=owner).status_code == 200
        assert client.get(link['path']).status_code == 404
