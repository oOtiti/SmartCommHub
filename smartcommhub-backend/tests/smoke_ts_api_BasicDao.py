import os, sys
import httpx

BASE_URL = os.getenv("SCH_BASE_URL", "http://127.0.0.1:8000")
USER = "admin4Sys"
PASS = "JYFFF#!zzKKK4366357zz"

def main() -> int:
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

    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        # 1) 健康检查
        r = c.get("/api/healthz")
        log("healthz", r)

        token = None
        # 2) 登录（可选：未配置账户则跳过鉴权接口）
        if USER and PASS:
            r = c.post("/api/auth/login", json={"username": USER, "password": PASS})
            log("auth.login", r)
            if r.status_code < 400:
                token = r.json().get("access_token")
                c.headers["Authorization"] = f"Bearer {token}"
                r = c.get("/api/auth/profile")
                log("auth.profile", r)
        else:
            print("[auth] 跳过：未设置 SCH_USER/SCH_PASS 环境变量")

        # 3) 只读列表（尽量无破坏）
        r = c.get("/api/elders", params={"page": 1, "size": 5})
        log("elders.list", r)

        r = c.get("/api/providers", params={"offset": 0, "limit": 5})
        log("providers.list", r)

        r = c.get("/api/services", params={"offset": 0, "limit": 5})
        log("services.list", r)

        r = c.get("/api/orders", params={"offset": 0, "limit": 5})
        log("orders.list", r)

    print("SMOKE RESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())

'''
通过样例
(pyt4cls) droot@mwhx:~/dbSmartSys4Old/SmartCommHub/smartcommhub-backend$ python /home/droot/dbSmartSys4Old/SmartCommHub/smartcommhub-backend/tests/smoke_ts_api_BasicDao.py
[healthz] OK
[auth.login] OK
[auth.profile] OK
[elders.list] OK
[providers.list] OK
[services.list] OK
[orders.list] OK
SMOKE RESULT: PASS
'''
