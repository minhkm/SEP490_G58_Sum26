# Mockup — Chuyển trang "Tạo Hải trình Mới" sang bố cục TAB ngang

> **Mục đích:** Tài liệu thiết kế để code lại UI của [src/pages/CreateVoyagePage.jsx](src/pages/CreateVoyagePage.jsx) ở một session khác.
> **Phạm vi:** CHỈ đổi cách **bố trí hiển thị** (layout). GIỮ NGUYÊN toàn bộ state, handler, validation, API call (`voyageService.createVoyage`), field name, route, các `useEffect` tính sức chứa/tổng hàng, logic auto-map chức danh (`mapPositionToRole`), import Excel vật tư y tế. Không đổi hành vi.
> **Phong cách:** giống [MOCKUP_AddVesselPage_Tabs.md](MOCKUP_AddVesselPage_Tabs.md) — tab **dạng thẻ (card)**, có **✓ khi tab đã hợp lệ**, và **tự nhảy tới tab chứa lỗi** khi bấm "Khởi tạo Hải trình".

---

## 1. Vấn đề của UI hiện tại

Trang dùng layout **2 cột** (`Col lg={16}` chứa 5 Card xếp dọc + `Col lg={8}` chứa Trạng thái & Bản đồ). Cột trái rất dài (Định danh → Tuyến đường → Lô hàng → Nhân sự → Vật tư y tế) phải cuộn nhiều; cột phải trống trải. Nhìn nặng và mất cân đối.

Các Card hiện có:
- **Thông tin Định danh** — Mã hải trình (auto), Tàu vận chuyển.
- **Chi tiết Tuyến đường** — Cảng đi → Cảng đến, Ngày khởi hành, Ngày đến.
- **Lô hàng Dự kiến** — danh sách cargo + Alert kiểm tra tải trọng/thể tích.
- **Nhân sự Dự kiến** — danh sách crew + auto-map chức danh.
- **Vật tư y tế** — bảng + Tải mẫu/Import Excel.
- *(cột phải)* **Trạng thái** (Draft) + **Bản đồ Tuyến đường** (placeholder).

---

## 2. Ánh xạ 4 tab

| Tab | key | Icon | Gom từ Card hiện tại |
|-----|-----|------|----------------------|
| ① Định danh & Tuyến đường | `route` | `NodeIndexOutlined` | "Thông tin Định danh" + "Chi tiết Tuyến đường" + **Bản đồ** (đưa xuống cuối tab này vì liên quan tuyến đường) |
| ② Lô hàng | `cargo` | `InboxOutlined` | "Lô hàng Dự kiến" (gồm Alert kiểm tra sức chứa) |
| ③ Nhân sự | `crew` | `TeamOutlined` | "Nhân sự Dự kiến" |
| ④ Vật tư y tế | `supplies` | `ToolOutlined` | "Vật tư y tế" (bảng + Excel) |

**Xử lý cột phải (Trạng thái/Bản đồ):**
- **Trạng thái "Bản nháp (Draft)"** → chuyển thành **banner `Alert` mảnh ngay dưới `PageHeader`** (luôn hiện, mọi tab). Gọn, không chiếm cả cột.
- **Bản đồ tuyến đường** → đưa vào **cuối tab ① (Tuyến đường)** vì nội dung gắn với cảng đi/đến.
- ⇒ Bỏ hẳn layout 2 cột `Row/Col lg={16}+{8}`, trang thành 1 cột full-width chứa Tabs.

> Nút **"Hủy" / "Lưu Bản nháp" / "Khởi tạo Hải trình"** hiện đang nằm trong `PageHeader extra` → **giữ nguyên ở đó** (đã cố định trên cùng, hợp lý cho mọi tab). Không cần footer riêng.

---

## 3. Mockup ASCII

### 3.1. Tổng thể (đang ở tab ①)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Voyages / New                                                         │
│  Tạo Hải trình Mới          [ Hủy ] [ Lưu Bản nháp ] [ Khởi tạo ►]    │
├──────────────────────────────────────────────────────────────────────┤
│  ⓘ Trạng thái: Bản nháp (Draft) — sẽ chuyển "Planning" sau khi tạo.   │
│  ┌────────────────────┐┌───────────┐┌───────────┐┌──────────────────┐ │
│  │ 🧭 Định danh &     ││ 📦 Lô hàng││ 👥 Nhân sự││ 🔧 Vật tư y tế  │ │
│  │    Tuyến đường     ││           ││           ││                  │ │
│  └────────────────────┘└───────────┘└───────────┘└──────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  (nội dung tab ① — xem 3.2)                                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Tab hợp lệ hiện thêm ✓ xanh cuối nhãn (vd sau khi chọn đủ tàu + cảng + ngày):
```
┌────────────────────┐
│ 🧭 Định danh &   ✓ │
│    Tuyến đường     │
└────────────────────┘
```

### 3.2. Tab ① Định danh & Tuyến đường

```
┌──────────────────────────────────────────────────────────────────────┐
│  Mã Hải trình (Tự động)          Tàu Vận chuyển *                     │
│  ┌────────────────────────┐      ┌────────────────────────┐          │
│  │ (Sẽ tạo tự động)       │      │ Chọn tàu…          ▼   │          │
│  └────────────────────────┘      └────────────────────────┘          │
│  ────────────────────────────────────────────────────────────────    │
│  Cảng đi *              →        Cảng đến *                           │
│  ┌────────────────┐              ┌────────────────┐                  │
│  │ 📍 Chọn cảng…  │              │ 📍 Chọn cảng…  │                  │
│  └────────────────┘              └────────────────┘                  │
│  Ngày Khởi hành *                Ngày Đến *                          │
│  ┌────────────────┐              ┌────────────────┐                  │
│  │ 2026-08-10  📅 │              │ 2026-08-18  📅 │                  │
│  └────────────────┘              └────────────────┘                  │
│  ┌─ Bản đồ Tuyến đường Dự kiến ───────────────────────────────────┐  │
│  │  (Empty) Bản đồ sẽ hiển thị sau khi chọn Cảng đi và Cảng đến.  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3. Tab ② Lô hàng

```
┌──────────────────────────────────────────────────────────────────────┐
│  Lô hàng Dự kiến                                    [+ Thêm Lô hàng]  │
│  ┌─ Kiểm tra tải trọng / thể tích (Alert theo màu) ─────────────────┐ │
│  │  Weight: 12000 / 50000 MT      Volume: 30000 / 75000 CBM         │ │  (đỏ nếu vượt)
│  └──────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────┐  🗑                 │
│  │ Chọn Lô hàng…                            ▼   │                     │
│  └──────────────────────────────────────────────┘                     │
│  (trống → Empty: "Chưa có lô hàng… có thể thêm sau khi lưu")          │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.4. Tab ③ Nhân sự

```
┌──────────────────────────────────────────────────────────────────────┐
│  Nhân sự Dự kiến (Voyage Crew)                      [+ Thêm Nhân sự]  │
│  ┌────────────────────────────┐ ┌──────────────────────┐ 🗑          │
│  │ Chọn thủy thủ…        ▼    │ │ Chức danh…       ▼   │            │
│  └────────────────────────────┘ └──────────────────────┘            │
│  ⓘ Bắt buộc đủ: Thuyền trưởng, Đại phó, Sĩ quan boong, Máy trưởng.   │
│     Số nhân sự phải trong [minCrew, maxCrew] của tàu đã chọn.        │
│  (trống → Empty: "Chưa phân bổ nhân sự…")                            │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.5. Tab ④ Vật tư y tế

```
┌──────────────────────────────────────────────────────────────────────┐
│  Vật tư y tế (Medical Supplies)   [⬇ Tải mẫu][⬆ Import Excel][+ Thêm]│
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Tên thuốc/vật tư *   │ Số lượng * │ Ghi chú hạn dùng │ Thao tác   │ │
│  │ [Paracetamol…]       │ [100]      │ [06/2027]        │    🗑       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  (trống → Empty: "Chưa có vật tư y tế nào.")                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Hướng dẫn implement (antd v6)

### 4.1. Import bổ sung
```js
import { /* …đang có… */ Tabs } from 'antd';
import { /* …đang có… */ CheckCircleFilled } from '@ant-design/icons';
```

### 4.2. State tab hiện hành
```js
const [activeTab, setActiveTab] = useState('route');
```

### 4.3. Tính hợp lệ từng tab (để hiện ✓) — suy ra từ `handleSubmit`, KHÔNG đổi luật
```js
// Tab ① Tuyến đường
const routeValid =
  Boolean(shipId) &&
  Boolean(routeInfo.departurePort) &&
  Boolean(routeInfo.destinationPort) &&
  routeInfo.departurePort !== routeInfo.destinationPort &&
  Boolean(routeInfo.departureDate) &&
  Boolean(routeInfo.arrivalDate);

// Tab ② Lô hàng: có ≥1 lô hợp lệ và KHÔNG vượt sức chứa
const validCargoCount = cargoList.filter((c) => c.cargoId).length;
const cargoValid = validCargoCount > 0 && !overCapacity; // overCapacity đã có sẵn

// Tab ③ Nhân sự: đủ số lượng theo min/max + đủ 4 chức danh bắt buộc
const validCrews = crewList.filter((c) => c.crewId && c.role);
const REQUIRED_ROLE_IDS = ['Captain (CAPT)', 'Đại phó (Chief Officer)', 'Sĩ quan boong (Deck Officer)', 'Máy trưởng (Chief Engineer)'];
const selectedRoleIds = crewList.map((c) => c.role);
const crewCountOk =
  selectedShipCapacity.minCrew === 0 ||
  (validCrews.length >= selectedShipCapacity.minCrew && validCrews.length <= selectedShipCapacity.maxCrew);
const crewValid = crewCountOk && REQUIRED_ROLE_IDS.every((r) => selectedRoleIds.includes(r));

// Tab ④ Vật tư y tế: mỗi dòng phải có tên + số lượng ≥ 1 (danh sách rỗng = hợp lệ)
const suppliesValid = equipmentList.every((e) => e.name && e.name.trim() && e.quantity >= 1);
```

### 4.4. Helper nhãn tab kèm ✓
```js
const tabLabel = (icon, text, valid) => (
  <Space size={6}>
    {icon}
    <span>{text}</span>
    {valid && <CheckCircleFilled style={{ color: '#52c41a' }} />}
  </Space>
);
```

### 4.5. Cấu trúc render
Bỏ layout 2 cột. Đưa "Trạng thái Draft" thành `Alert` dưới `PageHeader`; đưa "Bản đồ" vào cuối tab ①.
```jsx
const tabItems = [
  { key: 'route',    label: tabLabel(<NodeIndexOutlined />, 'Định danh & Tuyến đường', routeValid), children: <Card variant="borderless">{/* Identity + Route + Map */}</Card> },
  { key: 'cargo',    label: tabLabel(<InboxOutlined />, 'Lô hàng', cargoValid),                     children: <Card variant="borderless">{/* Cargo + Alert sức chứa */}</Card> },
  { key: 'crew',     label: tabLabel(<TeamOutlined />, 'Nhân sự', crewValid),                       children: <Card variant="borderless">{/* Crew list */}</Card> },
  { key: 'supplies', label: tabLabel(<ToolOutlined />, 'Vật tư y tế', suppliesValid),               children: <Card variant="borderless">{/* Equipment table + Excel */}</Card> },
];

return (
  <Layout>
    <div style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
      <PageHeader
        icon={<NodeIndexOutlined />}
        breadcrumb="Voyages / New"
        title="Tạo Hải trình Mới"
        extra={/* …giữ nguyên 3 nút Hủy / Lưu Bản nháp / Khởi tạo Hải trình… */}
      />

      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message='Trạng thái: Bản nháp (Draft) — hải trình sẽ chuyển "Đang lên kế hoạch" (Planning) sau khi khởi tạo.'
      />

      {/* Có thể giữ <Form layout="vertical"> bọc ngoài Tabs để các Form.Item vẫn render label đẹp */}
      <Form layout="vertical">
        <Tabs type="card" size="large" activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>
    </div>
  </Layout>
);
```
> Ghi chú: các trường ở đây **không dùng `rules` của Form** (validate thủ công trong `handleSubmit` + `notifyWarning`), giá trị nằm trong React state → tab ẩn bị unmount vẫn an toàn, **không bắt buộc `forceRender`**. Vẫn có thể bật `forceRender: true` nếu muốn giữ DOM (tuỳ chọn). Dùng `variant="borderless"` thay `bordered={false}`.

### 4.6. Tự nhảy tới tab lỗi trong `handleSubmit`
Thêm `setActiveTab('<key>')` NGAY TRƯỚC mỗi `notifyWarning(...) + return`, **không đổi thông điệp/thứ tự**:

| Điều kiện lỗi hiện có | Thêm trước khi return |
|---|---|
| `!shipId` | `setActiveTab('route')` |
| Cảng đi === Cảng đến | `setActiveTab('route')` |
| thiếu cảng đi / cảng đến | `setActiveTab('route')` |
| thiếu ngày khởi hành / ngày đến | `setActiveTab('route')` |
| tổng trọng lượng vượt `maxWeight` | `setActiveTab('cargo')` |
| tổng thể tích vượt `maxVolume` | `setActiveTab('cargo')` |
| không có lô hàng hợp lệ | `setActiveTab('cargo')` |
| số nhân sự ngoài [min,max] | `setActiveTab('crew')` |
| thiếu chức danh bắt buộc | `setActiveTab('crew')` |
| vật tư y tế thiếu tên/số lượng | `setActiveTab('supplies')` |

---

## 5. Ràng buộc & kiểm thử (theo CLAUDE.md)

- **Không** thêm thư viện mới (`Tabs` có sẵn).
- **Không** đổi API call / field name / route / luật validation / các `useEffect` tính toán / `mapPositionToRole` / import Excel.
- Icon chỉ từ `@ant-design/icons` (`CheckCircleFilled` có ở v6).
- Chú ý: trang phục vụ cả role Admin/Agency (`AgencyLayout`) lẫn Master (`MasterLayout`) — **giữ nguyên** logic chọn `Layout`.
- Sau khi code: `cd frontend && npm run build` (xanh) + `npm run lint` (không tăng lỗi; vùng mới sạch lint).
- Smoke thủ công: chọn tàu → tab ① thấy ✓; thêm lô hàng vượt tải → Alert đỏ + tab ② không ✓ + bấm Khởi tạo phải **nhảy tab ②**; thiếu chức danh bắt buộc → **nhảy tab ③**; vật tư thiếu số lượng → **nhảy tab ④**; đủ hết → tạo thành công về `/voyages`. Kiểm tra với cả tài khoản Admin/Agency và Master.

---

## 6. Checklist cho session code
- [ ] Import `Tabs` + `CheckCircleFilled`.
- [ ] Thêm state `activeTab` + các biến `*Valid` (mục 4.3) + helper `tabLabel`.
- [ ] Gỡ layout `<Row gutter={24}><Col lg={16/8}>`; chuyển "Trạng thái Draft" thành `Alert` dưới PageHeader; chuyển "Bản đồ" vào cuối tab ①.
- [ ] Gom 5 Card vào 4 `tabItems`; chuyển toolbar Excel của tab ④ giữ nguyên trong nội dung tab.
- [ ] Đặt `<Tabs>` (trong `<Form>` nếu muốn giữ label); giữ nguyên 3 nút ở `PageHeader extra`.
- [ ] Chèn `setActiveTab(...)` vào `handleSubmit` theo bảng 4.6.
- [ ] `npm run build` xanh + `npm run lint` không tăng lỗi.
- [ ] Smoke thủ công với cả Admin/Agency và Master.
