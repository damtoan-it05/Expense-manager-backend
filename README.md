# Expense Manager – Backend API

Node.js + Express + MongoDB backend cho hệ thống quản lý thu chi cá nhân.

---

## Cài đặt & Chạy

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ mẫu và điền thông tin
cp .env.example .env

# 3. Seed danh mục mặc định (chỉ chạy 1 lần)
node src/seed.js

# 4. Chạy dev server
npm run dev

# 5. Chạy production
npm start
```

---

## Biến môi trường (.env)

| Biến            | Mô tả                          | Mặc định                                      |
|-----------------|--------------------------------|-----------------------------------------------|
| PORT            | Port server                    | 5000                                          |
| MONGODB_URI     | MongoDB connection string      | mongodb://localhost:27017/expense_manager      |
| JWT_SECRET      | Secret key cho JWT             | _(bắt buộc phải đặt)_                         |
| JWT_EXPIRES_IN  | Thời hạn token                 | 7d                                            |

---

## API Endpoints

> Tất cả route (trừ `/api/auth/register` và `/api/auth/login`) đều yêu cầu header:
> `Authorization: Bearer <token>`

---

### 🔐 Auth

| Method | Endpoint                     | Mô tả                     |
|--------|------------------------------|---------------------------|
| POST   | /api/auth/register           | Đăng ký tài khoản         |
| POST   | /api/auth/login              | Đăng nhập, nhận JWT       |
| GET    | /api/auth/me                 | Lấy thông tin user hiện tại|
| PATCH  | /api/auth/change-password    | Đổi mật khẩu              |

**POST /api/auth/register**
```json
{ "username": "john", "email": "john@example.com", "password": "123456" }
```

**POST /api/auth/login**
```json
{ "email": "john@example.com", "password": "123456" }
```

---

### 📂 Categories

| Method | Endpoint              | Mô tả                                         |
|--------|-----------------------|-----------------------------------------------|
| GET    | /api/categories       | Lấy danh mục (mặc định + của user). Query: `?type=income\|expense` |
| POST   | /api/categories       | Tạo danh mục mới                              |
| GET    | /api/categories/:id   | Lấy chi tiết danh mục                         |
| PUT    | /api/categories/:id   | Sửa danh mục (chỉ của user, không sửa mặc định)|
| DELETE | /api/categories/:id   | Xóa danh mục (chỉ của user)                   |

**POST /api/categories**
```json
{ "name": "Café", "type": "expense", "icon": "coffee", "color": "#f97316" }
```

---

### 💸 Transactions

| Method | Endpoint                 | Mô tả                  |
|--------|--------------------------|------------------------|
| GET    | /api/transactions        | Lấy danh sách giao dịch|
| POST   | /api/transactions        | Tạo giao dịch mới      |
| GET    | /api/transactions/:id    | Lấy chi tiết giao dịch |
| PUT    | /api/transactions/:id    | Sửa giao dịch          |
| DELETE | /api/transactions/:id    | Xóa giao dịch          |

**GET /api/transactions** – Query params:
- `type` = income | expense
- `categoryId` = ObjectId
- `startDate` / `endDate` = ISO date string
- `page` / `limit` = phân trang (mặc định 1/20)

**POST /api/transactions**
```json
{
  "type": "expense",
  "amount": 50000,
  "categoryId": "<ObjectId>",
  "date": "2025-01-15",
  "note": "Cơm trưa"
}
```

---

### 💰 Budgets

| Method | Endpoint            | Mô tả                                        |
|--------|---------------------|----------------------------------------------|
| GET    | /api/budgets        | Lấy ngân sách (kèm % đã dùng & cảnh báo). Query: `?month=&year=` |
| POST   | /api/budgets        | Tạo ngân sách mới                            |
| PUT    | /api/budgets/:id    | Sửa ngân sách                                |
| DELETE | /api/budgets/:id    | Xóa ngân sách                                |
| GET    | /api/budgets/alerts | Lấy các ngân sách đang vượt ngưỡng cảnh báo  |

**POST /api/budgets**
```json
{
  "categoryId": "<ObjectId>",
  "month": 1,
  "year": 2025,
  "limitAmount": 2000000,
  "alertThreshold": 80
}
```

**Response GET /api/budgets** – mỗi item có thêm:
```json
{
  "spent": 1700000,
  "remaining": 300000,
  "percentage": 85,
  "isAlert": true,
  "isExceeded": false
}
```

---

### 📊 Statistics

| Method | Endpoint                         | Mô tả                                     |
|--------|----------------------------------|-------------------------------------------|
| GET    | /api/statistics/summary          | Tổng thu / chi / số dư theo kỳ            |
| GET    | /api/statistics/by-category      | Thu/chi theo danh mục (cho biểu đồ tròn)  |
| GET    | /api/statistics/trend            | Xu hướng thu/chi theo 12 tháng (biểu đồ cột) |

**Query params chung:**
- `period` = weekly | monthly | yearly (mặc định: monthly)
- `month` / `year` (khi period=monthly)
- `year` / `week` (khi period=weekly)
- `year` (khi period=yearly)
- `type` = income | expense (chỉ dùng cho /by-category)

---

### 🛡️ Admin _(yêu cầu role=admin)_

| Method | Endpoint                     | Mô tả                          |
|--------|------------------------------|--------------------------------|
| GET    | /api/admin/users             | Danh sách users. Query: `?search=&page=&limit=` |
| GET    | /api/admin/users/:id         | Chi tiết user + thống kê       |
| PATCH  | /api/admin/users/:id/role    | Thay đổi role user             |
| GET    | /api/admin/stats             | Thống kê tổng quan hệ thống    |

---

## Cấu trúc thư mục

```
src/
├── app.js              # Entry point
├── seed.js             # Seed danh mục mặc định
├── models/
│   ├── User.js
│   ├── Category.js
│   ├── Transaction.js
│   └── Budget.js
├── routes/
│   ├── auth.js
│   ├── categories.js
│   ├── transactions.js
│   ├── budgets.js
│   ├── statistics.js
│   └── admin.js
└── middleware/
    └── auth.js         # JWT protect + adminOnly
```
