from pathlib import Path
import time

import pytest
from fastapi.testclient import TestClient

from uqual.accounts import AccountError, Accounts
from uqual.api import create_app

PASSWORD = 'generated-test-passphrase-123'


@pytest.fixture
def vault(tmp_path):
    return Accounts(tmp_path / 'accounts')


def test_accounts_authentication_logout_expiry(vault):
    session = vault.register('Test User', 'USER@example.test', PASSWORD, 'one')
    assert vault.authenticate(session['token'])['email'] == 'user@example.test'
    with pytest.raises(AccountError, match='not recognized'):
        vault.login('user@example.test', 'incorrect-password', 'one')
    logged = vault.login('USER@example.test', PASSWORD, 'one')
    vault.logout(logged['token'])
    with pytest.raises(AccountError):
        vault.authenticate(logged['token'])
    with vault.db() as db:
        db.execute('UPDATE sessions SET expires=?', (int(time.time())-1,))
    with pytest.raises(AccountError):
        vault.authenticate(session['token'])


def test_encrypted_vault_owner_isolation_reopen_and_deletion(vault):
    a = vault.register('Alice', 'a@example.test', PASSWORD, 'one')
    b = vault.register('Bob', 'b@example.test', PASSWORD, 'two')
    source = b'Date,Description\n2026-01-01,PRIVATE-FINANCIAL-DATA'
    analysis = {'statement_period': {'end':'2026-01-31'}, 'synthetic_risk_index':47.57}
    saved = vault.save(a['user']['id'], 'private-salary.csv', source, analysis)
    assert vault.save(a['user']['id'], 'again.csv', source, analysis)['id'] == saved['id']
    assert len(vault.history(a['user']['id'])) == 1
    assert not vault.history(b['user']['id'])
    with pytest.raises(AccountError):
        vault.document(b['user']['id'], saved['id'])
    with pytest.raises(AccountError):
        vault.delete_statement(b['user']['id'], saved['id'])
    assert vault.document(a['user']['id'], saved['id']) == source
    raw = vault.path.read_bytes()
    assert b'PRIVATE-FINANCIAL-DATA' not in raw and b'private-salary.csv' not in raw and b'a@example.test' not in raw
    reopened = Accounts(vault.path.parent)
    assert reopened.history(a['user']['id'])[0]['analysis'] == analysis
    reopened.delete_statement(a['user']['id'], saved['id'])
    assert reopened.history(a['user']['id']) == []
    with reopened.db() as db:
        assert db.execute("SELECT action FROM consent ORDER BY created").fetchall()[-1][0] == 'statement_deleted'


def test_account_erasure_revokes_all_sessions_and_documents(vault):
    a = vault.register('Alice', 'a@example.test', PASSWORD, 'one')
    vault.save(a['user']['id'], 's.csv', b'private', {'statement_period':{'end':'2026-01-01'}})
    with pytest.raises(AccountError):
        vault.delete_account(a['user']['id'], 'incorrect-password')
    vault.delete_account(a['user']['id'], PASSWORD)
    with pytest.raises(AccountError):
        vault.authenticate(a['token'])
    with vault.db() as db:
        assert db.execute('SELECT COUNT(*) FROM users').fetchone()[0] == 0
        assert db.execute('SELECT COUNT(*) FROM statements').fetchone()[0] == 0
        assert db.execute('SELECT COUNT(*) FROM consent').fetchone()[0] == 0


def test_key_loss_fails_closed(vault):
    (vault.path.parent / 'encryption.key').unlink()
    with pytest.raises(RuntimeError, match='key is missing'):
        Accounts(vault.path.parent)


def test_personal_endpoints_cannot_use_developer_key(monkeypatch, tmp_path):
    monkeypatch.setenv('UQUAL_ACCOUNT_DIR', str(tmp_path/'accounts'))
    monkeypatch.setenv('UQUAL_SYNTHETIC_MODEL_PATH', str(tmp_path/'missing'))
    monkeypatch.setattr('uqual.api.load_bundle', lambda _: {'model_name':'test'})
    with TestClient(create_app(Path('unused'), 'a'*32)) as client:
        assert client.get('/v1/statements', headers={'Authorization':'Bearer '+'a'*32}).status_code == 401
        response = client.post('/v1/auth/register', json={'name':'User','email':'test@example.test','password':PASSWORD,'accept_storage_policy':True})
        assert response.status_code == 201, response.text
        token = response.json()['token']
        headers = {'Authorization':'Bearer '+token}
        assert client.get('/v1/me', headers=headers).json()['email_verified'] is False
        assert client.get('/v1/statements', headers=headers).json() == {'statements':[]}
        assert client.get('/v1/me', headers=headers).headers['cache-control'] == 'no-store'
        assert client.post('/v1/auth/logout',headers=headers).status_code == 200
        assert client.get('/v1/me',headers=headers).status_code == 401


def test_personal_request_limits_apply_before_parsing(monkeypatch, tmp_path):
    monkeypatch.delenv('UQUAL_ACCOUNT_DIR', raising=False)
    monkeypatch.setenv('UQUAL_SYNTHETIC_MODEL_PATH', str(tmp_path/'missing'))
    monkeypatch.setattr('uqual.api.load_bundle', lambda _: {'model_name':'test'})
    with TestClient(create_app(Path('unused'), 'a'*32)) as client:
        result = client.post('/v1/auth/login', content=b'{}', headers={'Content-Length':'65537','Content-Type':'application/json'})
        assert result.status_code == 413
        result = client.post('/v1/auth/login', content=iter([b' '*40000,b' '*40000]), headers={'Content-Type':'application/json'})
        assert result.status_code == 413
        result = client.post('/v1/statements', content=b'', headers={'Content-Length':str(11*1024*1024)})
        assert result.status_code == 413
