# User Guide: CargoOps (Vessel Voyage and Cargo Operations Management System - VVCOMS)

CargoOps is a centralized maritime operations platform that unifies vessel operations, voyage planning, cargo handling, crew coordination and incident reporting into a single system - replacing the fragmented use of paper records, spreadsheets and e-mail.

The system serves 8 user roles across 3 dashboards: 
* **Agency Dashboard** (Admin, Agency) for shore-based fleet administration.
* **Master Dashboard** (Master, ChiefOfficer) for voyage command.
* **Crew Dashboard** (DeckOfficer, Sailor, EngineOfficer, EngineCrew) for day-to-day watch operations. 

After signing in, each user is automatically routed to the dashboard that matches their role.

The guide below covers representative workflows in detail. All illustrate the system's core interaction pattern - a subordinate role creates/submits a request, and the responsible senior role reviews, approves, rejects, or escalates it - a pattern that recurs across the other features not covered in detail here.

*[Insert screenshot: Figure 0 - Overview diagram of the system's feature groups / roles (a swimlane diagram, if available, can be reused here)]*

---

## 3.2 Workflow 1 – Vessel Registration (Admin)

This workflow describes how the Admin registers a new vessel in the system before it can be assigned to any voyage.
* **Admin** – the only role that can create, edit or delete vessel records.

**Workflow diagram**
*[Insert screenshot: Figure 19 - Vessel Registration workflow diagram]*

### Step-by-step guide

**Part A - Add a vessel**
* **Step 1.** Log in as Admin, go to `Quản lý tàu` → `Thêm tàu` (Vessel Management → Add Vessel).
* **Step 2.** Enter the vessel's basic information (name, IMO number, flag), capacity (deadweight/volume, minimum/maximum crew count), main engine, generator, and cargo holds.
* **Step 3.** Click “Lưu” (Save). The system confirms with “Tạo tàu thành công”.

**Part B - Edit, delete and manage equipment**
* **Step 4.** Open a vessel record and click “Sửa” (Edit) to update any field, or “Xóa” (Delete) to remove the vessel.
* **Step 5.** To register onboard equipment, add one row per item with a name and a quantity of at least 1.

### Common error messages

| Message | Cause / Resolution |
| :--- | :--- |
| `Danh sách thiết bị không được để trống` | At least one equipment item is required |
| `Tên thiết bị và số lượng là bắt buộc` | Enter both a name and a quantity ≥ 1 for every item |

---

## 3.3 Workflow 2 – Voyage Lifecycle Management (Master / Chief Officer)

This workflow describes how the Master (with the Chief Officer handling attendance, cargo and route tasks) drives a voyage through its full lifecycle, subject to the system's stage-gate conditions. This is the central command flow that the Master Dashboard is built around.
* **Master** – owns overall voyage command and the Underway/Discharged/Completed transitions.
* **Chief Officer** – handles attendance, cargo loading/unloading and route submission that feed into these transitions.

**Workflow diagram**
*[Insert screenshot: Figure 25 - Voyage lifecycle state diagram]*

The voyage moves through seven states in order: `Planning` → `Loading/Loaded` → `Underway` → `Arrived/Discharge` → `Discharged` → `Homeward Bounding` → `Completed`. Each transition is gated:

| Target state | Required beforehand |
| :--- | :--- |
| **Underway** | Full attendance taken + route Approved (Section 3.2) + cargo loading complete |
| **Discharged** | Every parcel unloaded |
| **Homeward Bounding** | Full “end of voyage” attendance taken |
| **Cancelled** | Only while still in Planning |

### Step-by-step guide

**Part A - Take attendance (precondition for Underway and for Homeward Bounding)**
* **Step 1.** Open the voyage and go to `Điểm danh` (Attendance).
* **Step 2.** Select the attendance type: `Trước khởi hành` (Pre-departure) / `Hằng ngày` (Daily, pick a date) / `Kết thúc chuyến` (End of voyage).
* **Step 3.** Mark each crew member `Có mặt` (Present) or `Vắng` (Absent), then click “Lưu”. The system confirms with “Lưu điểm danh thành công”.

> [!NOTE]
> A full “Pre-departure” attendance automatically raises the full-crew flag required to move the voyage to Underway.

**Part B - Load and unload cargo**
* **Step 4.** From the voyage's cargo section, assign each parcel to a hold and mark it “đã xếp” (loaded); the system updates hold capacity and logs a LOAD operation.
* **Step 5.** On arrival, mark each parcel “đã dỡ” (unloaded), logging an UNLOAD operation; once every parcel in a shipment is unloaded, the shipment status becomes “Đã giao thành công”.

> [!NOTE]
> Only the Master or Chief Officer can update unloading; other roles get “Chỉ Thuyền trưởng hoặc Đại phó được cập nhật dỡ hàng”.

**Part C - Advance the voyage status**
* **Step 6.** Once attendance, route approval and cargo loading are all satisfied, advance the voyage status to Underway.
* **Step 7.** Continue advancing through `Arrived/Discharge` → `Discharged` → `Homeward Bounding` → `Completed` as each stage's conditions are met.

### Common error messages

| Message | Cause / Resolution |
| :--- | :--- |
| `…chưa điểm danh hoặc nhân sự chưa đủ…` | Complete a full pre-departure attendance first |
| `Lộ trình chưa được phê duyệt…` | Get the route approved first (Section 3.2) |
| `Chưa bốc xếp hàng hóa xong…` | Finish loading all cargo first |
| `Chưa dỡ hết hàng hóa…` | Every parcel must be unloaded before Discharged |
| `Chưa hoàn thành điểm danh 'Kết thúc chuyến đi'…` | Complete the end-of-voyage attendance first |
| `Không thể hủy hải trình khi đã bắt đầu làm hàng hoặc di chuyển!` | A voyage can only be cancelled while still Planning |

---

## 3.4 Workflow 3 – Route Planning & Approval

This workflow describes how the Chief Officer drafts the route for a voyage that has finished loading, and how the Master approves the route before the voyage can move to Underway status.
* **Chief Officer (ChiefOfficer)** – drafts and submits the route for approval once the vessel status is Loaded.
* **Master** – reviews and approves the route; this is a mandatory precondition for moving the voyage to Underway.

**Workflow diagram**
*[Insert screenshot: Figure 1 - Route Planning & Approval workflow diagram]*

### Step-by-step guide

**Part A - Chief Officer: draft and submit the route**
* **Step 1.** Log in as Chief Officer, open a voyage that is currently “Loaded”, and go to `Route Planner` (Lộ trình).
* **Step 2.** Draw the intended waypoints on the map.
* **Step 3.** Click “Gửi duyệt” (Submit for approval). The route status changes to “Pending” and the system e-mails the Master.

> [!NOTE]
> The route can only be edited/submitted while the vessel is Loaded and the route is still in draft; once submitted or approved, the system rejects further edits with “Đại phó chỉ được chỉnh sửa/gửi duyệt lộ trình khi trạng thái tàu là Loaded!”.

**Part B - Master: review and approve**
* **Step 4.** Log in as Master and open the pending route.
* **Step 5.** Click “Phê duyệt” (Approve). The route status becomes “Approved” - a mandatory precondition for moving the voyage to Underway.

### Common error messages

| Message | Cause / Resolution |
| :--- | :--- |
| `Đại phó chỉ được chỉnh sửa/gửi duyệt lộ trình khi trạng thái tàu là Loaded!` | The route can only be drafted/submitted once cargo loading is complete |
| `Lộ trình đã được gửi duyệt hoặc phê duyệt, không thể chỉnh sửa!` | The route is locked once submitted; only a draft route can still be edited |

---

## 3.5 Workflow 4 – Shift Scheduling (Deck Officer / Engine Officer)

This workflow describes how the Deck Officer and Engine Officer schedule watch shifts for crew members in their own department.
* **Deck Officer (boong) / Engine Officer (máy)** – each schedules shifts only for subordinate crew in their own department.

**Workflow diagram**
*[Insert screenshot: Figure 33 - Shift scheduling workflow diagram]*

### Step-by-step guide

**Part A - Create shifts for a day**
* **Step 1.** Log in as Deck Officer or Engine Officer, go to `Quản lý ca trực` (Shift Management), and select a date.
*[Insert screenshot: Figure 34 - Shift management screen, date selected]*
* **Step 2.** For each of the six 4-hour shifts, assign a subordinate sailor/mechanic from the same department and a watch position.
*[Insert screenshot: Figure 35 - Shift assignment form]*
* **Step 3.** Click “Lưu”. The system confirms with “Đã tạo N ca trực.”
*[Insert screenshot: Figure 36 - Day's shift roster saved]*

**Part B - Edit or cancel a shift**
* **Step 4.** Open a shift that has not started yet and edit or cancel it as needed.
*[Insert screenshot: Figure 37 - Editing an upcoming shift]*

### Common error messages

| Message | Cause / Resolution |
| :--- | :--- |
| `Chỉ sĩ quan boong/máy được tạo ca trực.` | Requires the DeckOfficer/EngineOfficer role |
| `Không thể tạo ca đã qua giờ (…)` | Only future shifts can be scheduled |
| `Chỉ được gán thủy thủ/thợ máy cấp dưới cùng bộ phận X.` | The assignee must be a subordinate in the same department |
| `<tên> đã có ca trùng giờ (…)` | That person already has an overlapping shift |
| `<tên> đã đủ 2 ca trong ngày.` | Each crew member may have at most 2 shifts per day |
| `Không thể sửa/hủy ca đã bắt đầu hoặc đã kết thúc.` | Only a shift that has not started can be edited/cancelled |

---

## 3.6 Workflow 5 – Shift Handover & Takeover (Watch-Standing Crew)

This workflow describes how a crew member finishing a watch hands it over, and how the next crew member takes it over, ensuring continuous coverage.
* **Any crew member currently on a scheduled watch.**

**Workflow diagram**
*[Insert screenshot: Figure 38 - Shift handover / takeover workflow diagram]*

### Step-by-step guide

**Part A - Hand over the shift (outgoing crew)**
* **Step 1.** Within 5 minutes of the shift's end time, open your current shift and click “Bàn giao” (Hand over).
*[Insert screenshot: Figure 39 - Hand-over screen]*
* **Step 2.** Enter handover notes describing the current condition/status.
*[Insert screenshot: Figure 40 - Handover notes form]*

**Part B - Take over the shift (incoming crew)**
* **Step 3.** The crew member starting the next shift opens their own shift and clicks “Nhận ca” (Take over).
*[Insert screenshot: Figure 41 - Take-over confirmation]*

> [!NOTE]
> A handover or takeover completed more than 30 minutes late is automatically flagged “trễ” (late).

### Common error messages

| Message | Cause / Resolution |
| :--- | :--- |
| `Chưa có ca kế tiếp cùng vị trí để bàn giao.` | A next shift at the same position must exist |
| `Chưa tới giờ bàn giao/nhận ca…` | This action is only available from 5 minutes before the shift |
| `Ca trước chưa bàn giao, chưa thể nhận.` | Wait for the outgoing crew to hand over first |

---

## 3.7 Workflow 6 – MARPOL Waste-Discharge Approval

This workflow describes how the Chief Officer files a waste-discharge request while the vessel is Underway, and how the Master reviews and approves it based on MARPOL compliance.
* **Chief Officer (ChiefOfficer)** – files the discharge request while the vessel is Underway.
* **Master** – reviews and approves/rejects the request.

**Workflow diagram**
*[Insert screenshot: Figure 7 - MARPOL Waste-Discharge Approval workflow diagram]*

### Step-by-step guide

**Part A - Chief Officer: create the request**
* **Step 1.** Log in as Chief Officer and go to `Nhật ký xả thải` (MARPOL) → `Tạo yêu cầu` (Waste Discharge Log → Create request).
* **Step 2.** Select the discharge type - `Đã xử lý` (Treated) / `Nghiền` (Comminuted) / `Thô` (Untreated) - and fill in distance from shore, vessel speed, volume, position, planned date and supporting photos.
* **Step 3.** Click “Gửi” (Submit). The system automatically evaluates compliance against the MARPOL thresholds below and e-mails the Master.

**MARPOL compliance thresholds**

| Discharge type | Minimum distance from shore | Minimum speed |
| :--- | :--- | :--- |
| **Thô (Untreated)** | ≥ 12 nautical miles | ≥ 4 knots |
| **Nghiền (Comminuted)** | ≥ 3 nautical miles | ≥ 4 knots |
| **Đã xử lý (Treated_STP)** | Always compliant | — |

> [!NOTE]
> A request that falls short of these thresholds can still be submitted - the system only flags it as non-compliant rather than blocking it - but non-compliant requests should be avoided.

**Part B - Master: approve or reject**
* **Step 4.** Open the pending request.
* **Step 5.** Click “Phê duyệt” (Approve) or “Từ chối” (Reject).

### Common error messages

| Message | Cause / Resolution |
| :--- | :--- |
| `Tàu chưa chạy (Status không phải Underway)…` | Requests can only be filed while the vessel is Underway |
| `Chỉ Đại phó (ChiefOfficer) mới được tạo yêu cầu xả thải…` | Only the Chief Officer role may create a request |
| `Chỉ Thuyền trưởng mới được phê duyệt/từ chối…` | Only the Master role may approve or reject |

---

## 3.8 Workflow 7 – Incident Report Escalation

This workflow applies to every crew member on board (except the Master). A report is created and routed through a fixed escalation chain per department:
* **Deck:** Sailor → Deck Officer → Chief Officer → Master.
* **Engine:** Engine Crew/Sailor → Engine Officer → Master.

The Master only receives and processes reports - never creates them - and sits at the top of both the Deck and Engine chains.

**Workflow diagram**
*[Insert screenshot: Figure 12 - Incident report escalation diagram]*

### Step-by-step guide

**Part A - Create a report**
* **Step 1.** Log in with any role (except Master) and go to `Báo cáo` → `Tạo báo cáo` (Reports → Create report).
* **Step 2.** Choose the report type (`Thường nhật`/Daily or `Sự cố`/Incident), department (`Boong`/Deck or `Máy`/Engine), priority level, and fill in the title and content. A report can optionally be created directly from the reporter's current watch, attaching that shift's logged info.
* **Step 3.** Click “Gửi” (Submit). The report is automatically routed to the next rank up.

**Part B - Process the report (the rank currently holding it)**
* **Step 4.** Open the report and add a `Phản hồi` (Response). If the report is still Open and this is the handler's first response, the report automatically moves to “Đang xử lý” (In progress).
* **Step 5.** From In progress, the handler can: 
  * `Đẩy cấp` (Escalate) - forward to the next rank up, unavailable once the report reaches the Master; 
  * `Đã xử lý` (Resolve); 
  * or `Từ chối` (Reject) - a reason is required.
* **Step 6.** From Resolved, the report can be `Đóng` (Closed) to end it, or `Mở lại` (Reopened) back to In progress if further action is needed - a reason is required to reopen.

### Common error messages

| Message | Meaning |
| :--- | :--- |
| `Thuyền trưởng không tạo báo cáo, chỉ tiếp nhận xử lý.` | The Master role only processes reports, never creates them |
| `Chỉ <cấp> (cấp đang giữ báo cáo) mới có quyền thao tác.` | It is not yet your role's turn to act on the report |
| `Vui lòng nhập lý do.` | A reason is required when rejecting or reopening a report |

---

## 3.9 Workflow 8 – Master Data Management (Ports & Cargo Types)

This workflow describes how the Admin sets up the foundational data—specifically Ports (for voyage routes) and Cargo Types (for cargo handling)—before operations can begin.
* **Admin** – the only role authorized to manage master data.

**Workflow diagram**
*[Insert screenshot: Figure 42 - Master Data Management workflow]*

### Step-by-step guide

**Part A - Manage Ports**
* **Step 1.** Log in as Admin and go to `Cấu hình` → `Quản lý Cảng` (Settings → Port Management).
* **Step 2.** Click `Thêm cảng mới` (Add new port), enter the port name, country, and coordinates.
* **Step 3.** Click “Lưu” to save. The port is now available for route planning.

**Part B - Manage Cargo Types**
* **Step 4.** Go to `Quản lý Loại hàng hóa` (Cargo Type Management).
* **Step 5.** Click `Thêm loại hàng` (Add cargo type). Enter the type name, unit (e.g., MT, CBM), and special handling requirements (if any).
* **Step 6.** Click “Lưu” to save. The cargo type can now be assigned during cargo loading.

### Common error messages

| Message | Cause / Resolution |
| :--- | :--- |
| `Tên cảng/loại hàng đã tồn tại.` | You are trying to create a duplicate record. Use a unique name. |

---

## 3.10 Workflow 9 – Crew Management (Admin / Agency)

This workflow outlines how shore-based roles manage onboard personnel, including adding new crew members and viewing their profiles.
* **Admin / Agency** – roles that can create and manage user accounts and profiles.

**Workflow diagram**
*[Insert screenshot: Figure 43 - Crew Management workflow]*

### Step-by-step guide

**Part A - Add New Crew Member**
* **Step 1.** Log in as Admin/Agency and go to `Quản lý Thủy thủ` (Crew Management) → `Thêm mới` (Add Crew).
* **Step 2.** Fill in the crew member's personal information, contact details, and assign a specific system role (e.g., `DeckOfficer`, `Sailor`, `EngineOfficer`).
* **Step 3.** Input certification details and expiration dates.
* **Step 4.** Click “Lưu” to create the account.

**Part B - View & Manage Profiles**
* **Step 5.** On the `Crew Management` page, click on any crew member to view their `Hồ sơ cá nhân` (Crew Profile).
* **Step 6.** Admins can update roles or deactivate accounts if the crew member leaves the fleet.

> [!NOTE]
> The "Status" field of a crew member (e.g., Onboard, On Leave) is managed automatically by the system based on Voyage Attendance and cannot be edited manually.

---

## 3.11 Workflow 10 – Operations Logbooks (Deck & Engine Logs)

This workflow describes how the Deck and Engine Officers maintain the official ship logs during their watch. This is a crucial compliance requirement.
* **Deck Officer** – logs deck and navigational data.
* **Engine Officer** – logs machinery and fuel data.

**Workflow diagram**
*[Insert screenshot: Figure 44 - Operations Logbooks workflow]*

### Step-by-step guide

**Part A - Deck Logbook (Deck Officer)**
* **Step 1.** During or at the end of a shift, the Deck Officer goes to `Nhật ký Boong` (Deck Logbook).
* **Step 2.** Click `Thêm bản ghi` (Add log entry) and input current coordinates, weather conditions, heading, speed, and any navigational remarks.
* **Step 3.** Submit the log. 

**Part B - Engine Logbook (Engine Officer)**
* **Step 4.** The Engine Officer goes to `Nhật ký Máy` (Engine Logbook).
* **Step 5.** Input engine parameters, RPM, temperatures, and fuel consumption for the watch period.
* **Step 6.** In `Quản lý trạng thái máy` (Engine Management), the officer can also update the operational status of key machinery.

### Common error messages

| Message | Cause / Resolution |
| :--- | :--- |
| `Chỉ sĩ quan boong/máy mới được ghi nhật ký.` | You must hold the correct role for the respective logbook. |

---

## 3.12 Workflow 11 – Dashboards & Personal Info

This section covers how different users interact with their respective dashboards for a high-level overview and how they manage their personal settings.

### Step-by-step guide

**Part A - Dashboards**
* **Step 1 (Admin/Agency):** The **Admin Dashboard** displays fleet-wide statistics, active vessels, total crew count, and high-level alerts.
* **Step 2 (Master/Chief Officer):** The **Master Dashboard** focuses on the current active voyage, showing route progress, cargo status, and pending approvals (like MARPOL or Routes).
* **Step 3 (Crew/Officers):** The **Crew Dashboard** displays the user's upcoming shifts, recent incidents, and a quick link to `Chuyến đi của tôi` (My Voyages).

**Part B - Settings and Profile**
* **Step 4.** Any user can click on their avatar/name and select `Cài đặt` (Settings).
* **Step 5.** Here, users can change their password or update personal contact information.

> [!TIP]
> Always check your Dashboard first upon login, as it highlights pending tasks (like approvals or upcoming shifts) that require your immediate attention.
