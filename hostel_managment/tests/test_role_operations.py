import os
import sys
from datetime import date, timedelta

from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.main import app
from app.database import Base, engine
from app.seed import seed_demo_data


Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
seed_demo_data()

client = TestClient(app)


def _dev_login(email: str, role: str, name: str) -> str:
    resp = client.post(
        "/auth/dev-login",
        json={"email": email, "role": role, "name": name},
    )
    assert resp.status_code == 200
    return resp.json()["token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_owner_cannot_decide_other_owner_booking():
    owner1_token = _dev_login("owner.demo@hostelms.local", "OWNER", "Demo Owner")
    # booking #2 belongs to owner2 seed hostel.
    resp = client.post(
        "/bookings/owner/decision",
        json={"booking_id": 2, "approve": True, "reason": "try approve"},
        headers=_auth_headers(owner1_token),
    )
    assert resp.status_code == 403


def test_overlapping_booking_is_blocked():
    tenant1_token = _dev_login("tenant.demo@hostelms.local", "TENANT", "Demo Tenant")
    tenant2_token = _dev_login("tenant2.demo@hostelms.local", "TENANT", "Demo Tenant 2")

    # Seed has bed id=2 as AVAILABLE and not booked.
    start = date.today() + timedelta(days=1)
    end = date.today() + timedelta(days=10)

    first = client.post(
        "/bookings/",
        json={"bed_id": 2, "start_date": start.isoformat(), "end_date": end.isoformat()},
        headers=_auth_headers(tenant1_token),
    )
    assert first.status_code == 200
    assert first.json()["status"] == "PENDING"

    overlap = client.post(
        "/bookings/",
        json={
            "bed_id": 2,
            "start_date": (start + timedelta(days=2)).isoformat(),
            "end_date": (end + timedelta(days=2)).isoformat(),
        },
        headers=_auth_headers(tenant2_token),
    )
    assert overlap.status_code == 400
    assert "active booking" in overlap.json()["error"]["message"]


def test_owner_report_and_payment_overview_are_scoped():
    owner1_token = _dev_login("owner.demo@hostelms.local", "OWNER", "Demo Owner")
    owner2_token = _dev_login("owner2.demo@hostelms.local", "OWNER", "Demo Owner 2")

    owner1_payments = client.get("/payments/owner/overview", headers=_auth_headers(owner1_token))
    owner2_payments = client.get("/payments/owner/overview", headers=_auth_headers(owner2_token))
    assert owner1_payments.status_code == 200
    assert owner2_payments.status_code == 200

    owner1_booking_ids = {p["booking_id"] for p in owner1_payments.json()}
    owner2_booking_ids = {p["booking_id"] for p in owner2_payments.json()}
    assert owner1_booking_ids == {1}
    assert owner2_booking_ids == {2}

    owner1_report = client.get("/reports/owner/monthly", headers=_auth_headers(owner1_token))
    owner2_report = client.get("/reports/owner/monthly", headers=_auth_headers(owner2_token))
    assert owner1_report.status_code == 200
    assert owner2_report.status_code == 200
    assert owner1_report.json()["owner_id"] != owner2_report.json()["owner_id"]


def test_due_alert_trigger_is_admin_only():
    owner_token = _dev_login("owner.demo@hostelms.local", "OWNER", "Demo Owner")
    admin_token = _dev_login("admin.demo@hostelms.local", "ADMIN", "Demo Admin")

    owner_resp = client.post("/payments/alerts/run", headers=_auth_headers(owner_token))
    admin_resp = client.post("/payments/alerts/run", headers=_auth_headers(admin_token))

    assert owner_resp.status_code == 403
    assert admin_resp.status_code == 200
