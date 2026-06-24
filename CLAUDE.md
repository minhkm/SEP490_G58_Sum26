# CLAUDE.md — Quy tắc cho AI khi làm việc trên dự án này

> File này là hướng dẫn cho mọi AI agent (Claude Code, Cursor, Copilot...) làm việc trong repo.
> Đọc kỹ trước khi sửa code. Mục tiêu: giữ **đồng bộ UI/UX**, **đúng kiến trúc**, **không phá vỡ hành vi hiện có**.

## 1. Tổng quan dự án

**CargoOps** — hệ thống quản lý vận hành tàu biển (maritime logistics) nội bộ: quản lý đội tàu, hải trình (voyage), hàng hóa (cargo), thuyền viên (crew), điểm danh, nhật ký máy. Giao diện **tiếng Việt**, phân quyền theo vai trò.

Repo gồm 2 phần: [backend/](backend/) (API) và [frontend/](frontend/) (web app).

## 2. Tech stack

**Frontend** ([frontend/](frontend/))
- React 19 + Vite 8, **JavaScript thuần (không TypeScript)**, ES modules.
- UI: **Ant Design v6** (`antd`) + `@ant-design/icons`. Ngày giờ: `dayjs`. HTTP: `axios`. Router: `react-router-dom` v6.
- ⛔ KHÔNG dùng: `bootstrap`/`react-bootstrap`, `lucide-react`, `sweetalert2` (đã loại bỏ — đừng thêm lại). *(Gói `bootstrap` CSS còn tạm giữ cho vài class utility sót lại; xem `frontend/ANTD_MIGRATION.md`.)*

**Backend** ([backend/](backend/))
- Node.js + **Express 5**, CommonJS.
- ORM: **Sequelize** trên **MySQL** (`mysql2`). Model ở [backend/src/models/](backend/src/models/).
- Auth: **JWT** (`jsonwebtoken`) + `bcrypt`. Email: `nodemailer`.

## 3. Cấu trúc & cách chạy

```
backend/src/   configs · models · services · controllers · routes · middlewares · server.js · seed.js
frontend/src/  pages · components (+ components/common) · services · config · utils · main.jsx · App.jsx
```

- Backend: `cd backend && npm run dev` (nodemon, chạy ở `http://localhost:5000`). Seed dữ liệu: `npm run seed`.
- Frontend: `cd frontend && npm run dev` (Vite). Build kiểm tra: `npm run build`.
- Frontend gọi API qua `http://localhost:5000/api` → backend phải chạy thì các trang có dữ liệu mới hoạt động.

## 4. Kiến trúc backend — tuân theo layering

Luồng chuẩn: **route → controller → service → model**.
- `routes/*Routes.js`: khai báo endpoint, gắn middleware auth.
- `controllers/`: nhận request, gọi service, trả response. Không nhét business logic phức tạp ở đây.
- `services/`: business logic, truy vấn Sequelize.
- `models/`: định nghĩa Sequelize model (xem [backend/src/models/index.js](backend/src/models/index.js) cho quan hệ).
- Thêm tính năng mới → tạo đủ 4 lớp theo mẫu các module có sẵn (vessel, voyage, cargo, crew...). Đừng truy vấn DB trực tiếp trong controller/route.

## 5. Auth & phân quyền (RBAC)

- Token JWT lưu ở `localStorage` (`token`, `user`). Axios tự gắn `Authorization: Bearer <token>` (xem [frontend/src/services/api.js](frontend/src/services/api.js)). Không tự gắn header thủ công.
- Nguồn phân quyền frontend: **[frontend/src/config/roles.js](frontend/src/config/roles.js)** — dùng `CARGO_ROLES`, `getDashboardPath(role)`. Đừng hardcode danh sách role rải rác; thêm/sửa quy tắc tại đây.
- Role chính: `Admin`, `Agency`, `Master`, `ChiefOfficer`, và các role thuyền viên (`EngineOfficer`, `EngineCrew`, `ChiefEngineer`, `DeckOfficer`, `Sailor`...). Bảo vệ route frontend qua [frontend/src/components/RequireRole.jsx](frontend/src/components/RequireRole.jsx).
- Backend: kiểm tra quyền ở middleware/service, KHÔNG tin role gửi từ client.

## 6. Quy tắc UI/UX frontend (BẮT BUỘC — đây là phần dễ lệch nhất)

**Luôn tái sử dụng component chung** ở [frontend/src/components/common/](frontend/src/components/common/), import qua barrel:

```js
import { PageHeader, StatusTag, RowActions, notifySuccess, notifyError, confirmDelete } from '../components/common';
```

| Dùng khi | Component | Ghi chú |
|---|---|---|
| Tiêu đề trang | `PageHeader` | List: `icon`+`breadcrumb`+`title`+`extra`. Chi tiết/Thêm: thêm `onBack`. |
| Hiển thị trạng thái | `StatusTag` | KHÔNG tự viết `getStatusColor`. Ghi đè màu/nhãn qua `color`/`text` nếu cần. |
| Nút thao tác dòng bảng | `RowActions` | `onView`/`onEdit`/`onDelete`; `stopPropagation` nếu dòng clickable. |
| Toast & xác nhận | `notify*` / `confirmDelete` / `confirmAction` | Thay cho mọi alert/toast/`window.confirm`. |

Thêm quy tắc:
- **Icon**: chỉ từ `@ant-design/icons`. Một số icon v5 không tồn tại ở v6 (vd `ShipOutlined`, `GaugeOutlined`) → dùng `DashboardOutlined`/`CompassOutlined`...
- **Bảng/Form/Modal**: dùng antd `Table`/`Form`(+`rules`)/`Modal`. Không code tay `<table>`/`<form>` HTML thuần, không tự dựng modal overlay.
- **Ngày tháng**: API nhận/trả chuỗi `YYYY-MM-DD`. Dùng `DatePicker` nhưng convert qua `dayjs` ở ranh giới và gửi `.format('YYYY-MM-DD')`.
- **Theme**: mặc định antd (primary `#1677ff`). Mọi tinh chỉnh token tập trung ở `ConfigProvider` trong [frontend/src/main.jsx](frontend/src/main.jsx) — đừng chế class CSS cho thứ antd đã có.
- **Văn bản UI**: tiếng Việt, giữ giọng/nhãn nhất quán với các trang hiện có.
- Nếu một pattern lặp lại mà chưa có component chung → **bổ sung vào `components/common/`** (kèm cập nhật bảng trong `ANTD_MIGRATION.md`), đừng copy-paste.

Chi tiết & bảng mapping đầy đủ: **[frontend/ANTD_MIGRATION.md](frontend/ANTD_MIGRATION.md)**.

## 7. Quy ước code chung

- Frontend: JS + ES modules; component hàm + hooks. Backend: CommonJS (`require`/`module.exports`).
- Đặt tên/đọc code theo phong cách file xung quanh. Comment tiếng Việt được chấp nhận (codebase đang dùng).
- Không thêm dependency mới nếu antd / thư viện sẵn có đã làm được. Nếu buộc phải thêm, nêu lý do.
- Gọi API qua các `*Service` trong [frontend/src/services/api.js](frontend/src/services/api.js); không rải `axios` trực tiếp trong page.

## 8. Quy trình làm việc cho AI

1. **Đọc trước khi sửa**: file liên quan + `roles.js` + `components/common` + `ANTD_MIGRATION.md` khi đụng UI.
2. **Giữ hành vi**: refactor/chuyển đổi không được đổi API call, route, role gating, field name, validation — trừ khi được yêu cầu rõ.
3. **Tự kiểm chứng**: sau khi sửa frontend, chạy `cd frontend && npm run build` (phải xanh). Không chạy nhiều `npm run dev`/build song song (đụng thư mục `dist`).
4. **Một thay đổi rõ ràng / một PR nhỏ**; tránh nhiều người sửa cùng file.
5. **Đừng tự ý**: gỡ `bootstrap` CSS (cần QA hình ảnh trước), xóa file `.css` đang được import, hay commit/push khi chưa được yêu cầu.
6. Báo cáo trung thực: nếu build lỗi / bước bị bỏ qua → nói rõ kèm output.
