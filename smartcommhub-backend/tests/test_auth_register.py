import os
import time
import httpx

BASE_URL = os.getenv("SCH_BASE_URL", "http://127.0.0.1:8000")


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

    # register family
    uname = f"fam_{int(time.time())}"
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        payload = {"username": uname, "password": "User@12345", "user_type": 2, "phone": "13900138000"}
        r = c.post("/api/auth/register", json=payload)
        log("register.family", r)
        if r.status_code >= 400:
            return 1
        data = r.json()
        assert data["username"] == uname
        assert data["user_type"] == 2

        # duplicate username
        r = c.post("/api/auth/register", json=payload)
        log("register.family.dup", r)
        if r.status_code != 409:
            ok = False

        # invalid type: provider
        payload_bad = {"username": f"prov_{int(time.time())}", "password": "User@12345", "user_type": 3}
        r = c.post("/api/auth/register", json=payload_bad)
        log("register.invalid.provider", r)
        if r.status_code != 400:
            ok = False

        # invalid type: admin
        payload_bad2 = {"username": f"adm_{int(time.time())}", "password": "User@12345", "user_type": 0}
        r = c.post("/api/auth/register", json=payload_bad2)
        log("register.invalid.admin", r)
        if r.status_code != 400:
            ok = False

    print("TEST RESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(run())
