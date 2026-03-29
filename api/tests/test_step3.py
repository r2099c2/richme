import importlib

import pytest
from fastapi.testclient import TestClient


def _fresh_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Reload app so CORS / Settings pick up monkeypatched env."""
    import richme_api.config as cfg
    import richme_api.main as main_mod

    cfg.get_settings.cache_clear()
    importlib.reload(main_mod)
    return TestClient(main_mod.app)


def test_health() -> None:
    client = TestClient(importlib.import_module("richme_api.main").app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_admin_login_disabled_without_password(monkeypatch: pytest.MonkeyPatch) -> None:
    # 覆盖磁盘 .env：空串经 Settings 归一为 None，等价于未配置管理员密码
    monkeypatch.setenv("ADMIN_PASSWORD", "")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", "")
    client = _fresh_client(monkeypatch)
    r = client.post("/api/v1/admin/auth/login", json={"password": "x"})
    assert r.status_code == 503


def test_admin_login_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_PASSWORD", "secret-test")
    client = _fresh_client(monkeypatch)
    r = client.post("/api/v1/admin/auth/login", json={"password": "secret-test"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_admin_stocks_bulk_requires_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_PASSWORD", "secret-test")
    client = _fresh_client(monkeypatch)
    r = client.post("/api/v1/admin/stocks/bulk", json={"stocks": []})
    assert r.status_code == 401


def test_public_themes_by_date_no_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_PASSWORD", "x")
    client = _fresh_client(monkeypatch)
    r = client.get("/api/v1/public/themes/by-date/2026-01-15")
    assert r.status_code in (200, 500)
