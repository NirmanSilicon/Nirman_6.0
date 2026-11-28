import io
from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

from uqual.api import create_app
from uqual.classification import classify
from uqual.statements import import_csv


def test_conservative_suggestions_and_flags():
    frame = import_csv(Path('mobile/demo/behaviour-test-statement.csv'), 'a', 'c', 'IN', 'INR')
    frame['category'] = 'unknown'
    frame.loc[frame.description.eq('Test salary'), 'description'] = 'MONTHLY SALARY CREDIT'
    frame.loc[frame.description.eq('Test groceries'), 'description'] = 'BIGBASKET GROCERIES'
    tagged = classify(frame)
    salary = tagged[tagged.description.eq('MONTHLY SALARY CREDIT')].iloc[0]
    assert salary.category == 'unknown' and salary.suggested_category == 'salary'
    assert salary.classification_status == 'suggested_review'
    groceries = tagged[tagged.description.eq('BIGBASKET GROCERIES')].iloc[0]
    assert groceries.category == 'groceries' and groceries.classification_status == 'auto_applied'
    assert classify(tagged).equals(tagged)


def test_category_correction_rescores_owner_only(monkeypatch, tmp_path):
    monkeypatch.setenv('UQUAL_ACCOUNT_DIR', str(tmp_path / 'vault'))
    monkeypatch.setenv('UQUAL_WORKER_ENABLED', 'false')
    source = pd.read_csv('mobile/demo/behaviour-test-statement.csv')
    source.loc[source.Category.eq('salary'), 'Category'] = 'unknown'
    source.loc[source.Description.eq('Test salary'), 'Description'] = 'MONTHLY SALARY CREDIT'
    out = io.StringIO(); source.to_csv(out, index=False)
    with TestClient(create_app(api_key='a' * 32)) as client:
        def register(address):
            result = client.post('/v1/auth/register', json={'name':'Tester','email':address,
                'password':'test-passphrase-2026','accept_storage_policy':True})
            assert result.status_code == 201
            return {'Authorization':'Bearer '+result.json()['token']}
        owner, other = register('classifier@example.test'), register('stranger@example.test')
        uploaded = client.post('/v1/statements', headers=owner, files={'file':('review.csv',out.getvalue().encode(),'text/csv')},
            data={'consent':'true','statement_end':'2026-06-30'})
        assert uploaded.status_code == 201, uploaded.text
        item = uploaded.json(); endpoint = f"/v1/statements/{item['id']}"
        assert item['analysis']['financial_behaviour']['index'] is None
        page = client.get(endpoint+'/classifications', headers=owner).json()
        assert page['summary']['needs_review'] >= 6
        assert client.get(endpoint+'/classifications', headers=other).status_code == 404
        first = next(x for x in page['transactions'] if x['suggested_category']=='salary')
        passport = client.post(endpoint+'/passport-links', headers=owner,
            json={'consent':True,'recipient':'Demo panel'}).json()
        assert client.get(passport['path']).status_code == 200
        bad = client.post(endpoint+'/category', headers=owner,
            json={'transaction_id':first['transaction_id'],'category':'rent','expected_revision':0})
        assert bad.status_code == 422
        corrected = client.post(endpoint+'/category', headers=owner,
            json={'transaction_id':first['transaction_id'],'category':'salary','expected_revision':0})
        assert corrected.status_code == 200, corrected.text
        assert corrected.json()['analysis_revision'] == 1
        assert client.get(passport['path']).status_code == 404
        assert client.post(endpoint+'/category', headers=owner,
            json={'transaction_id':first['transaction_id'],'category':'salary','expected_revision':0}).status_code == 409
        scenario = client.post(endpoint+'/behaviour/scenario', headers=owner,
            json={'discretionary_cut_pct':10})
        assert scenario.status_code == 200
