# InteractHub

## Mô tả ngắn

InteractHub là ứng dụng mạng xã hội (full‑stack) cho phép người dùng đăng bài, tương tác (like/bình luận), kết bạn, xem stories và nhận thông báo thời gian thực.

## Tên dự án

**InteractHub**

## Mục tiêu

- Xây dựng một sản phẩm mẫu theo hướng “real product”: API + UI + DB + auth + realtime.
- Luyện tập quy trình phát triển với .NET/React (EF Core migrations, JWT auth, Swagger, unit test).

## Các tính năng chính đã làm

- Xác thực/Phân quyền: Đăng ký/đăng nhập, JWT Bearer, vai trò (role) cơ bản.
- Bài viết: tạo/xoá, like, bình luận, tải ảnh (tích hợp Azure Blob Storage).
- Bạn bè: gửi/nhận lời mời, chấp nhận/từ chối, danh sách bạn.
- Stories: tạo/xoá, hiển thị theo thời hạn.
- Thông báo realtime: SignalR hub (`/hubs/realtime`).
- Báo cáo bài viết & admin xử lý báo cáo (xem `PostReport_Implementation_Guide.md`).
- Swagger UI cho tài liệu API.

## Danh sách công nghệ

- Frontend: React + TypeScript + Tailwind CSS + Redux Toolkit + Vite
- Backend: ASP.NET Core 8 Web API + Entity Framework Core 8 + ASP.NET Core Identity
- Database: SQL Server (Docker compose hỗ trợ)
- Auth/Realtime/API docs: JWT + SignalR + Swagger (Swashbuckle)
- Testing: xUnit + Moq + EF Core InMemory + coverlet

## Cách chạy project (Local)

### 1) Chạy database (SQL Server) bằng Docker

Tại thư mục gốc:

```powershell
docker-compose up -d db
```

Tuỳ chọn: mở Adminer (UI quản lý DB) tại `http://localhost:8080`:

```powershell
docker-compose up -d adminer
```

### 2) Chạy backend (ASP.NET Core)

Tại thư mục gốc:

```powershell
dotnet run --project src/InteractHub.API
```

- API: `http://localhost:5207`
- Swagger: `http://localhost:5207/swagger`
- Migrations: ứng dụng tự chạy `Database.Migrate()` khi khởi động.

### 3) Chạy frontend (React)

```powershell
cd src/InteractHub.Client
npm install
npm run dev
```

- Web: `http://localhost:5173`

## Cấu hình cần thiết (.env / appsettings)

### Backend: `src/InteractHub.API/appsettings.json`

Các key quan trọng:

- `ConnectionStrings:DefaultConnection` (mặc định trỏ SQL Server `localhost,1433`)
- `JwtSettings:*` (SecretKey/Issuer/Audience/ExpirationDays)
- `AzureBlob:ConnectionString` (dùng cho upload ảnh; có thể thay bằng env var ở môi trường thật)

Bạn có thể override bằng biến môi trường (dạng `__`):

- `ConnectionStrings__DefaultConnection`
- `JwtSettings__SecretKey`
- `AzureBlob__ConnectionString`

### Frontend: `src/InteractHub.Client/.env` (không bắt buộc)

Nếu muốn đổi API URL:

```env
VITE_API_BASE_URL=http://localhost:5207/api
VITE_REALTIME_BASE_URL=http://localhost:5207
```

## Chạy tests

```powershell
dotnet test tests/InteractHub.Tests/InteractHub.Tests.csproj
```

Tài liệu tổng hợp test case: `TEST_CASES_SUMMARY.md` và trạng thái file test: `TESTFILES_STATUS.md`.
