# VDinz Profile

Website profile tĩnh, có thể triển khai bằng GitHub Pages.

## Kết nối bộ đếm Cloudflare

Bộ đếm dùng Cloudflare Worker làm API và D1 để lưu tổng lượt xem.

### 1. Tạo D1 database

Trong Cloudflare chọn **Storage & Databases → D1 → Create database**, đặt tên `profile-views`, sau đó chạy trong tab **Console**:

```sql
CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO counters (name, value)
VALUES ('home', 0);
```

### 2. Tạo và cấu hình Worker

Tạo Worker tên `profile-view-counter`. Trong tab **Bindings**, thêm D1 binding:

```text
Variable name: DB
D1 database: profile-views
```

Code Worker cần cung cấp hai thao tác tại `/view`:

- `GET`: đọc số hiện tại.
- `POST`: tăng một lượt và trả về `{ "count": number }`.

Trong Worker, thêm đúng origin của website:

```js
const ALLOWED_ORIGINS = new Set([
  "https://hin2106.github.io"
]);
```

Có thể cho phép môi trường local khi phát triển:

```js
function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.has(origin)) return true;

  try {
    const url = new URL(origin);
    return url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}
```

Sau khi thêm code và binding, bấm **Deploy**. API của dự án hiện tại:

```text
https://profile-view-counter.concun185.workers.dev/view
```

### 3. Kết nối website

Mở `assets/js/core/view-counter.js` và sửa URL nếu dùng Worker khác:

```js
const COUNTER_API =
  "https://profile-view-counter.concun185.workers.dev/view";
```

Website sẽ gửi `POST` khi trang được tải. Không cần kết nối tài khoản GitHub với Cloudflare; GitHub Pages gọi trực tiếp URL Worker ở trên.

### 4. Kiểm tra và sửa số lượt xem

Đọc số hiện tại bằng trình duyệt:

```text
https://profile-view-counter.concun185.workers.dev/view
```

Hoặc chạy trong D1 Console:

```sql
SELECT * FROM counters;
```

Đặt thủ công số lượt xem:

```sql
UPDATE counters
SET value = 7394
WHERE name = 'home';
```

Mỗi lần tải trang tiếp theo sẽ tăng thêm một lượt.
