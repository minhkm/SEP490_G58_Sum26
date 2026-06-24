# Hướng dẫn chuyển UI sang Ant Design (antd) — cho cả team

Tài liệu này mô tả quy ước và các bước chuyển frontend từ Bootstrap sang **Ant Design v5**.
Chiến lược: **chuyển đổi tăng dần, song song** — antd chạy cạnh Bootstrap, chuyển từng page một, app luôn chạy được, gỡ Bootstrap khi xong hết.

## Đã thiết lập sẵn (Phase 0 — không cần làm lại)

- Đã cài: `antd` (**v6**, hỗ trợ React 19 sẵn — KHÔNG cần bản vá v5), `@ant-design/icons`, `dayjs`.
- [src/main.jsx](src/main.jsx) đã bọc app bằng `<ConfigProvider locale={viVN}><App>...</App></ConfigProvider>`.
- Helper phản hồi dùng chung: [src/utils/feedback.js](src/utils/feedback.js).
- Theme: **mặc định antd** (primary `#1677ff`). KHÔNG tự chỉnh token màu trong PR page; mọi tinh chỉnh theme tập trung ở `ConfigProvider`.
- Layout/Sidebar đã chuyển sang antd: [src/components/Sidebar.jsx](src/components/Sidebar.jsx), [src/components/AgencySidebar.jsx](src/components/AgencySidebar.jsx), [src/components/MasterLayout.jsx](src/components/MasterLayout.jsx), [src/components/AgencyLayout.jsx](src/components/AgencyLayout.jsx).
- Page mẫu tham khảo (table + search + tag + actions): [src/pages/VoyageListPage.jsx](src/pages/VoyageListPage.jsx).

## Component dùng chung (BẮT BUỘC tái sử dụng)

Đặt tại [src/components/common/](src/components/common/). Import gọn qua barrel:

```js
import { PageHeader, StatusTag, RowActions, notifySuccess, confirmDelete } from '../components/common';
```

| Component / helper | Dùng cho | Ví dụ |
|---|---|---|
| `PageHeader` | Tiêu đề trang: (tùy chọn) nút quay lại `onBack` + breadcrumb + tiêu đề lớn + nút hành động `extra` | List: `<PageHeader icon={<CompassOutlined/>} breadcrumb="Voyages" title="..." extra={<Button.../>} />` · Chi tiết/Thêm: `<PageHeader onBack={() => navigate('/vessels')} title="..." />` |
| `StatusTag` | Hiển thị trạng thái → `<Tag>` màu thống nhất (KHÔNG tự viết `getStatusColor` nữa) | `<StatusTag status={v.status} />` hoặc ghi đè `<StatusTag status={s} text="Đang hoạt động" color="green" />` |
| `RowActions` | Cụm nút Xem/Sửa/Xoá trên dòng bảng | `<RowActions onView={...} onEdit={...} onDelete={...} />` |
| `notify*` / `confirmDelete` / `confirmAction` | Toast & hộp xác nhận (từ `utils/feedback.js`) | `if (await confirmDelete({ content: name })) {...}` |

Page tham khảo dùng đủ bộ này: [src/pages/VoyageListPage.jsx](src/pages/VoyageListPage.jsx).
Nếu thiếu component chung cho một pattern lặp lại, hãy bổ sung vào thư mục này (kèm cập nhật bảng trên) thay vì copy-paste.

## Quy ước bắt buộc

1. **Một page = một PR.** Mỗi dev nhận trọn một nhóm page (xem phân công), chuyển + tự test rồi mở PR nhỏ. Tránh hai người sửa cùng một file.
2. **Icon**: import từ `@ant-design/icons`. Xóa import `lucide-react` trong file đã chuyển.
3. **Alert/confirm/toast**: chỉ dùng helper trong [src/utils/feedback.js](src/utils/feedback.js):
   - `notifySuccess / notifyError / notifyWarning / notifyInfo` thay toast tự viết & `Swal.fire`.
   - `await confirmDelete({...})` / `await confirmAction({...})` thay `window.confirm`.
   - KHÔNG thêm `Swal`, KHÔNG `window.confirm`, KHÔNG tự viết toast `div`.
4. **Không tự chế class CSS** cho thứ antd đã có (button/table/form/modal/tag...).
5. **Khi chuyển xong một page**: xóa import + dùng `react-bootstrap` trong page đó, và xóa file `.css` đồng hành **nếu** không còn class nào được dùng (kiểm tra class có dùng ở component khác không trước khi xóa).

## Bảng mapping (Bootstrap/HTML → antd)

| Hiện tại | Chuyển sang antd |
|---|---|
| `<button className="btn-primary">` | `<Button type="primary">` |
| icon-only button | `<Button type="text" icon={<EditOutlined/>} />` |
| `<Form>` + `<input>` thủ công | `<Form>` + `<Form.Item>` + `<Input>` (validation qua `rules`) |
| `<select>` thuần | `<Select>` |
| `<input type="date">` | `<DatePicker>` |
| `<table>` code tay | `<Table>` với `columns` + `dataSource` |
| modal tự viết | `<Modal>` |
| status badge `<span>` | `<Tag color="...">` |
| search input + filter `useMemo` | `<Input.Search>` (giữ filter hoặc dùng filter của Table) |
| toast / `Swal.fire` | `notify*` trong `utils/feedback.js` |
| `window.confirm` | `confirmDelete` / `confirmAction` |
| spinner tự viết | `<Spin>` / prop `loading` của `Table`/`Button` |

## Phân công Phase 2 (gợi ý theo domain)

- **Voyage**: `CreateVoyagePage`, `UpdateVoyageModal`, `AttendancePage` (VoyageListPage đã xong làm mẫu)
- **Vessel**: `VesselListPage`, `AddVesselPage`, `VesselDetailPage`
- **Cargo**: `CargoPage`, `AddCargoPage`, `CargoDetailPage`, `CargoTypePage`
- **Crew**: `CrewListPage`, `AddCrewPage`, `CrewProfilePage`, `CrewDashboard`
- **Dashboard/Khác**: `MasterDashboard`, `AgencyDashboard`, `EngineLogPage`, `SettingsPage`, `LoginPage`, `RegisterPage`, `LandingPage`

## Trạng thái hiện tại (đã hoàn tất chuyển đổi code)

✅ Toàn bộ ~20 page + 4 component layout/sidebar đã chuyển sang antd. Build (`npm run build`) xanh.
✅ Đã gỡ `react-bootstrap`, `lucide-react`, `sweetalert2` (không còn import nào).
⚠️ **Còn lại** (gói `bootstrap` + import CSS của nó vẫn giữ): một vài page (`LoginPage`, `MasterDashboard`) còn dùng class utility của Bootstrap (`d-flex`, `mb-3`, `text-center`...). Cần QA hình ảnh từng page rồi mới gỡ Bootstrap CSS.

## Phase 3 — Dọn dẹp cuối (cần QA hình ảnh trước)

1. Rà các class utility Bootstrap còn sót (`d-flex`, `row`, `col-*`, `mb-*`, `text-center`, `fw-*`...) trong các page — thay bằng antd props/inline style hoặc CSS riêng.
2. `npm uninstall bootstrap` và xóa `import 'bootstrap/dist/css/bootstrap.min.css'` trong [src/main.jsx](src/main.jsx).
3. Xóa các file `.css` page-level không còn dùng và rút gọn [src/index.css](src/index.css).
4. `npm run lint` và sửa import thừa.

## Kiểm tra trước khi mở PR

- `npm run dev` chạy không lỗi console (đặc biệt cảnh báo React 19/antd).
- Đăng nhập đủ role (Master, Agency, Crew, Admin) → sidebar hiện đúng menu.
- Bảng (sort/lọc/loading), form (validation/submit), modal, toast hiển thị đúng.
- File đã chuyển không còn import `lucide-react` / `react-bootstrap` / `sweetalert2`.
