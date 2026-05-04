# PostReport Feature – Tài liệu triển khai

## Tổng quan
Tính năng **PostReport** cho phép người dùng báo cáo bài viết vi phạm và cung cấp luồng xử lý cho admin:
- Người dùng gửi report (lý do + mô tả).
- Hệ thống lưu report chi tiết + cập nhật bảng tổng hợp theo từng bài viết.
- Khi đạt điều kiện, hệ thống tạo **thông báo cho admin** để vào xử lý.

## Database migration & setup
### Migrations liên quan
Các bảng `PostReports` và `PostReportSummaries` đã được khai báo trong migrations tại `src/InteractHub.Infrastructure/Migrations` (được tạo từ các migration như `20260422162035_InitialCreate.cs` và các migration tiếp theo).

### Cách áp migration
**Cách 1 (khuyến nghị): chạy API và để auto-migrate**
```powershell
dotnet run --project src/InteractHub.API
```
`src/InteractHub.API/Program.cs` gọi `Database.Migrate()` khi khởi động.

**Cách 2: dùng EF CLI**
```powershell
dotnet ef database update --project src/InteractHub.Infrastructure --startup-project src/InteractHub.API
dotnet ef migrations list --project src/InteractHub.Infrastructure
```

## Database schema (tóm tắt)
### `PostReports` (chi tiết từng report)
Các trường chính:
- `Id` (PK), `PostId` (FK -> `Posts`), `ReporterId` (FK -> `AspNetUsers`)
- `Reason`, `Description`
- `Status` (`ReportStatus`: `Pending/Reviewed/Resolved/Rejected`)
- `CreatedAt`, `UpdatedAt`
- Các trường phục vụ admin xử lý: `HandlerId`, `ActionTaken`, `ReviewedAt`, `ReviewNote`, `ResolutionMessage`

### `PostReportSummaries` (tổng hợp theo bài viết – 1:1 với Post)
Các trường chính:
- `PostId` (PK/FK -> `Posts`), `TotalReports`
- `SpamCount`, `OffensiveCount`, `FakeNewsCount`, `OtherCount`
- `Flag` và `FinalStatus` (`ContentFlag`: `Safe/Dangerous/UnderReview/Violating/Removed`)
- Trạng thái review/escalate: `LastReviewedAt`, `LastReviewedByAdminId`, `ReportsSinceLastReview`, `LastEscalatedAt`, `ReviewerNote`, `LastReviewDecision`

## Entities & DTOs
- `src/InteractHub.Core/Entities/PostReport.cs`: `PostReport`, `ReportStatus`
- `src/InteractHub.Core/Entities/PostReportSummary.cs`: `PostReportSummary`, `ContentFlag`
- `src/InteractHub.Core/DTOs/CreateReportRequest.cs`: request tạo report
- `src/InteractHub.Core/DTOs/UpdatePostReportStatusRequest.cs`: request update status (admin)
- `src/InteractHub.Core/DTOs/ReviewPostReportRequest.cs`: request review (admin moderation)

## API endpoints
### User report
- `POST /api/PostReport/report` (yêu cầu đăng nhập – Bearer token)

Request body (theo `CreateReportRequest`):
```json
{
  "postId": 123,
  "reason": "Spam",
  "description": "Nội dung quảng cáo/đăng lặp lại"
}
```

### Admin report management
- `GET /api/admin/reports` (lọc theo `status`, `postId`, `reporterId`, `q/query`, `sortBy`, `sortDir`)
- `GET /api/admin/reports/{reportId}`
- `PUT /api/admin/reports/{reportId}/status` (theo `UpdatePostReportStatusRequest`)
- `PUT /api/admin/moderation/reports/{reportId}/review` (theo `ReviewPostReportRequest`)

## Luồng xử lý (service layer)
### Tạo report
`src/InteractHub.Infrastructure/Services/PostReportService.cs`
- Kiểm tra bài viết tồn tại.
- Chặn report trùng (cùng `postId` + `reporterId` và đang `Pending`).
- Ghi `PostReport` + upsert `PostReportSummary` trong transaction.
- Cập nhật các bộ đếm theo `Reason` (so khớp theo chuỗi: “spam”, “offensive/phản cảm”, “fake/tin giả”).
- Escalate cho admin khi:
  - `Flag` hiện tại khác `Safe`, **hoặc**
  - `ReportsSinceLastReview >= 3`
  - Ngoài ra nếu `TotalReports >= 10` thì đẩy `Flag` sang `Dangerous` (nếu chưa `Violating`).
- Nếu escalate, tạo thông báo cho các user có role `Admin` thông qua `INotificationService` (`NotificationType.PostReported`).

### Xử lý report (admin)
Admin có thể cập nhật trạng thái report và/hoặc đưa ra quyết định moderation thông qua:
- `src/InteractHub.Infrastructure/Services/AdminReportService.cs`
- `src/InteractHub.Infrastructure/Services/AdminModerationService.cs`

## Frontend integration
Frontend gọi API theo base URL cấu hình tại `src/InteractHub.Client/src/api/axiosConfig.ts`.
Tuỳ chọn cấu hình:
- `VITE_API_BASE_URL` (mặc định: `http://localhost:5207/api`)
- `VITE_REALTIME_BASE_URL` (SignalR, mặc định dùng `http://localhost:5207`)
