import os
import time
import httpx

BASE_URL = os.getenv("SCH_BASE_URL", "http://127.0.0.1:8000")
ADMIN_USER = os.getenv("SCH_ADMIN_USER", "admin4Sys")
ADMIN_PASS = os.getenv("SCH_ADMIN_PASS", "JYFFF#!zzKKK4366357zz")


def run() -> int:
    ok = True
    def log(step, resp):
        nonlocal ok
        status = "OK" if resp.status_code < 400 else f"FAIL({resp.status_code})"
        print(f"[{step}] {status}")
        if resp.status_code >= 400:
            ok = False
            try:
                print(resp.json())
            except Exception:
                print(resp.text)

    username = f"testuser_{int(time.time())}"
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        # login as admin
        r = c.post("/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
        log("auth.login", r)
        if r.status_code >= 400:
            return 1
        access = r.json().get("access_token")
        c.headers["Authorization"] = f"Bearer {access}"

        # create user
        payload = {
            "username": username,
            "password": "User@12345",
            "user_type": 3,
            "phone": "13800138001",
            "is_active": True
        }
        r = c.post("/api/auth/admin/create-user", json=payload)
        log("auth.admin.create-user", r)
        if r.status_code >= 400:
            return 1
        data = r.json()
        assert data["username"] == username
        assert data["user_type"] == 3

        # creating family via admin should 400
        payload_bad = dict(payload)
        payload_bad["username"] = f"family_via_admin_{int(time.time())}"
        payload_bad["user_type"] = 2
        r = c.post("/api/auth/admin/create-user", json=payload_bad)
        log("auth.admin.create-user.family", r)
        if r.status_code != 400:
            ok = False

        # duplicate should 409
        r = c.post("/api/auth/admin/create-user", json=payload)
        log("auth.admin.create-user.dup", r)
        if r.status_code != 409:
            ok = False

    print("TEST RESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(run())
