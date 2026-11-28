"""Local personal accounts and encrypted, owner-scoped statement storage.

Email ownership is NOT verified. Deployment requires HTTPS and managed secrets.
"""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
import threading
import time
import uuid

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .model import clean_json

CONSENT_VERSION = "statement-analysis-and-storage-v1"
SESSION_SECONDS = 7 * 24 * 3600
PASSWORD_WORK = threading.BoundedSemaphore(2)


class AccountError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message
        super().__init__(message)


class Accounts:
    def __init__(self, directory: Path):
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor = os.open(directory / '.initialize.lock', os.O_WRONLY | os.O_CREAT, 0o600)
        with os.fdopen(descriptor, 'w') as lockfile:
            try:
                import fcntl
            except ImportError:
                self._initialize(directory)
            else:
                fcntl.flock(lockfile, fcntl.LOCK_EX)
                try:
                    self._initialize(directory)
                finally:
                    fcntl.flock(lockfile, fcntl.LOCK_UN)

    def _initialize(self, directory: Path):
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.path = directory / "personal.sqlite3"
        keyfile = directory / "encryption.key"
        if not keyfile.exists():
            if self.path.exists():
                raise RuntimeError("Account encryption key is missing; restore it, do not replace it")
            fd = os.open(keyfile, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as f:
                f.write(AESGCM.generate_key(bit_length=256))
        self.key = keyfile.read_bytes()
        self.cipher = AESGCM(self.key)
        with self.db() as db:
            db.executescript("""
              CREATE TABLE IF NOT EXISTS auth_limits(peer_digest TEXT PRIMARY KEY, started INTEGER NOT NULL, attempts INTEGER NOT NULL);
              CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email_digest TEXT UNIQUE NOT NULL,
                profile BLOB NOT NULL, salt BLOB NOT NULL, password BLOB NOT NULL);
              CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires INTEGER NOT NULL);
              CREATE TABLE IF NOT EXISTS statements(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created INTEGER NOT NULL, content_hash TEXT NOT NULL, period_end TEXT NOT NULL, size INTEGER NOT NULL,
                metadata BLOB NOT NULL, document BLOB NOT NULL, UNIQUE(owner, content_hash, period_end));
              CREATE TABLE IF NOT EXISTS consent(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                statement_id TEXT NOT NULL, action TEXT NOT NULL, version TEXT NOT NULL, created INTEGER NOT NULL);
              CREATE TABLE IF NOT EXISTS passport_shares(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                statement_id TEXT NOT NULL REFERENCES statements(id) ON DELETE CASCADE, token_digest TEXT UNIQUE NOT NULL,
                recipient TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0,
                pdf BLOB NOT NULL, token_cipher BLOB);
            """)
            fingerprint = hashlib.sha256(self.key).hexdigest()
            prior = db.execute("SELECT value FROM settings WHERE key='key_fingerprint'").fetchone()
            if prior and prior[0] != fingerprint:
                raise RuntimeError("Account encryption key does not match this database")
            db.execute("INSERT OR IGNORE INTO settings VALUES('key_fingerprint', ?)", (fingerprint,))
            columns = {row[1] for row in db.execute('PRAGMA table_info(statements)')}
            if 'normalized' not in columns:
                db.execute('ALTER TABLE statements ADD COLUMN normalized BLOB')
            share_columns = {row[1] for row in db.execute('PRAGMA table_info(passport_shares)')}
            if 'token_cipher' not in share_columns:
                db.execute('ALTER TABLE passport_shares ADD COLUMN token_cipher BLOB')
        os.chmod(self.path, 0o600)

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA secure_delete=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def seal(self, value: bytes, aad: str) -> bytes:
        nonce = os.urandom(12)
        return nonce + self.cipher.encrypt(nonce, value, aad.encode())

    def unseal(self, value: bytes, aad: str) -> bytes:
        return self.cipher.decrypt(value[:12], value[12:], aad.encode())

    def email_digest(self, email):
        return hmac.new(self.key, email.strip().casefold().encode(), hashlib.sha256).hexdigest()

    def password_hash(self, password, salt):
        if not PASSWORD_WORK.acquire(blocking=False):
            raise AccountError(429, "Sign-in is busy. Try again shortly.")
        try:
            return hashlib.scrypt(password.encode(), salt=salt, n=131072, r=8, p=1, maxmem=256*1024*1024)
        finally:
            PASSWORD_WORK.release()

    def throttle(self, peer):
        now = int(time.time())
        digest = self.email_digest('auth-peer:'+str(peer))
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM auth_limits WHERE started<=?',(now-600,))
            row = db.execute('SELECT attempts FROM auth_limits WHERE peer_digest=?',(digest,)).fetchone()
            if row and row[0]>=20:
                raise AccountError(429, "Too many account attempts. Please wait ten minutes.")
            db.execute('INSERT INTO auth_limits VALUES(?,?,1) ON CONFLICT(peer_digest) DO UPDATE SET attempts=attempts+1', (digest,now))

    def public_user(self, row):
        return {"id": row["id"], **json.loads(self.unseal(row["profile"], row["id"] + ':profile')),
                "email_verified": False}

    def issue(self, db, user):
        token = secrets.token_urlsafe(48)
        expires = int(time.time()) + SESSION_SECONDS
        db.execute("DELETE FROM sessions WHERE expires < ?", (int(time.time()),))
        db.execute("DELETE FROM sessions WHERE owner=? AND digest IN (SELECT digest FROM sessions WHERE owner=? ORDER BY expires DESC LIMIT -1 OFFSET 9)", (user["id"], user["id"]))
        db.execute("INSERT INTO sessions VALUES(?,?,?)", (hashlib.sha256(token.encode()).hexdigest(), user["id"], expires))
        return {"token": token, "expires_at": expires, "user": self.public_user(user)}

    def register(self, name, email, password, peer):
        self.throttle(peer)
        owner, salt = uuid.uuid4().hex, os.urandom(16)
        digest = self.password_hash(password, salt)
        profile = self.seal(json.dumps({"name": name.strip(), "email": email.strip().casefold()}).encode(), owner + ':profile')
        with self.db() as db:
            try:
                db.execute("INSERT INTO users VALUES(?,?,?,?,?)", (owner, self.email_digest(email), profile, salt, digest))
            except sqlite3.IntegrityError as exc:
                raise AccountError(409, "Account could not be created. Try signing in.") from exc
            user = db.execute("SELECT * FROM users WHERE id=?", (owner,)).fetchone()
            return self.issue(db, user)

    def login(self, email, password, peer):
        self.throttle(peer)
        with self.db() as db:
            user = db.execute("SELECT * FROM users WHERE email_digest=?", (self.email_digest(email),)).fetchone()
            salt = user["salt"] if user else bytes(16)
            actual = self.password_hash(password, salt)
            if user is None or not hmac.compare_digest(actual, user["password"]):
                raise AccountError(401, "Email or password was not recognized")
            return self.issue(db, user)

    def authenticate(self, token):
        digest = hashlib.sha256(token.encode()).hexdigest()
        with self.db() as db:
            row = db.execute("SELECT users.* FROM users JOIN sessions ON owner=users.id WHERE digest=? AND expires>?",
                             (digest, int(time.time()))).fetchone()
        if row is None:
            raise AccountError(401, "Session expired. Please sign in again.")
        return self.public_user(row)

    def logout(self, token):
        with self.db() as db:
            db.execute("DELETE FROM sessions WHERE digest=?", (hashlib.sha256(token.encode()).hexdigest(),))

    def save(self, owner, filename, source, result, normalized=None, job=None):
        identifier, now = uuid.uuid4().hex, int(time.time())
        content_hash = hashlib.sha256(source).hexdigest()
        end = result["statement_period"]["end"]
        metadata = {"id": identifier, "filename": Path(filename).name[:200], "created_at": now,
                    "consent_version": CONSENT_VERSION, "analysis": result,
                    "format": result.get("import_report", {}).get("format", "csv"),
                    "media_type": result.get("import_report", {}).get("media_type", "text/csv"),
                    "normalized_available": normalized is not None}
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            if job:
                active = db.execute("SELECT 1 FROM jobs WHERE id=? AND owner=? AND status='running' AND worker_token=?",
                                    (job['id'], owner, job['worker_token'])).fetchone()
                if not active:
                    raise AccountError(409, 'Processing job was cancelled or its lease expired')
            prior = db.execute("SELECT * FROM statements WHERE owner=? AND content_hash=? AND period_end=?", (owner, content_hash, end)).fetchone()
            if prior:
                existing = self.decode_record(prior)
                if normalized is not None and prior['normalized'] is None:
                    used = self.storage_used(db,owner,job['id'] if job else None)
                    if used + len(normalized) + 2048 > 100*1024*1024:
                        raise AccountError(413,'Private vault storage limit is reached')
                    existing['normalized_available'] = True
                    existing.setdefault('format', metadata['format'])
                    existing.setdefault('media_type', metadata['media_type'])
                    db.execute("UPDATE statements SET normalized=?, metadata=? WHERE id=? AND owner=?", (
                        self.seal(normalized,owner+':'+prior['id']+':normalized'),
                        self.seal(json.dumps(existing).encode(),owner+':'+prior['id']+':metadata'),prior['id'],owner))
                if job:
                    self.complete_job(db,job,prior['id'])
                return existing
            count, size = db.execute("SELECT COUNT(*),COALESCE(SUM(LENGTH(document)+LENGTH(metadata)+COALESCE(LENGTH(normalized),0)),0) FROM statements WHERE owner=?", (owner,)).fetchone()
            size += self.pending_bytes(db,owner,job['id'] if job else None) + self.receivable_bytes(db,owner)
            if count >= 100 or size + len(source) + len(normalized or b'') + len(json.dumps(clean_json(metadata)).encode()) + 128 > 100*1024*1024:
                raise AccountError(413, "Your private vault is full. Remove statements before adding another.")
            # Recheck account existence atomically: deletion during analysis cannot recreate data.
            if not db.execute("SELECT 1 FROM users WHERE id=?", (owner,)).fetchone():
                raise AccountError(401, "Account no longer exists")
            db.execute("INSERT INTO statements(id,owner,created,content_hash,period_end,size,metadata,document,normalized) VALUES(?,?,?,?,?,?,?,?,?)", (identifier, owner, now, content_hash, end, len(source),
                       self.seal(json.dumps(clean_json(metadata), allow_nan=False).encode(), owner+':'+identifier+':metadata'),
                       self.seal(source, owner+':'+identifier+':document'),
                       self.seal(normalized, owner+':'+identifier+':normalized') if normalized is not None else None))
            self.audit(db, owner, identifier, "analysis_and_storage", now)
            if job:
                self.complete_job(db,job,identifier)
        return metadata

    def pending_bytes(self, db, owner, excluded=None):
        if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='jobs'").fetchone():
            return 0
        return db.execute("SELECT COALESCE(SUM(source_size),0) FROM jobs WHERE owner=? AND status IN ('queued','running') AND id<>?",(owner,excluded or '')).fetchone()[0]

    def receivable_bytes(self, db, owner):
        if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='finance_documents'").fetchone():
            return 0
        return db.execute('SELECT coalesce(sum(size),0) FROM finance_documents JOIN finance_applications ON application=finance_applications.id WHERE owner=?',(owner,)).fetchone()[0]

    def storage_used(self, db, owner, excluded=None):
        stored = db.execute("SELECT COALESCE(SUM(LENGTH(document)+LENGTH(metadata)+COALESCE(LENGTH(normalized),0)),0) FROM statements WHERE owner=?",(owner,)).fetchone()[0]
        return stored + self.pending_bytes(db,owner,excluded) + self.receivable_bytes(db,owner)

    def complete_job(self, db, job, statement_id):
        db.execute("UPDATE jobs SET status='completed', source=NULL, source_size=0, statement_id=?, updated=?, lease_until=0 WHERE id=? AND worker_token=?",
                   (statement_id,int(time.time()),job['id'],job['worker_token']))

    def statement(self, owner, identifier):
        with self.db() as db:
            row = db.execute("SELECT id,owner,metadata FROM statements WHERE owner=? AND id=?", (owner,identifier)).fetchone()
        if row is None:
            raise AccountError(404, 'Statement not found')
        return self.decode_record(row)

    def normalized(self, owner, identifier):
        with self.db() as db:
            row = db.execute("SELECT normalized FROM statements WHERE owner=? AND id=?", (owner,identifier)).fetchone()
        if row is None:
            raise AccountError(404, 'Statement not found')
        if row['normalized'] is None:
            raise AccountError(409, 'This older record has no normalized export; re-upload it to add one')
        return self.unseal(row['normalized'],owner+':'+identifier+':normalized')

    def revise_analysis(self, owner, identifier, expected_revision, analysis, normalized):
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT * FROM statements WHERE owner=? AND id=?', (owner, identifier)).fetchone()
            if row is None:
                raise AccountError(404, 'Statement not found')
            record = self.decode_record(row)
            if record.get('analysis_revision', 0) != expected_revision:
                raise AccountError(409, 'Statement changed. Refresh before correcting another transaction.')
            if self.storage_used(db, owner) - len(row['metadata']) - len(row['normalized'] or b'') + len(normalized) + len(json.dumps(clean_json(analysis)).encode()) + 4096 > 100 * 1024 * 1024:
                raise AccountError(413, 'Private vault storage limit is reached')
            record['analysis'] = clean_json(analysis)
            record['analysis_revision'] = expected_revision + 1
            db.execute('UPDATE statements SET metadata=?, normalized=? WHERE owner=? AND id=?',
                       (self.seal(json.dumps(clean_json(record)).encode(), owner+':'+identifier+':metadata'),
                        self.seal(normalized, owner+':'+identifier+':normalized'), owner, identifier))
            db.execute('UPDATE passport_shares SET revoked=1 WHERE owner=? AND statement_id=?', (owner, identifier))
            self.audit(db, owner, identifier, 'user_category_correction', int(time.time()))
            return record

    def create_passport_share(self, owner, identifier, recipient, pdf):
        now = int(time.time())
        token = secrets.token_urlsafe(48)
        digest = hashlib.sha256(token.encode()).hexdigest()
        share_id = uuid.uuid4().hex
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            if not db.execute('SELECT 1 FROM statements WHERE owner=? AND id=?', (owner, identifier)).fetchone():
                raise AccountError(404, 'Statement not found')
            active = db.execute('SELECT count(*) FROM passport_shares WHERE owner=? AND revoked=0 AND expires>?', (owner, now)).fetchone()[0]
            if active >= 10:
                raise AccountError(429, 'Revoke an existing passport link before creating another')
            db.execute('INSERT INTO passport_shares VALUES(?,?,?,?,?,?,?,?,?,?)',
                       (share_id, owner, identifier, digest, recipient, now, now + 86400, 0,
                        self.seal(pdf, share_id+':pdf'), self.seal(token.encode(), share_id+':token')))
            self.audit(db, owner, identifier, 'passport_link_created', now)
        return {'id': share_id, 'recipient': recipient, 'created_at': now, 'expires_at': now + 86400,
                'revoked': False, 'path': '/v1/passport-links/' + token + '.pdf'}

    def passport_shares(self, owner, identifier):
        self.statement(owner, identifier)
        with self.db() as db:
            rows = db.execute('SELECT id,recipient,created,expires,revoked,token_cipher FROM passport_shares WHERE owner=? AND statement_id=? ORDER BY created DESC',
                              (owner, identifier)).fetchall()
        return [{'id': r['id'], 'recipient': r['recipient'], 'created_at': r['created'],
                 'expires_at': r['expires'], 'revoked': bool(r['revoked']),
                 'path': '/v1/passport-links/' + self.unseal(r['token_cipher'], r['id']+':token').decode() + '.pdf'
                 if r['token_cipher'] and not r['revoked'] and r['expires'] > int(time.time()) else None} for r in rows]

    def passport_pdf(self, token):
        digest = hashlib.sha256(token.encode()).hexdigest()
        with self.db() as db:
            row = db.execute('SELECT * FROM passport_shares WHERE token_digest=? AND revoked=0 AND expires>?',
                             (digest, int(time.time()))).fetchone()
        if row is None:
            raise AccountError(404, 'Passport link expired or revoked')
        return self.unseal(row['pdf'], row['id']+':pdf')

    def revoke_passport(self, owner, identifier, share_id):
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            result = db.execute('UPDATE passport_shares SET revoked=1 WHERE id=? AND owner=? AND statement_id=?',
                                (share_id, owner, identifier))
            if not result.rowcount:
                raise AccountError(404, 'Passport link not found')
            self.audit(db, owner, identifier, 'passport_link_revoked', int(time.time()))
        return {'revoked': True}

    def audit(self, db, owner, identifier, action, now):
        db.execute("INSERT INTO consent VALUES(?,?,?,?,?,?)", (uuid.uuid4().hex, owner, identifier, action, CONSENT_VERSION, now))

    def decode_record(self, row):
        return json.loads(self.unseal(row["metadata"], row["owner"]+':'+row["id"]+':metadata'))

    def history(self, owner):
        with self.db() as db:
            rows = db.execute("SELECT id,owner,metadata FROM statements WHERE owner=? ORDER BY period_end DESC,created DESC", (owner,)).fetchall()
        return [self.decode_record(row) for row in rows]

    def document(self, owner, identifier):
        with self.db() as db:
            row = db.execute("SELECT * FROM statements WHERE owner=? AND id=?", (owner, identifier)).fetchone()
        if row is None:
            raise AccountError(404, "Statement not found")
        return self.unseal(row["document"], owner+':'+identifier+':document')

    def delete_statement(self, owner, identifier):
        with self.db() as db:
            result = db.execute("DELETE FROM statements WHERE owner=? AND id=?", (owner, identifier))
            if not result.rowcount:
                raise AccountError(404, "Statement not found")
            if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='jobs'").fetchone():
                db.execute("UPDATE jobs SET status='cancelled',statement_id=NULL,error_code='statement_deleted',error_message='The associated statement was deleted',updated=? WHERE owner=? AND statement_id=?",(int(time.time()),owner,identifier))
            self.audit(db, owner, identifier, "statement_deleted", int(time.time()))

    def delete_account(self, owner, password):
        self.throttle("delete:" + owner)
        with self.db() as db:
            row = db.execute("SELECT * FROM users WHERE id=?", (owner,)).fetchone()
            if row is None:
                raise AccountError(401, "Account no longer exists")
            actual = self.password_hash(password, row['salt'])
            if not hmac.compare_digest(actual, row['password']):
                raise AccountError(401, "Password was not recognized")
            db.execute("DELETE FROM users WHERE id=?", (owner,))
