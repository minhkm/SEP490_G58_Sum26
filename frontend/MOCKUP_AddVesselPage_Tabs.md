# Mockup — Chuyển trang "Thêm/Sửa Tàu" sang bố cục TAB ngang

> **Mục đích:** Tài liệu thiết kế để code lại UI của [src/pages/AddVesselPage.jsx](src/pages/AddVesselPage.jsx) ở một session khác.
> **Phạm vi:** CHỈ đổi cách **bố trí hiển thị** (layout). GIỮ NGUYÊN toàn bộ state, handler, validation, API call, field name, route. Không đổi hành vi.
> **Quyết định đã chốt với chủ dự án:**
> 1. Chia **4 tab**.
> 2. Kiểu tab **dạng thẻ (card)** — trông giống các tab của cửa sổ Properties trên Windows.
> 3. Mỗi tab có **dấu ✓ khi đã điền đủ trường bắt buộc**; khi bấm Lưu mà còn thiếu → **tự nhảy tới tab chứa lỗi**.

---

## 1. Vấn đề của UI hiện tại

Trang đang dùng layout **2 cột + nhiều Card xếp dọc** (`<Row gutter={24}>` với `Col lg={14}` bên trái, `Col lg={10}` bên phải, rồi thêm Card thiết bị trải ngang phía dưới). Kết quả: thông tin dàn trải, các khối không cân, phải cuộn dài, mắt nhìn bị lệch.

Các Card hiện có:
- **THÔNG TIN CƠ BẢN (SHIP)** — Tên tàu, IMO, Quốc tịch, Trạng thái.
- **THÔNG SỐ KỸ THUẬT & THIẾT BỊ** — Máy chính + Máy đèn + hạn mức an toàn.
- **SỨC CHỨA & TẢI TRỌNG** — Tải trọng/Thể tích Max, thanh trượt thủy thủ, danh sách khoang hàng.
- **Thiết bị của tàu** — bảng thiết bị + import Excel.

---

## 2. Ánh xạ 4 tab (giữ đúng thứ tự nhập liệu)

| Tab | key | Icon (đã import sẵn) | Gom từ Card hiện tại |
|-----|-----|----------------------|----------------------|
| ① Thông tin cơ bản | `basic` | `InfoCircleOutlined` | Card "THÔNG TIN CƠ BẢN" |
| ② Sức chứa & Khoang hàng | `capacity` | `InboxOutlined` | Card "SỨC CHỨA & TẢI TRỌNG" (gồm cả danh sách khoang) |
| ③ Động cơ & Thông số | `engine` | `SettingOutlined` | Card "THÔNG SỐ KỸ THUẬT" (Máy chính + Máy đèn) |
| ④ Thiết bị của tàu | `equipment` | `ToolOutlined` | Card "Thiết bị của tàu" (bảng + import Excel) |

> Nút **"Hủy bỏ" / "Lưu hồ sơ tàu"** nằm **NGOÀI** Tabs (footer cố định), luôn hiện ở mọi tab để lưu được từ bất kỳ tab nào.

---

## 3. Mockup ASCII

### 3.1. Tổng thể (đang ở tab ①)

```
┌────────────────────────────────────────────────────────────────────────┐
│  ←  Thêm Tàu Mới                                                         │
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐┌──────────────────┐┌──────────────┐┌──────────────┐ │
│  │ ⓘ Thông tin   ││ 📦 Sức chứa &    ││ ⚙ Động cơ &  ││ 🔧 Thiết bị  │ │
│  │   cơ bản       ││    Khoang hàng   ││    Thông số   ││    của tàu   │ │
│  └───────────────┘└──────────────────┘└──────────────┘└──────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  (nội dung tab ① — xem 3.2)                                        │ │
│  │                                                                    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                          [ Hủy bỏ ]  [ 💾 Lưu hồ sơ ]   │
└────────────────────────────────────────────────────────────────────────┘
```

Tab đang chọn nổi liền với panel bên dưới (đặc trưng `type="card"` của antd). Tab đã điền đủ trường bắt buộc hiện thêm ✓ xanh ở cuối nhãn:

```
┌──────────────────┐
│ 📦 Sức chứa &  ✓ │   ← đã hợp lệ
│    Khoang hàng   │
└──────────────────┘
```

### 3.2. Tab ① Thông tin cơ bản

```
┌───────────────────────────────────────────────────────────────────┐
│  Tên Tàu (Bắt buộc)              Mã số IMO (Bắt buộc)              │
│  ┌─────────────────────────┐     ┌─────────────────────────┐      │
│  │ Blue Atlantic Voyager   │     │ 1234567                 │      │
│  └─────────────────────────┘     └─────────────────────────┘      │
│                                                                    │
│  Quốc tịch (Flag)                Trạng thái hiện tại              │
│  ┌─────────────────────────┐     ┌─────────────────────────┐      │
│  │ Vietnam            ▼    │     │ Active             ▼    │      │
│  └─────────────────────────┘     └─────────────────────────┘      │
└───────────────────────────────────────────────────────────────────┘
```

### 3.3. Tab ② Sức chứa & Khoang hàng

```
┌───────────────────────────────────────────────────────────────────┐
│  Tải trọng Max (Tấn) (Bắt buộc)   Thể tích Max (m³) (Bắt buộc)     │
│  ┌───────────────────┐            ┌───────────────────┐           │
│  │ 50000             │            │ 75000             │           │
│  └───────────────────┘            └───────────────────┘           │
│                                                                    │
│  Số thủy thủ (Tối thiểu – Tối đa)                     10 – 25      │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●─────────────────────            │
│                                                                    │
│  Khoang chứa (Cargo Holds)                      [+ Thêm khoang]   │
│  ┌──────────────────────────────────────────────┐  [TRỐNG]  🗑    │
│  │ Tên khoang…            Sức chứa: [10000] m³   │                │
│  └──────────────────────────────────────────────┘                │
│  ⚠ Nếu tổng thể tích khoang > Thể tích Max → chặn khi Lưu         │
└───────────────────────────────────────────────────────────────────┘
```

### 3.4. Tab ③ Động cơ & Thông số

```
┌───────────────────────────────────────────────────────────────────┐
│  Máy chính  [YÊU CẦU]                                              │
│  Tên động cơ (Bắt buộc)           Trạng thái                       │
│  ┌────────────────────┐           ┌────────────────────┐          │
│  │ Wärtsilä 14RT      │           │ Hoạt động     ▼    │          │
│  └────────────────────┘           └────────────────────┘          │
│  ┌─ Hạn mức chỉ số an toàn (Bắt buộc) ────────────────────────────┐│
│  │  Fuel Oil Press.    Exhaust XL2     Cooling Water              ││
│  │  [ 6.0 ]            [ 420 ]         [ 75 ]                     ││
│  │  ── Thông số bổ sung (0)                   [+ Thêm thông số]   ││
│  └────────────────────────────────────────────────────────────────┘│
│  ───────────────────────────────────────────────────────────────  │
│  Máy đèn (Generator)                            [+ Thêm máy đèn]   │
│  Máy đèn #1                                                    🗑   │
│  ┌────────────────────┐           ┌────────────────────┐          │
│  │ Caterpillar C32    │           │ Hoạt động     ▼    │          │
│  └────────────────────┘           └────────────────────┘          │
│  ┌─ Hạn mức chỉ số an toàn (Bắt buộc) … (như trên) ──────────────┐│
│  └────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

### 3.5. Tab ④ Thiết bị của tàu

```
┌───────────────────────────────────────────────────────────────────┐
│  [⬇ Tải mẫu]   [⬆ Import Excel]                  [+ Thêm thiết bị] │
│  ┌───────────────────────────────────────────────────────────────┐│
│  │ Tên thiết bị*   Loại        Vị trí   SL*   Hạn dùng (ghi chú) 🗑││
│  │ [Áo phao…]      [Cứu sinh▼] [Boong▼] [20]  [12/2028]           ││
│  └───────────────────────────────────────────────────────────────┘│
│  (nếu trống → <Empty description="Chưa có thiết bị nào…" />)       │
└───────────────────────────────────────────────────────────────────┘
```

> Lưu ý: hiện tại nút "Tải mẫu / Import Excel / Thêm thiết bị" nằm trong `Card extra`. Khi chuyển vào tab, đặt chúng thành **thanh công cụ ở đầu nội dung tab** (không dùng `tabBarExtraContent` vì đó là global cho cả Tabs).

---

## 4. Hướng dẫn implement (antd v6)

### 4.1. Import bổ sung
```js
import { /* …đang có… */ Tabs } from 'antd';
import { /* …đang có… */ CheckCircleFilled } from '@ant-design/icons';
```

### 4.2. State tab hiện hành
```js
const [activeTab, setActiveTab] = useState('basic');
```

### 4.3. Tính hợp lệ từng tab (để hiện ✓) — suy ra từ `handleSubmit` hiện có, KHÔNG đổi luật
```js
const isImoValid = /^\d{7}$/.test(basicInfo.imoNumber);
const basicValid = Boolean(basicInfo.shipName) && isImoValid;

const totalHoldsVolume = holds.reduce((s, h) => s + (parseFloat(h.capacity) || 0), 0);
const holdsOverflow = capacity.maxVolume
  ? totalHoldsVolume > (parseFloat(capacity.maxVolume) || 0)
  : false;
const capacityValid = Boolean(capacity.maxWeight) && Boolean(capacity.maxVolume) && !holdsOverflow;

const fixedFilled = (params) =>
  params.filter((p) => p.fixed).every((p) => p.maxValue !== '' && p.maxValue !== null);
const engineValid =
  Boolean(mainEngine.engineName) &&
  fixedFilled(mainEngine.parameters) &&
  generatorEngines.every((g) => g.engineName && fixedFilled(g.parameters));

// Tab thiết bị là TÙY CHỌN: hợp lệ khi mỗi dòng đã điền thì có đủ tên + số lượng ≥ 1
const equipmentValid = shipEquipments.every(
  (e) => !e.equipmentName || (e.equipmentName.trim() && Number(e.quantity) >= 1)
);
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
```jsx
const tabItems = [
  { key: 'basic',     label: tabLabel(<InfoCircleOutlined />, 'Thông tin cơ bản', basicValid),        children: <Card variant="borderless">{/* JSX Basic Info */}</Card> },
  { key: 'capacity',  label: tabLabel(<InboxOutlined />, 'Sức chứa & Khoang hàng', capacityValid),    children: <Card variant="borderless">{/* JSX Capacity + Holds */}</Card> },
  { key: 'engine',    label: tabLabel(<SettingOutlined />, 'Động cơ & Thông số', engineValid),         children: <Card variant="borderless">{/* JSX Main + Generator engines */}</Card> },
  { key: 'equipment', label: tabLabel(<ToolOutlined />, 'Thiết bị của tàu', equipmentValid),           children: <Card variant="borderless">{/* Toolbar + JSX Equipment */}</Card> },
];

return (
  <AgencyLayout>
    <div style={{ padding: '24px 32px' }}>
      <Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        {isEditMode ? 'Cập nhật Thông tin Tàu' : 'Thêm Tàu Mới'}
      </Title>

      <Tabs
        type="card"
        size="large"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* Footer NGOÀI Tabs — luôn hiện */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <Button onClick={() => navigate(-1)}>Hủy bỏ</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
          Lưu hồ sơ tàu
        </Button>
      </div>
    </div>
  </AgencyLayout>
);
```

> Ghi chú antd v6: dùng `variant="borderless"` thay cho `bordered={false}` (đã đổi API). Nội dung `children` chính là JSX bên trong các Card cũ — **bê nguyên khối, không sửa field/handler**. Vì mỗi tab giờ chiếm full chiều rộng, bỏ bọc `<Row><Col lg={14/10}>` ngoài cùng; các `<Row gutter><Col sm={12}>` bên trong giữ nguyên để 2 field/hàng.

### 4.6. Tự nhảy tới tab lỗi trong `handleSubmit`
Thêm `setActiveTab('<key>')` NGAY TRƯỚC mỗi `notifyWarning(...) + return` tương ứng, **không đổi thông điệp/thứ tự kiểm tra**:

| Điều kiện lỗi hiện có | Thêm trước khi return |
|---|---|
| `!shipName || !imoNumber` | `setActiveTab('basic')` |
| IMO không đủ 7 số | `setActiveTab('basic')` |
| `!maxWeight || !maxVolume` | `setActiveTab('capacity')` |
| `!mainEngine.engineName` | `setActiveTab('engine')` |
| thiếu hạn mức máy chính | `setActiveTab('engine')` |
| máy đèn thiếu tên / hạn mức | `setActiveTab('engine')` |
| tổng thể tích khoang vượt Max | `setActiveTab('capacity')` |

---

## 5. Ràng buộc & kiểm thử (theo CLAUDE.md)

- **Không** thêm thư viện mới (`Tabs` có sẵn trong antd).
- **Không** đổi API call / field name / route / luật validation.
- Icon chỉ từ `@ant-design/icons` (đã kiểm: `CheckCircleFilled` tồn tại ở v6).
- Sau khi code: `cd frontend && npm run build` (phải **xanh**) và `npm run lint` (không **tăng** lỗi so với trước; vùng code mới phải sạch lint).
- Smoke thủ công: mở trang Thêm tàu & Sửa tàu, chuyển qua lại 4 tab, thử bấm Lưu khi thiếu trường ở tab ẩn → phải **tự nhảy tới đúng tab** và hiện cảnh báo; điền đủ → thấy ✓ trên tab; lưu thành công điều hướng về `/vessels`.

---

## 6. Checklist cho session code
- [ ] Import `Tabs` + `CheckCircleFilled`.
- [ ] Thêm state `activeTab`.
- [ ] Thêm các biến tính hợp lệ (mục 4.3) + helper `tabLabel` (4.4).
- [ ] Bê JSX 4 Card cũ vào `children` của 4 tab item; gỡ bọc `<Row><Col lg>` ngoài cùng; chuyển toolbar Excel của tab Thiết bị lên đầu nội dung tab.
- [ ] Thay khối `return` cũ bằng cấu trúc `Tabs` + footer (mục 4.5).
- [ ] Chèn `setActiveTab(...)` vào `handleSubmit` theo bảng 4.6.
- [ ] `npm run build` xanh + `npm run lint` không tăng lỗi.
- [ ] Smoke thủ công cả Add lẫn Edit.
