# v1 接口详细说明（前端速查）

面向前端快速对接，明确输入输出格式、分页与鉴权规范，并串联主要业务流程。基于后端代码中的 v1 路由聚合：`/api/auth`、`/api/elders`、`/api/providers`、`/api/services`、`/api/orders`、`/api/health-records`、`/api/access-records`、`/api/notices`。

## 基本约定
- Base URL: `http://127.0.0.1:8000/api`
- 认证方式: 所有受保护接口均需 `Authorization: Bearer <access_token>`（登录获得）。
- Content-Type: `application/json; charset=utf-8`
- 时间字段: 使用 ISO8601 字符串（如 `2025-12-27T12:00:00+08:00`），目前部分接口以字符串接收/返回。
- 令牌有效期（来源于 .env）：`ACCESS_TOKEN_EXPIRE_MINUTES=30`、`REFRESH_TOKEN_EXPIRE_MINUTES=10080 (7天)`。

## 鉴权与令牌
- `access_token`：短期凭证，仅用于访问业务接口。
- `refresh_token`：长期凭证，仅用于刷新 `access_token`。
- 刷新实现（当前代码采用“请求体传 refresh_token”）：
  - `POST /api/auth/refresh`，Body: `{"refresh_token":"<refresh_token>"}`，返回新的 token 对。
- 返回码语义：
  - `401 Unauthorized`：令牌缺失/过期/类型错误（例如用 access_token 去刷新）。
  - `403 Forbidden`：通常是未携带 Authorization 或权限不足。

## 错误响应格式
- 统一错误：`{"detail":"错误描述"}` 或带业务码：`{"code":"ERR_xxx","message":"错误描述"}`（按具体端点实现）。
- 成功：`200/201` 返回业务数据；删除等返回 `204 No Content`。

## 分页规范（注意两种风格）
- 老人列表：`page`（起始 1）+ `size`（默认 20，最大 100）。返回含 `total/page/size/items/has_next/has_prev/pages`。
- 其他列表：`offset`（默认 0）+ `limit`（默认 50，最大 200）。返回含 `total/offset/limit/items`。

---

## 认证（Auth）

### 登录
- `POST /api/auth/login`
- Body
```json
{
  "username": "admin001",
  "password": "Admin@12345"
}
```
- Response（TokenPair）
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### 刷新令牌
- `POST /api/auth/refresh`
- Body
```json
{ "refresh_token": "<refresh_token>" }
```
- Response（TokenPair，同登录响应字段）

### 个人资料
- `GET /api/auth/profile`
- Header: `Authorization: Bearer <access_token>`
- Response（示例）
```json
{
  "id": 123,
  "username": "admin001",
  "user_type": "admin",
  "is_active": true
}
```

### 修改密码（登录用户）
- `POST /api/auth/change-password`
- Header: `Authorization`
- Body
```json
{ "old_password": "Admin@12345", "new_password": "Admin@67890" }
```
- Response
```json
{ "message": "密码已更新" }
```

### 管理员重置密码
- `POST /api/auth/admin/reset-password`
- Header: `Authorization`（需要管理员鉴权）
- Body
```json
{ "username": "operator001", "new_password": "Operator@67890" }
```
- Response
```json
{ "message": "密码已重置", "username": "operator001" }
```

### 管理员创建用户
- `POST /api/auth/admin/create-user`
- Header: `Authorization`（需要管理员鉴权）
- Body
```json
{
  "username": "family002",
  "password": "Family@12345",
  "user_type": 3,
  "phone": "13800138002",
  "is_active": true,
  "elderly_id": null,
  "family_id": null,
  "provider_id": null
}
```
- Response
```json
{
  "id": 12345,
  "username": "family002",
  "user_type": 3,
  "is_active": true,
  "phone": "13800138002"
}
```
- Errors
  - `409 Conflict` 用户名已存在 / 手机号已存在
  - `403 Forbidden` 非管理员权限
  - `400 Bad Request` 仅支持服务商(user_type=3)；不允许创建管理员或家庭/老人

### 公开注册（家庭/老人）
- `POST /api/auth/register`
- Body
```json
{
  "username": "family003",
  "password": "Family@12345",
  "user_type": 2,
  "phone": "13800138003"  // 必填，需唯一
}
```
- Response
```json
{
  "id": 12346,
  "username": "family003",
  "user_type": 2,
  "is_active": true,
  "phone": "13800138003"
}
```
- Errors
  - `409 Conflict` 用户名已存在 / 手机号已存在
  - `400 Bad Request` 仅支持注册老人(1)或家属(2)；不允许注册管理员或服务商

### 忘记密码（演示版）
- `POST /api/auth/forgot/request`（请求验证码）
  - Body: `{ "phone": "13800138003" }`
  - Response: `{ "message": "验证码已发送（演示环境，任意输入均视为通过）" }`
  - 说明：不暴露手机号是否存在，统一返回成功。
- `POST /api/auth/forgot/reset`（重置密码）
  - Body: `{ "phone": "13800138003", "code": "任意", "new_password": "New@12345" }`
  - Response: `{ "message": "密码已重置", "username": "family003" }`
  - 说明：演示环境验证码任意值通过；需账户已绑定手机号。

### 用户类型映射与权限
- 值到身份：
  - 0 / 4：管理员（系统/运营），接口鉴权视为管理员
  - 1：老人账号
  - 2：家庭（家属）账号
  - 3：服务商账号
- 创建规则：
  - 管理员账户：不可通过 API 创建
  - 家庭/老人：使用公开注册 `/api/auth/register`（需绑定 `phone`）
  - 服务商：仅管理员可创建 `/api/auth/admin/create-user`（`user_type=3`）

### 个人资料
- `GET /api/auth/profile`：返回 `{ id, username, user_type, is_active, phone }`
- `PATCH /api/auth/profile`：更新资料（当前支持 `phone`）
  - Body: `{ "phone": "13800138003" }`
  - 约束：手机号唯一；若重复返回 `409 Conflict`

---

## 老人档案（Elders）

### 创建老人档案
- `POST /api/elders/`
- Header: `Authorization`
- Body
```json
{
  "name": "张三",
  "id_card": "4401************",
  "age": 80,
  "health_level": "A",
  "emergency_contact": "13800000000",
  "address": "广州市天河区..."
}
```
- Response：创建后的对象（字段详见 Swagger `Elderly` 模型）。

### 列表查询（分页）
- `GET /api/elders/?keyword=张&page=1&size=20`
- Header: `Authorization`
- Response（示例）
```json
{
  "total": 125,
  "page": 1,
  "size": 20,
  "items": [
    { "id": 1, "name": "张三", "age": 80, "updated_at": "2025-12-27T12:00:00+08:00" }
  ],
  "has_next": true,
  "has_prev": false,
  "pages": 7
}
```

### 详情
- `GET /api/elders/{elderly_id}`
- Header: `Authorization`

### 更新
- `PUT /api/elders/{elderly_id}`
- Header: `Authorization`
- Body（部分字段可选）
```json
{ "address": "更新后的地址...", "health_level": "B" }
```

### 删除
- `DELETE /api/elders/{elderly_id}` → `204 No Content`

---

## 服务提供方（Providers）

### 创建服务商
- `POST /api/providers/`
- Header: `Authorization`
- Body（简化示例）
```json
{
  "name": "养护公司 A",
  "service_type": "护理",
  "service_nature": "机构",
  "qualification_id": "CERT-001",
  "contact": "020-xxxxxx",
  "audit_status": "approved",
  "belong_community": "天河社区"
}
```

### 列表（按审核状态）
- `GET /api/providers/?audit_status=approved&offset=0&limit=50`
- Response（示例）
```json
{ "total": 12, "offset": 0, "limit": 50, "items": [ { "id": 10, "name": "养护公司 A" } ] }
```

### 详情 / 更新
- `GET /api/providers/{provider_id}`
- `PUT /api/providers/{provider_id}`（Body 为可选字段集合）

---

## 服务项目（Service Items）

### 创建服务项目
- `POST /api/services/`
- Header: `Authorization`
- Body
```json
{
  "provider_id": 10,
  "name": "居家护理",
  "content": "每次 60 分钟，基础护理与陪护",
  "duration": "60m",
  "price": 199.0,
  "service_scope": "上门",
  "status": "enabled"
}
```

### 按服务商查询项目
- `GET /api/services/?provider_id=10&status=enabled&offset=0&limit=50`
- Response（示例）
```json
{ "total": 3, "offset": 0, "limit": 50, "items": [ { "id": 100, "name": "居家护理" } ] }
```

---

## 订单（Service Orders）

### 创建订单
- `POST /api/orders/`
- Header: `Authorization`
- Body
```json
{
  "elderly_id": 1,
  "service_id": 100,
  "reserve_time": "2025-12-31T09:00:00+08:00",
  "service_time": "2025-12-31T10:00:00+08:00",
  "order_status": "created",
  "pay_status": "unpaid"
}
```

### 列表查询（过滤）
- `GET /api/orders/?elderly_id=1&status=created&offset=0&limit=50`
- Response（示例）
```json
{ "total": 5, "offset": 0, "limit": 50, "items": [ { "id": 500, "order_status": "created" } ] }
```

### 状态流转
- 确认：`PATCH /api/orders/{order_id}/confirm` → `{ "ok": true }`
- 完成：`PATCH /api/orders/{order_id}/complete` → `{ "ok": true }`
- 评价：`PATCH /api/orders/{order_id}/rate`，Body `{ "score": 5, "content": "很好" }` → `{ "ok": true }`

---

## 健康记录（Health Records）

### 写入记录
- `POST /api/health-records/`
- Header: `Authorization`
- Body
```json
{
  "elderly_id": 1,
  "monitor_type": "heart_rate",
  "monitor_value": 78.5,
  "monitor_time": "2025-12-27T09:00:00+08:00",
  "is_abnormal": 0,
  "device_id": "mock_device_001"
}
```

### 查询（过滤 + 分页）
- `GET /api/health-records/?elderly_id=1&monitor_type=heart_rate&start_time=2025-12-27T00:00:00+08:00&end_time=2025-12-28T00:00:00+08:00&offset=0&limit=50`
- Response（示例）
```json
{ "total": 20, "offset": 0, "limit": 50, "items": [ { "monitor_value": 78.5 } ] }
```

---

## 门禁记录（Access Records）

### 写入记录
- `POST /api/access-records/`
- Body（示例）
```json
{
  "elderly_id": 1,
  "access_type": "in",
  "record_time": "2025-12-27T08:00:00+08:00",
  "gate_location": "南门",
  "is_abnormal": "no"
}
```

### 查询（过滤 + 分页）
- `GET /api/access-records/?elderly_id=1&start_time=2025-12-27T00:00:00+08:00&end_time=2025-12-28T00:00:00+08:00&abnormal=no&offset=0&limit=50`
- Response（示例）
```json
{ "total": 6, "offset": 0, "limit": 50, "items": [ { "access_type": "in", "gate_location": "南门" } ] }
```

---

## 社区通知（Notices）

### 发布通知
- `POST /api/notices/`
- Body
```json
{
  "community_id": "TH001",
  "title": "元旦活动通知",
  "content": "活动内容...",
  "target_group": "elderly"
}
```

### 查询通知
- `GET /api/notices/?target_group=elderly&offset=0&limit=50`
- Response（示例）
```json
{ "total": 2, "offset": 0, "limit": 50, "items": [ { "title": "元旦活动通知" } ] }
```

---

## 业务流程串联（前端操作视角）

1. 登录与令牌管理：
   - 调 `POST /api/auth/login`，保存 `access_token`（内存）与 `refresh_token`（建议 HttpOnly Cookie 或安全存储）。
   - 每次请求在 Header 附 `Authorization: Bearer <access_token>`。
   - 收到 `401` 时，自动调用 `POST /api/auth/refresh` 获取新 `access_token`，更新后重试原请求。

2. 基础资料：
   - 老人档案：`POST/GET/GET(id)/PUT/DELETE /api/elders` 完成档案维护；列表用 `page/size`。
   - 服务商与服务项：先创建服务商，再创建服务项，列表均用 `offset/limit`。

3. 下单到履约：
   - 创建订单：`POST /api/orders`。
   - 订单流转：`PATCH /confirm` → `PATCH /complete` → `PATCH /rate`。
   - 列表与查询：`GET /api/orders` 支持按 `elderly_id` 与 `status` 过滤。

4. 业务数据采集与通知：
   - 健康记录：`POST/GET /api/health-records` 按老人、类型与时间窗口查询。
   - 门禁记录：`POST/GET /api/access-records` 按老人与时间窗口查询。
   - 社区通知：`POST/GET /api/notices` 发布与获取通知。

5. 用户管理：
   - `GET /api/auth/profile` 获取当前用户基本信息。
   - 修改密码与管理员重置：`/api/auth/change-password`、`/api/auth/admin/reset-password`。

---

## 联调示例（curl）

```sh
# 登录
LOGIN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin001","password":"Admin@12345"}')
ACCESS=$(echo "$LOGIN" | jq -r .access_token)
REFRESH=$(echo "$LOGIN" | jq -r .refresh_token)

# 老人列表（携带 access_token）
curl -s 'http://127.0.0.1:8000/api/elders?page=1&size=20' -H "Authorization: Bearer $ACCESS" | jq

# 刷新令牌（请求体传 refresh_token）
curl -s -X POST 'http://127.0.0.1:8000/api/auth/refresh' \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}" | jq
```

## 前端拦截器示例（axios）

```js
import axios from 'axios';

const api = axios.create({ baseURL: 'http://127.0.0.1:8000/api' });
let accessToken = null; // 登录成功后赋值
let refreshing = null;  // 刷新中的 Promise

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { config, response } = err;
    if (response?.status === 401 && !config._retry) {
      config._retry = true;
      const refreshToken = getRefreshTokenFromCookie();
      if (!refreshToken) return Promise.reject(err);

      refreshing = refreshing ?? axios
        .post('http://127.0.0.1:8000/api/auth/refresh', { refresh_token: refreshToken })
        .then((res) => res.data.access_token)
        .finally(() => { refreshing = null; });

      accessToken = await refreshing;
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    }
    return Promise.reject(err);
  }
);
```

> 生产建议：`refresh_token` 存 HttpOnly Cookie；`access_token` 放内存（或短期存储）。跨域部署时注意 CORS 与 Cookie 的 `secure/samesite`。

---

## 概念速讲
- Bearer Token：一种在 HTTP 头部携带的访问令牌，不同于 Cookie 会话；需要在每个请求附上。
- 两段式令牌：短期 `access_token` + 长期 `refresh_token`，前端通过拦截器在 401 时刷新，无需用户感知。
- 分页两类：`page/size`（老人列表）与 `offset/limit`（其余列表），注意分别处理。
- 幂等与状态：订单确认/完成/评价是状态变更端点，重复点击需处理幂等与 UI 状态；后端已做“状态未变更”的容错提示。
- 时间窗口查询：健康/门禁等数据需要 `start_time/end_time`；统一使用 ISO 字符串，前端做好时区处理。
- 类型生成（可选）：可用 `openapi.json` 自动生成 TS 类型，减少手写错误。

## 参考
- Swagger 文档：`http://127.0.0.1:8000/docs` / `http://127.0.0.1:8000/redoc`
- OpenAPI 导出：`http://127.0.0.1:8000/openapi.json`

---

## 边缘订阅与预警（MQTT + WebSocket）

### 概览
- 订阅端：后台线程订阅 MQTT 主题，将设备上传的健康数据进行基础校验与异常判定，入库到 `health_record` 并推送预警到 WebSocket。
- 推送端：WebSocket 通道 `/ws/warning`（强制鉴权），连接需携带 `token=<access_token>`，非管理员按“老人集合”过滤；管理员/运营可接收全部。
- 配置：`.env` 中 `MQTT_ENABLED=True`、`MQTT_BROKER_URL`、`MQTT_BROKER_PORT`、`MQTT_TOPIC`、`MQTT_CLIENT_ID`。
- 启动：应用启动时自动执行（见 `app/main.py`）。当 Broker 未就绪时，后端不阻塞启动。

### MQTT 消息格式（JSON）
```json
{
  "elderly_id": 123,
  "monitor_type": "heart_rate",
  "monitor_value": 98.0,
  "monitor_time": "2025-12-27 12:01:02",
  "device_id": "mock_device_001"
}
```
- 必填字段：`elderly_id`、`monitor_type`、`monitor_value`（float）、`monitor_time`（`YYYY-MM-DD HH:MM:SS`）。
- 校验与过滤：心率范围 `0-220`、血压范围 `50-260`，超出范围或缺字段将被忽略。
- 异常策略（可改进）：当前简易阈值法：心率 > 100、血压 > 140 记为异常（`is_abnormal=1`）。

### WebSocket 预警通道（强制携带 token）
- 路径：`ws://127.0.0.1:8000/ws/warning?token=<ACCESS_TOKEN>`
- 消息格式（示例）
```json
{
  "elderly_id": 1,
  "monitor_type": "heart_rate",
  "monitor_value": 120.5,
  "monitor_time": "2025-12-27 12:00:00",
  "device_id": "demo",
  "db_written": true
}
```
- 说明：`db_written` 表示是否成功写入数据库（若外键不存在，入库跳过但仍广播，便于演示）。

### 纯后端演示步骤（设备→订阅→入库→预警）
1) 确认后端运行，且 `.env` 开启 MQTT：`MQTT_ENABLED=True`。
2) 启动本地 Broker（示例采用 Mosquitto）：
```sh
sudo apt install -y mosquitto mosquitto-clients
sudo systemctl start mosquitto
```
3) 发布测试数据到主题（与 `.env` 的 `MQTT_TOPIC` 保持一致，默认 `smartcommhub/health`）：
```sh
mosquitto_pub -h 127.0.0.1 -p 1883 -t smartcommhub/health \
  -m '{"elderly_id":1,"monitor_type":"heart_rate","monitor_value":120.5,"monitor_time":"2025-12-27 12:00:00","device_id":"demo"}'
```
4) 查询入库结果：
- 按老人与时间窗口查询健康记录：
```sh
curl -s 'http://127.0.0.1:8000/api/health-records?elderly_id=1&start_time=2025-12-27 00:00:00&end_time=2025-12-28 00:00:00&offset=0&limit=50' \
  -H "Authorization: Bearer $ACCESS" | jq
```
5) 订阅预警（WebSocket）：
```sh
npx wscat -c "ws://127.0.0.1:8000/ws/warning?token=$ACCESS"
# 或用浏览器控制台（示意）：
# new WebSocket(`ws://127.0.0.1:8000/ws/warning?token=${accessToken}`)
```

### 前端演示窗口（最小实现）
可在前端增加“告警看板”页面：连接 `/ws/warning`，实时渲染异常消息，并提供跳转到老人详情的入口。

HTML（纯原生示例，直接用于演示）
```html
<!doctype html>
<meta charset="utf-8" />
<title>告警看板</title>
<style>body{font-family:sans-serif} .item{padding:8px;border-bottom:1px solid #eee}</style>
<div id="list"></div>
<script>
  const accessToken = '...'; // 登录后拿到的 access_token
  const ws = new WebSocket(`ws://127.0.0.1:8000/ws/warning?token=${accessToken}`);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const el = document.createElement('div');
    el.className = 'item';
    el.textContent = `${msg.monitor_time} | 老人#${msg.elderly_id} | ${msg.monitor_type}=${msg.monitor_value} | 入库:${msg.db_written}`;
    document.getElementById('list').prepend(el);
  };
  ws.onopen = () => console.log('WS connected');
  ws.onclose = () => console.log('WS closed');
</script>
```

React（简版示例）
```js
import { useEffect, useRef, useState } from 'react';

export default function WarningBoard() {
  const [items, setItems] = useState([]);
  const wsRef = useRef(null);
  useEffect(() => {
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/warning?token=${accessToken}`);
    wsRef.current = ws;
    ws.onmessage = (ev) => setItems((prev) => [JSON.parse(ev.data), ...prev].slice(0, 200));
    return () => ws.close();
  }, []);
  return (
    <div>{items.map((m, i) => (<div key={i}>{m.monitor_time} | #{m.elderly_id} | {m.monitor_type}:{m.monitor_value}</div>))}</div>
  );
}
```

### 与业务接口的配合
- 前端看板接收预警后，可调用 `/api/elders/{id}` 获取档案信息并展示详情。
- 历史数据/追溯：使用 `/api/health-records` 的时间窗口查询。
- 当前版本未提供“告警确认/静音”接口；如需这类交互，可按以下建议扩展：
  - 增加资源 `alerts`：`GET /api/alerts`（列表/过滤）、`PATCH /api/alerts/{id}/ack`（确认）、`PATCH /api/alerts/{id}/silence`（静音）。
  - WS 侧可根据用户角色/老人分组做推送路由与权限控制。

### 个性化异常检测（后端）
- 目标：在 (老人ID, 设备ID, 指标类型) 维度上，在线维护基线并给出个性化异常评分与置信度。
- 算法：
  - 基线：EWMA 均值 μ 与 EWMA 绝对偏差 mdev，σ≈1.253*mdev。
  - 评分：`z = |x-μ| / (σ + eps)`，当样本数≥`ANOMALY_MIN_SAMPLES` 且 `z > ANOMALY_K_SIGMA` 判为个性化异常。
  - 置信度：样本量占比 × 偏差幅度占比（截断后线性组合）。
- 配置：见 `.env` 或默认值（`ANOMALY_PERSONAL_ENABLED`、`ANOMALY_ALPHA`、`ANOMALY_K_SIGMA`、`ANOMALY_MIN_SAMPLES`）。
- WS 消息中新增字段（示例）：
```json
{
  "anomaly": {
    "global": true,
    "personal": true,
    "score": 4.2,
    "confidence": 0.85,
    "k": 3.0,
    "n": 120,
    "mu": 75.3,
    "sigma": 6.8
  }
}
```
- 联调接口：
  - 查询基线：`GET /api/edge/baseline?elderly_id=1&device_id=demo&monitor_type=heart_rate`（需 `Authorization`）。

### 备注与建议(jym)
- 安全：WS `/ws/warning` 已强制鉴权；管理员/运营接收全量，其余按老人集合过滤。浏览器侧请避免将 Token 暴露到可共享日志。
- 可靠性：边缘判定策略应逐步从阈值过渡到滑窗统计与多特征融合；可利用 `is_abnormal` + 规则引擎或轻量模型。
- 性能：广播已采用 200ms 批处理节流；前端可做合并渲染与限速。


## WS 握手鉴权与订阅过滤（最小实现）

- 查询参数（强制）：
  - `token`：必填，携带登录令牌（access_token），后端解析用户绑定的老人或家庭组的老人集合；例如 `ws://127.0.0.1:8000/ws/warning?token=ACCESS_TOKEN`
  - `elderly_id`：可选，在已授权的老人集合内进一步缩小到某一老人；例如 `ws://127.0.0.1:8000/ws/warning?token=ACCESS_TOKEN&elderly_id=1`
- 推送规则：
  - 管理员/运营：接收全部预警事件。
  - 普通用户/家属：仅推送授权老人集合内的事件；若同时指定 `elderly_id`，则缩小到该老人。
  - 未携带有效 `token`：连接被拒绝（Policy Violation 1008）。

## 家庭聚合与订阅过滤

- 家庭成员查询（按老人）
  - 关系：`family_member.elderly_id -> elderly.elderly_id`
  - 用途：前端展示“该老人对应的家庭成员列表”
  - 端点：`GET /api/families/by-elderly/{elderly_id}` → 返回成员 `[{family_id,name,phone,relation,permission_level,elderly_id}]`

- 家庭组（多老人）与账号订阅（家属）
  - 表设计：`family_group`（家庭组）、`family_group_member_map`（成员到组）、`family_group_elder_map`（老人到组）。
  - 账号到老人集合：`sys_usr_account.family_id -> family_group_member_map -> family_group_elder_map -> elderly_id[]`；无组时回退到 `family_member` 的单个老人绑定。
  - 端点：`GET /api/families/by-account/elders`（Header 需 `Authorization`）→ 返回该账号关注的老人列表或 ID 集合，用于前端渲染与 WS 订阅提示。
  - WS 过滤：握手携带 `token`，后端解析账号的老人集合；非管理员仅推送该集合内事件。

## 家庭成员与 WS 过滤联调

```sh
# 查询家庭成员（按老人）
curl -s 'http://127.0.0.1:8000/api/families/by-elderly/1?offset=0&limit=50' \
  -H "Authorization: Bearer $ACCESS" | jq

# 查询当前账号关注的老人集合（用于提示/订阅）
curl -s 'http://127.0.0.1:8000/api/families/by-account/elders' \
  -H "Authorization: Bearer $ACCESS" | jq

# 订阅某老人预警（需携带 token，可选 elderly_id）
# 终端1（只收#1的事件）：
wscat -c "ws://127.0.0.1:8000/ws/warning?token=$ACCESS&elderly_id=1"

# 终端2（按账号绑定的老人集合自动过滤）：
wscat -c "ws://127.0.0.1:8000/ws/warning?token=$ACCESS"

# 发布测试数据（仅elderly_id=1会在终端1看到）
mosquitto_pub -h 127.0.0.1 -p 1883 -t smartcommhub/health \
  -m '{"elderly_id":1,"monitor_type":"heart_rate","monitor_value":129,"monitor_time":"2025-12-27 21:00:00","device_id":"demo"}'
```

