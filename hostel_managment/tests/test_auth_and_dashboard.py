import os
import sys
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from app.main import app
from app.database import Base, engine

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


client = TestClient(app)


def test_dev_login_and_dashboard_route():
    login = client.post(
        "/auth/dev-login",
        json={"email": "tenant.demo@hostelms.local", "role": "TENANT", "name": "Demo Tenant"},
    )
    assert login.status_code == 200
    token = login.json()["token"]

    dashboard = client.get("/dashboard/me", headers={"Authorization": f"Bearer {token}"})
    assert dashboard.status_code == 200
    assert dashboard.json()["user"]["role"] == "TENANT"


def test_register_user():
    resp = client.post(
        "/auth/register",
        json={"name": "Test User", "email": "test.user+register@hostelms.local", "phone": "9999999999", "role": "TENANT"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "TENANT"
