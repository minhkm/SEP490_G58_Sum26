# Mockup — Chuyển trang "Thêm/Sửa Thủy thủ" sang bố cục TAB ngang

> **Mục đích:** Tài liệu thiết kế để code lại UI của [src/pages/AddCrewPage.jsx](src/pages/AddCrewPage.jsx) ở một session khác.
> **Phạm vi:** CHỈ đổi cách **bố trí hiển thị** (layout). GIỮ NGUYÊN toàn bộ `Form`, `rules`, handler, validation, API call, field name, route, logic khóa role (`isLockedRole`), auto-gen mật khẩu. Không đổi hành vi.
> **Phong cách:** giống [MOCKUP_AddVesselPage_Tabs.md](MOCKUP_AddVesselPage_Tabs.md) — tab **dạng thẻ (card)**, có **✓ khi tab đã điền đủ trường bắt buộc**, và **tự nhảy tới tab chứa lỗi** khi bấm Lưu.

---

## 1. Vấn đề của UI hiện tại

Trang dùng layout **2 cột + 3 Card** (`Col lg={12}` x2 phía trên, `Col span={24}` phía dưới). Card "Tài khoản Đăng nhập" nằm trải ngang bên dưới, lệch nhịp với 2 card trên → nhìn không cân, phải nhìn nhảy mắt qua lại.

Các Card hiện có:
- **Thông tin Cá nhân** — Họ tên, CCCD, Số điện thoại.
- **Phân công Công tác** — Bộ phận, Chức vụ, Quyền hệ thống (role), Trạng thái.
- **Tài khoản Đăng nhập** — Email (login), Mật khẩu (edit) / Alert bảo mật (thêm mới).

---

## 2. Ánh xạ 3 tab

| Tab | key | Icon | Gom từ Card hiện tại |
|-----|-----|------|----------------------|
| ① Thông tin cá nhân | `personal` | `TeamOutlined` | Card "Thông tin Cá nhân" (fullName, cccd, phone) |
| ② Phân công công tác | `assignment` | `SolutionOutlined` *(hoặc `TeamOutlined`)* | Card "Phân công Công tác" (department, position, role, status) |
| ③ Tài khoản đăng nhập | `account` | `WarningOutlined` (giữ màu đỏ như hiện tại) | Card "Tài khoản Đăng nhập" (email, password/alert) |

> Nút **"Hủy bỏ" / "Khởi tạo Thủy thủ" (hoặc "Lưu thay đổi")** nằm **NGOÀI** Tabs (footer cố định), luôn hiện ở mọi tab. Vẫn là `htmlType="submit"` của `Form`.

---

## 3. Mockup ASCII

### 3.1. Tổng thể (đang ở tab ①)

```
┌─────────────────────────────────────────────────────────────┐
│  ←  Thêm Thủy thủ mới                                        │
│     Điền thông tin hồ sơ và tài khoản đăng nhập             │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐┌───────────────────┐┌──────────────────┐ │
│  │ 👤 Thông tin  ││ 📋 Phân công      ││ ⚠ Tài khoản     │ │
│  │    cá nhân     ││    công tác       ││    đăng nhập    │ │
│  └───────────────┘└───────────────────┘└──────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  (nội dung tab ① — xem 3.2)                             ││
│  └─────────────────────────────────────────────────────────┘│
│                              [ Hủy bỏ ]  [ Khởi tạo Thủy thủ ]│
└─────────────────────────────────────────────────────────────┘
```

Tab đã điền đủ trường bắt buộc hiện thêm ✓ xanh cuối nhãn (vd tab ① khi đã có Họ tên hợp lệ):
```
┌───────────────┐
│ 👤 Thông tin ✓│
│    cá nhân     │
└───────────────┘
```

### 3.2. Tab ① Thông tin cá nhân

```
┌─────────────────────────────────────────────────────────────┐
│  Họ và Tên *                                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Nguyễn Văn A                                          │  │  (disabled khi Sửa)
│  └───────────────────────────────────────────────────────┘  │
│  CCCD                          Số điện thoại                 │
│  ┌─────────────────────┐      ┌─────────────────────┐       │
│  │ 0xxxxxxxxxxx        │      │ 0xxxxxxxxx          │       │  (CCCD disabled khi Sửa)
│  └─────────────────────┘      └─────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 3.3. Tab ② Phân công công tác

```
┌─────────────────────────────────────────────────────────────┐
│  Bộ phận                       Chức vụ (Position)            │
│  ┌─────────────────────┐      ┌─────────────────────┐       │
│  │ Bộ phận Boong  ▼    │      │ Máy trưởng          │       │  (khóa khi role = Master/ChiefOfficer)
│  └─────────────────────┘      └─────────────────────┘       │
│  Quyền hệ thống (Role)         Trạng thái                   │
│  ┌─────────────────────┐      ┌─────────────────────┐       │
│  │ Thủy thủ (Sailor) ▼ │      │ Sẵn sàng       ▼    │       │
│  └─────────────────────┘      └─────────────────────┘       │
│  ⓘ Chọn Master/Chief Officer sẽ tự set Bộ phận = None &     │
│     khóa Position (giữ nguyên logic handleRoleChange)        │
└─────────────────────────────────────────────────────────────┘
```

### 3.4. Tab ③ Tài khoản đăng nhập

```
┌─────────────────────────────────────────────────────────────┐
│  Email (Tên đăng nhập) *                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ abc@cargoops.vn                                       │  │  (disabled khi Sửa)
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  — Khi THÊM MỚI:                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⓘ Bảo mật tài khoản: mật khẩu tự sinh & gửi qua Email │  │
│  │   Thủy thủ bắt buộc đổi mật khẩu ở lần đăng nhập đầu.  │  │
│  └───────────────────────────────────────────────────────┘  │
│  — Khi SỬA: hiện ô "Mật khẩu mới (bỏ trống nếu không đổi)"   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Hướng dẫn implement (antd v6 + Form)

### 4.1. Import bổ sung
```js
import { /* …đang có… */ Tabs } from 'antd';
import { /* …đang có… */ CheckCircleFilled, SolutionOutlined } from '@ant-design/icons';
```

### 4.2. State tab + theo dõi giá trị Form để hiện ✓
Vì trang dùng `Form`, để tính ✓ theo thời gian thực nên dùng `Form.useWatch`:
```js
const [activeTab, setActiveTab] = useState('personal');

const fullName = Form.useWatch('fullName', form);
const email = Form.useWatch('email', form);

const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
const personalValid = Boolean(fullName && fullName.trim());
const accountValid = Boolean(email) && emailOk;
// Tab ② không có trường bắt buộc (role/department luôn có default) → coi là hợp lệ:
const assignmentValid = true;
```

### 4.3. Helper nhãn tab kèm ✓
```js
const tabLabel = (icon, text, valid) => (
  <Space size={6}>
    {icon}
    <span>{text}</span>
    {valid && <CheckCircleFilled style={{ color: '#52c41a' }} />}
  </Space>
);
```

### 4.4. ⚠️ ĐIỂM QUAN TRỌNG: giữ MỌI tab luôn mount
`Form` cần thu thập giá trị của **tất cả** field, kể cả tab chưa mở, và validation phải chạy được xuyên tab. Vì vậy đặt `forceRender: true` cho từng tab item (hoặc dùng prop `destroyInactiveTabPane={false}` + forceRender). **Không** để tab ẩn bị unmount, nếu không `email`/`fullName` ở tab khác sẽ không được validate/submit.

### 4.5. Cấu trúc render — Tabs NẰM TRONG `Form`
```jsx
const tabItems = [
  { key: 'personal',   forceRender: true, label: tabLabel(<TeamOutlined />, 'Thông tin cá nhân', personalValid),   children: <Card variant="borderless">{/* JSX fullName + cccd + phone */}</Card> },
  { key: 'assignment', forceRender: true, label: tabLabel(<SolutionOutlined />, 'Phân công công tác', assignmentValid), children: <Card variant="borderless">{/* JSX department + position + role + status */}</Card> },
  { key: 'account',    forceRender: true, label: tabLabel(<WarningOutlined style={{ color: '#dc2626' }} />, 'Tài khoản đăng nhập', accountValid), children: <Card variant="borderless">{/* JSX email + password/alert */}</Card> },
];

return (
  <AgencyLayout>
    <div style={{ padding: '24px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <PageHeader
        onBack={() => navigate('/crews')}
        title={isEditMode ? 'Cập nhật Thủy thủ' : 'Thêm Thủy thủ mới'}
        breadcrumb="Điền thông tin hồ sơ và tài khoản đăng nhập"
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} onFinishFailed={handleFinishFailed} initialValues={{ /* …giữ nguyên… */ }}>
        <Tabs type="card" size="large" activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        <Space style={{ justifyContent: 'flex-end', width: '100%', marginTop: 16 }}>
          <Button onClick={() => navigate('/crews')}>Hủy bỏ</Button>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
            {isEditMode ? 'Lưu thay đổi' : 'Khởi tạo Thủy thủ'}
          </Button>
        </Space>
      </Form>
    </div>
  </AgencyLayout>
);
```
> Ghi chú antd v6: dùng `variant="borderless"` thay `bordered={false}`. Bê nguyên JSX các `Form.Item` từ Card cũ vào `children` — **không** đổi `name`, `rules`, `disabled`, `readOnly`, `onChange={handleRoleChange}`.

### 4.6. Tự nhảy tới tab lỗi

**(a) Lỗi từ `rules` của Form** — thêm handler `onFinishFailed`:
```js
const FIELD_TO_TAB = {
  fullName: 'personal',
  email: 'account',
  // các field khác nếu sau này thêm rule
};
const handleFinishFailed = ({ errorFields }) => {
  if (!errorFields?.length) return;
  const firstField = errorFields[0].name[0];
  const tab = FIELD_TO_TAB[firstField];
  if (tab) setActiveTab(tab);
};
```

**(b) Lỗi kiểm tra thủ công trong `handleSubmit`** (CCCD/SĐT) — 2 trường này ở tab ①, nên trước mỗi `notifyError(...) + return` liên quan CCCD/phone, thêm:
```js
setActiveTab('personal');
```
Áp dụng cho cả 2 nhánh: sai định dạng CCCD và sai định dạng số điện thoại. Giữ nguyên nội dung thông báo.

---

## 5. Ràng buộc & kiểm thử (theo CLAUDE.md)

- **Không** thêm thư viện mới (`Tabs`, `Form.useWatch` đều có sẵn trong antd).
- **Không** đổi API call / field name / route / rule validation / logic khóa role.
- Icon chỉ từ `@ant-design/icons` (`CheckCircleFilled`, `SolutionOutlined` đều có ở v6).
- Sau khi code: `cd frontend && npm run build` (xanh) + `npm run lint` (không tăng lỗi; vùng mới sạch lint).
- Smoke thủ công: mở **Thêm** và **Sửa** thủy thủ; chuyển 3 tab; đổi role Master/Chief Officer xem Position/Department có khóa đúng; bỏ trống Họ tên → bấm Lưu phải **nhảy về tab ①**; bỏ trống/nhập sai Email → nhảy về **tab ③**; nhập CCCD/SĐT sai định dạng → nhảy về **tab ①** + báo lỗi; điền đủ → thấy ✓ trên tab; lưu xong về `/crews`.

---

## 6. Checklist cho session code
- [ ] Import `Tabs` + `CheckCircleFilled` + `SolutionOutlined`.
- [ ] Thêm state `activeTab` + `Form.useWatch` cho `fullName`, `email` + biến `*Valid`.
- [ ] Thêm helper `tabLabel`.
- [ ] Bọc 3 Card cũ vào `tabItems` với **`forceRender: true`** từng item; gỡ layout `<Row><Col lg={12/24}>` ngoài cùng.
- [ ] Đặt `<Tabs>` BÊN TRONG `<Form>`; footer nút ở ngoài Tabs nhưng vẫn trong Form.
- [ ] Thêm `onFinishFailed={handleFinishFailed}` + map field→tab; chèn `setActiveTab('personal')` vào 2 nhánh CCCD/phone trong `handleSubmit`.
- [ ] `npm run build` xanh + `npm run lint` không tăng lỗi.
- [ ] Smoke thủ công cả Add lẫn Edit (đặc biệt logic khóa role).
