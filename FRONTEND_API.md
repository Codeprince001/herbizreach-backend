# HerBizReach API — Frontend integration reference

Base URL: use your API host (local default **port `4000`**, from `PORT` in `.env`). There is **no** global path prefix; routes are as listed below.

## Authentication

- Most routes require a JWT: header **`Authorization: Bearer <access_token>`**.
- Register / login responses include **`access_token`** (string) and **`user`** (public profile).

### Roles

| Role       | Typical UI                          |
| ---------- | ----------------------------------- |
| `OWNER`    | Dashboard, products, store settings |
| `CUSTOMER` | Buyer account, chat inbox           |
| `ADMIN`    | Admin console (`/admin/*`)          |

---

## Health (public)

| Method | Path           | Description        |
| ------ | -------------- | ------------------ |
| `GET`  | `/health`      | Liveness (`ok`)    |
| `GET`  | `/health/ready` | DB readiness probe |

---

## Auth

| Method | Path                    | Auth   | Description |
| ------ | ----------------------- | ------ | ----------- |
| `POST` | `/auth/register`        | Public | Register **business owner** |
| `POST` | `/auth/register-customer` | Public | Register **customer** |
| `POST` | `/auth/login`           | Public | Login (any role) |
| `GET`  | `/auth/me`              | JWT    | Current user profile |

**`POST /auth/register`** (JSON)

- `fullName`, `email`, `password` (min 8), `businessName`, optional `phone`

**`POST /auth/register-customer`** (JSON)

- `fullName`, `email`, `password` (min 8)

**`POST /auth/login`** (JSON)

- `email`, `password`

---

## Public storefront & analytics events

| Method | Path                              | Auth   | Description |
| ------ | --------------------------------- | ------ | ----------- |
| `GET`  | `/store/:slug`                    | Public | Store page payload (products, settings, etc.) |
| `GET`  | `/store/:slug/products/:productId` | Public | Single product on that store |
| `POST` | `/store/:slug/leads`              | Public | Submit contact / lead |
| `POST` | `/store/:slug/view`               | Public | Record page or product view |
| `POST` | `/store/:slug/share`              | Public | Record share (e.g. WhatsApp) |

**`POST /store/:slug/leads`** (JSON)

- `name`, `phone` (5–32 chars), optional `message`, optional `productId` (UUID v4)

**`POST /store/:slug/view`** (JSON)

- optional `productId` (UUID), optional `referrer`

**`POST /store/:slug/share`** (JSON)

- optional `productId` (UUID), optional `channel`

---

## Categories (public)

| Method | Path            | Auth   | Description      |
| ------ | --------------- | ------ | ---------------- |
| `GET`  | `/categories`   | Public | List categories  |

---

## Products (owner)

All routes: **JWT** + role **`OWNER`**.

| Method | Path                 | Description |
| ------ | -------------------- | ----------- |
| `POST` | `/products`          | Create product (**multipart/form-data**) |
| `GET`  | `/products`          | List current user’s products |
| `GET`  | `/products/:id`      | Get one (UUID v4) |
| `PATCH`| `/products/:id`      | Update fields (**JSON**) |
| `PATCH`| `/products/:id/image`| Replace image (**multipart**: field `image`) |
| `DELETE` | `/products/:id`    | Delete product |

**`POST /products`** (`multipart/form-data`)

- Required: `image` (file), `name`, `price`, `descriptionRaw`
- Optional: `sku`, `stockQuantity`, `lowStockThreshold`, `featured`, `categoryIds` (comma-separated UUIDs or JSON array string), `isPublished`

**`PATCH /products/:id`** (JSON) — all optional

- `name`, `price`, `descriptionRaw`, `descriptionAi`, `captionAi`, `sku`, `stockQuantity`, `lowStockThreshold`, `featured`, `categoryIds` (array of UUIDs; empty clears), `isPublished`

---

## Store settings (owner)

All routes: **JWT** + **`OWNER`**.

| Method | Path              | Description |
| ------ | ----------------- | ----------- |
| `GET`  | `/store-settings` | Get settings for logged-in owner |
| `PATCH`| `/store-settings` | Update settings (JSON, all fields optional) |

**`PATCH`** body (optional fields)

- `whatsAppPhone`, `bannerUrl`, `accentColor`, `tagline`, `showChatWidget`

---

## Chat (REST)

| Method | Path                                   | Auth | Description |
| ------ | -------------------------------------- | ---- | ----------- |
| `POST` | `/chat/conversations/start`            | Public* | Start conversation; optional `Authorization: Bearer` for logged-in customer |
| `GET`  | `/chat/conversations`                  | JWT  | List conversations (owner or customer) |
| `GET`  | `/chat/conversations/:id/messages`     | Public* | Paginated messages; guests use `guestToken` query |
| `POST` | `/chat/conversations/:id/messages`     | Public* | Send message; guests send `guestToken` in JSON body |
| `PATCH`| `/chat/conversations/:id/archive`      | JWT + **OWNER** | Archive (store owner) |

\* **Public*** = no JWT required for guests; if the user sends a valid **Bearer** token, the API treats them as that user.

**`POST /chat/conversations/start`** (JSON)

- `storeSlug`

**`GET /chat/conversations/:id/messages`** (query)

- `page` (default 1), `limit` (default 50, max 100), optional `guestToken`

**`POST /chat/conversations/:id/messages`** (JSON)

- `body` (message text), optional `guestToken` (required for guest threads)

---

## Chat (WebSocket — Socket.IO)

- **Namespace:** `/chat` (e.g. connect to `http://<host>:<port>/chat` with the Socket.IO client).
- **CORS:** origin must be allowed by the API’s `CORS_ORIGINS` (browser).
- **Auth:** pass JWT via `auth: { token: '<jwt>' }` and/or `Authorization: Bearer <jwt>` on the handshake; guests omit token and use `guestToken` in payloads.

**Client → server**

| Event         | Payload |
| ------------- | ------- |
| `join`        | `{ conversationId: string, guestToken?: string }` |
| `sendMessage` | `{ conversationId: string, body: string, guestToken?: string }` |
| `typing`      | `{ conversationId: string, typing: boolean }` |

**Server → client**

| Event     | Payload |
| --------- | ------- |
| `message` | Message object (same shape as REST-created messages) |
| `typing`  | `{ conversationId, typing }` (broadcast to others in the room) |

---

## Leads (owner)

| Method | Path     | Auth | Description |
| ------ | -------- | ---- | ----------- |
| `GET`  | `/leads` | JWT + **OWNER** | List leads for your store |

---

## Analytics (owner)

| Method | Path                  | Auth | Description |
| ------ | --------------------- | ---- | ----------- |
| `GET`  | `/analytics/overview` | JWT + **OWNER** | Dashboard metrics (views, shares, per-product) |

---

## AI (owner)

| Method | Path                       | Auth | Description |
| ------ | -------------------------- | ---- | ----------- |
| `POST` | `/ai/improve-description`  | JWT + **OWNER** | Improve description + caption (stricter rate limit: 20/min per default config) |

**Body** (JSON)

- `descriptionRaw`, optional `productName`

---

## Admin

All routes: **JWT** + role **`ADMIN`**.

**Pagination:** most list endpoints accept query `page` (≥1) and `limit` (1–100, defaults vary).

| Method | Path                               | Query / notes |
| ------ | ---------------------------------- | ------------- |
| `GET`  | `/admin/users`                     | `page`, `limit`, optional `role`, `search` |
| `GET`  | `/admin/users/:id`                 | — |
| `PATCH`| `/admin/users/:id`                 | JSON: optional `role`, `disabled` |
| `GET`  | `/admin/products`                  | `page`, `limit`, optional `userId`, `search` |
| `GET`  | `/admin/products/:id`             | — |
| `PATCH`| `/admin/products/:id`              | JSON: optional `name`, `price`, `isPublished`, `featured` |
| `DELETE`| `/admin/products/:id`            | — |
| `GET`  | `/admin/metrics`                   | Platform metrics (includes `categories.total` and `categories.newLast7Days`) |
| `GET`  | `/admin/categories`                | Categories with per-row usage stats (products, views, shares, 7-day windows) |
| `POST` | `/admin/categories`                | JSON: `name`, optional `slug` (generated from name if omitted) |
| `GET`  | `/admin/conversations`             | `page`, `limit` |
| `GET`  | `/admin/conversations/:id/messages`| `page`, `limit` (default limit 50) |
| `GET`  | `/admin/audit-logs`                | `page`, `limit`, optional `actorUserId`, `entityType` |

---

## OpenAPI (development)

When `NODE_ENV` is not `production`, interactive docs are at **`/api/docs`** (Swagger UI).

---

## Rate limiting

A global throttle applies (default **120 requests per 60 seconds** per IP unless configured otherwise). AI has an additional limit on `/ai/improve-description`. Handle **429** responses in the UI.
