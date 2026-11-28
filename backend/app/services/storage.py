"""S3-compatible object store (MinIO locally; R2/S3 in production)."""
from functools import lru_cache

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from ..config import get_settings


@lru_cache
def client():
    s = get_settings()
    return boto3.client("s3", endpoint_url=s.s3_endpoint, aws_access_key_id=s.s3_access_key,
                        aws_secret_access_key=s.s3_secret_key, region_name=s.s3_region,
                        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}, retries={"max_attempts": 3}))


def ensure_bucket() -> None:
    s = get_settings()
    try:
        client().head_bucket(Bucket=s.s3_bucket)
    except ClientError:
        client().create_bucket(Bucket=s.s3_bucket)


def put(key: str, data: bytes, content_type: str = "image/jpeg") -> None:
    client().put_object(Bucket=get_settings().s3_bucket, Key=key, Body=data, ContentType=content_type)


def get(key: str) -> bytes | None:
    try:
        return client().get_object(Bucket=get_settings().s3_bucket, Key=key)["Body"].read()
    except ClientError:
        return None


def delete(key: str) -> None:
    try:
        client().delete_object(Bucket=get_settings().s3_bucket, Key=key)
    except ClientError:
        pass


def healthy() -> bool:
    try:
        client().head_bucket(Bucket=get_settings().s3_bucket)
        return True
    except Exception:
        return False
