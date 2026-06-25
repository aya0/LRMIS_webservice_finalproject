"""Simple sequential-style ID generators that match the spec format."""
from datetime import datetime
from database import land_applications, certificates


def generate_application_id() -> str:
    year = datetime.now().year
    count = land_applications.count_documents({}) + 1
    return f"LRMIS-{year}-{count:04d}"


def generate_certificate_id() -> str:
    year = datetime.now().year
    count = certificates.count_documents({}) + 1
    return f"CERT-{year}-{count:04d}"
