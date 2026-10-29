# Library Seat Booking & Management System — API Reference

All requests and responses use JSON. All monetary values are represented as integers in **paise** (1 INR = 100 paise). Timestamps are in UTC ISO-8601 strings.

Base URL: `/api/v1`

---

## Authentication (`/api/v1/auth`)

### 1. Send OTP
- **POST** `/auth/otp/send`
- **Body**:
  ```json
  {
    "contact": "student@example.com",
    "contactType": "EMAIL"
  }
  ```
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": { "expiresInSeconds": 300 },
    "message": "OTP sent successfully"
  }
  ```

### 2. Verify OTP & Login
- **POST** `/auth/otp/verify`
- **Body**:
  ```json
  {
    "contact": "student@example.com",
    "contactType": "EMAIL",
    "otp": "123456"
  }
  ```
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "name": "...", "status": "ACTIVE" },
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
  ```

---

## Seats & Layout (`/api/v1`)

### 1. List Floors & Sections
- **GET** `/floors`
- Returns floors with sections and active seats.

### 2. Shifts
- **GET** `/shifts`
- Returns available shift slots (`FULL_DAY`, `MORNING`, `EVENING`) and start/end times.

### 3. Seat Availability
- **GET** `/availability?date=YYYY-MM-DD&shiftSlot=FULL_DAY&floorId=...`
- Returns seat IDs mapped to their status (`AVAILABLE`, `HELD`, `BOOKED`, `MAINTENANCE`).

---

## Bookings (`/api/v1/bookings`)

*Requires `Authorization: Bearer <token>`*

### 1. Hold a Seat (10 Minutes)
- **POST** `/bookings/hold`
- **Body**:
  ```json
  {
    "seatId": "<uuid>",
    "date": "2026-11-01",
    "shiftSlot": "MORNING"
  }
  ```
- **Response `201`**: Returns booking with `status: "HELD"` and `holdExpiresAt`.

### 2. Release Hold
- **DELETE** `/bookings/hold/:id`

### 3. List My Bookings
- **GET** `/bookings/my?status=CONFIRMED&page=1&limit=20`

### 4. Check-In via QR
- **POST** `/bookings/:id/check-in`
- Updates booking status to `CHECKED_IN` and logs QR check-in event.

### 5. Cancel Booking
- **POST** `/bookings/:id/cancel`
- **Body**: `{ "reason": "Change of plans" }`

---

## Payments (`/api/v1/payments`)

### 1. Create Payment Order
- **POST** `/payments/order`
- **Body**:
  ```json
  {
    "bookingId": "<uuid>",
    "paymentType": "BOOKING_TOKEN"
  }
  ```
- **Response `201`**: Returns `razorpayOrderId`, `amountPaise`, `keyId`.

### 2. Verify Payment
- **POST** `/payments/verify`
- **Body**:
  ```json
  {
    "razorpayOrderId": "order_...",
    "razorpayPaymentId": "pay_...",
    "razorpaySignature": "..."
  }
  ```
- Confirms booking and generates receipt number (`REC-...`).

---

## Monthly Fees (`/api/v1/fees`)

### 1. Membership Plans
- **GET** `/fees/plans`

### 2. My Active Membership
- **GET** `/fees/membership/my`

### 3. My Invoices
- **GET** `/fees/invoices/my`

### 4. Join / Upgrade Membership
- **POST** `/fees/membership/join`
- **Body**: `{ "planId": "<uuid>", "startDate": "YYYY-MM-DD" }`

---

## Complaints & Support (`/api/v1/complaints`)

### 1. Submit Complaint
- **POST** `/complaints`
- **Body**:
  ```json
  {
    "category": "NOISE",
    "severity": "HIGH",
    "subject": "Loud conversations in quiet zone",
    "description": "Near desk F-12..."
  }
  ```

### 2. Add Reply to Thread
- **POST** `/complaints/:id/messages`
- **Body**: `{ "message": "Still ongoing..." }`

---

## Staff & Admin Endpoints (`/api/v1/admin`)

*Requires staff or admin JWT token*

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/dashboard` | `GET` | Summary statistics, occupancy rate, today's revenue |
| `/admin/seats` | `POST` | Create desk |
| `/admin/seats/:id` | `PATCH` | Edit desk type, amenities, status |
| `/admin/seats/:id/block` | `POST` | Block desk for maintenance |
| `/admin/seats/:id/unblock` | `DELETE` | Unblock desk |
| `/admin/bookings` | `GET` | List bookings with filters and student search |
| `/admin/bookings/:id/check-in` | `POST` | Front-desk manual check-in |
| `/admin/bookings/:id/collect` | `POST` | Collect offline cash/UPI payment with receipt |
| `/admin/bookings/:id/cancel` | `POST` | Admin cancel booking |
| `/admin/members` | `GET` | Search and list registered students |
| `/admin/members/:id` | `GET` | Full member history and dossier |
| `/admin/members/:id/membership`| `POST` | Assign or override membership subscription |
| `/admin/members/:id/status` | `PATCH` | Suspend or activate student account |
| `/admin/fees/invoices` | `GET` | All issued and overdue invoices |
| `/admin/fees/invoices/generate`| `POST` | Batch generate monthly invoices |
| `/admin/fees/collect` | `POST` | Record offline fee collection |
| `/admin/fees/adjustments` | `POST` | Apply discount or credit to an invoice |
| `/admin/complaints` | `GET` | List complaint queue |
| `/admin/complaints/:id/status` | `PATCH` | Update ticket status (IN_PROGRESS, RESOLVED) |
| `/admin/complaints/:id/messages`| `POST` | Post staff reply or internal note |
| `/admin/announcements` | `POST` | Broadcast announcement to members |
| `/admin/settings` | `GET` | View system rules and hold TTL |
| `/admin/settings/:key` | `PATCH` | Update setting value |
