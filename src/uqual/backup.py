"""Authenticated encrypted SQLite snapshots. Backup key must be kept separately from backups."""

import io
import os
from pathlib import Path
import shutil
import sqlite3
import tarfile
import tempfile

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from .accounts import Accounts

MAGIC = b"UQUALBACKUP1"


def read_key(path):
    path = Path(path)
    if path.stat().st_mode & 0o077:
        raise ValueError("Backup key file must be private (chmod 600)")
    key = path.read_bytes()
    if len(key) != 32:
        raise ValueError("Backup key must contain exactly 32 random bytes")
    return key


def create(vault, output, key):
    vault, output = Path(vault), Path(output)
    if (
        len(key) != 32
        or not (vault / "personal.sqlite3").is_file()
        or not (vault / "encryption.key").is_file()
    ):
        raise ValueError("An existing vault, original encryption key and 32-byte backup key are required")
    output.parent.mkdir(parents=True, exist_ok=True)
    # SQLite online backup provides a coherent snapshot while the API is active.
    with tempfile.TemporaryDirectory(prefix="uqual-snapshot-") as directory:
        snapshot = Path(directory) / "personal.sqlite3"
        with sqlite3.connect(vault / "personal.sqlite3") as source, sqlite3.connect(snapshot) as destination:
            source.backup(destination)
            if destination.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                raise ValueError("Snapshot integrity check failed")
        fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(fd, "wb") as target:
                nonce = os.urandom(12)
                cipher = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
                cipher.authenticate_additional_data(MAGIC)
                target.write(MAGIC + nonce)

                class EncryptedWriter:
                    def write(self, data):
                        target.write(cipher.update(data))
                        return len(data)

                with tarfile.open(fileobj=EncryptedWriter(), mode="w|") as archive:
                    archive.add(snapshot, arcname="personal.sqlite3", recursive=False)
                    value = (vault / "encryption.key").read_bytes()
                    info = tarfile.TarInfo("encryption.key")
                    info.size = len(value)
                    info.mode = 0o600
                    archive.addfile(info, io.BytesIO(value))
                target.write(cipher.finalize() + cipher.tag)
                target.flush()
                os.fsync(target.fileno())
        except BaseException:
            output.unlink(missing_ok=True)
            raise
    return output


def restore(backup, destination, key):
    backup, destination = Path(backup), Path(destination)
    if destination.exists() or len(key) != 32:
        raise ValueError("Restore requires a new destination and a 32-byte backup key")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".uqual-restore-", dir=destination.parent) as directory:
        temporary = Path(directory)
        plain = temporary / "snapshot.tar"
        # Verify GCM authentication before parsing even a byte of the archive.
        with backup.open("rb") as source, plain.open("wb") as target:
            if source.read(len(MAGIC)) != MAGIC:
                raise ValueError("Not a UQUAL backup")
            nonce = source.read(12)
            size = backup.stat().st_size - len(MAGIC) - 12 - 16
            if size < 0:
                raise ValueError("Truncated backup")
            source.seek(-16, 2)
            tag = source.read(16)
            source.seek(len(MAGIC) + 12)
            cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
            cipher.authenticate_additional_data(MAGIC)
            while size:
                chunk = source.read(min(1024 * 1024, size))
                if not chunk:
                    raise ValueError("Truncated backup")
                target.write(cipher.update(chunk))
                size -= len(chunk)
            target.write(cipher.finalize())
        restored = temporary / "vault"
        restored.mkdir(mode=0o700)
        with tarfile.open(plain) as archive:
            members = archive.getmembers()
            if (
                len(members) != 2
                or {m.name for m in members} != {"personal.sqlite3", "encryption.key"}
                or not all(m.isfile() for m in members)
            ):
                raise ValueError("Backup has unexpected entries")
            for member in members:
                with archive.extractfile(member) as source, (restored / member.name).open("xb") as target:
                    shutil.copyfileobj(source, target, 1024 * 1024)
                os.chmod(restored / member.name, 0o600)
        # Check original cipher fingerprint and migration compatibility before publishing restore.
        accounts = Accounts(restored)
        with accounts.db() as db:
            if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                raise ValueError("Restored database integrity check failed")
        if destination.exists():
            raise ValueError("Destination appeared during restore")
        restored.rename(destination)
    return destination
