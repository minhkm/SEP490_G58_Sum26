'use strict';

const bcrypt = require('bcrypt');
require('dotenv').config();

const {
  sequelize,
  User, CrewProfile, CrewCertificate,
  Ship, ShipCapacity, ShipDocument,
  Engine, EngineParameter,
  Equipment, RepairLog,
  CargoHold, Cargo, CargoItem, CargoAllocation, CargoType,
  Voyage, VoyageCrew,
  Attendance, Shift, ShiftLog, DeckLog, EngineLog, EngineLogValue,
  Report, ReportReply,
} = require('./models');

async function seed() {
  // Xóa toàn bộ bảng cũ và tạo lại bảng mới theo Model
  console.log('🔄 Đang xoá dữ liệu cũ và đồng bộ lại database...');
  await sequelize.sync({ force: true });

  const t = await sequelize.transaction();
  try {
    console.log('🌱 Bắt đầu seed data...');

    // ================================================================
    // USERS & CREW PROFILES
    // ================================================================
    const SALT = 10;
    const defPass = await bcrypt.hash('CargoOps@2026', SALT);
    const adminPass = await bcrypt.hash('Admin@CargoOps2026', SALT);

    // --- Company admin (quản lý tàu, tạo hải trình) ---
    await User.create({ username: 'admin@vinhquang.vn', password: adminPass, role: 'Admin', status: 'Active' }, { transaction: t });

    // --- STAR 66 crew (từ Crew List IMO FAL Form 5 thực tế) ---
    const uDuong = await User.create({ username: 'nvduong@star66.vn', password: defPass, role: 'Master', status: 'Active' }, { transaction: t });
    const uTuong = await User.create({ username: 'tvtuong@star66.vn', password: defPass, role: 'ChiefOfficer', status: 'Active' }, { transaction: t });
    const uTuan = await User.create({ username: 'lhtuan@star66.vn', password: defPass, role: 'DeckOfficer', status: 'Active' }, { transaction: t });
    const uDuc = await User.create({ username: 'pcduc@star66.vn', password: defPass, role: 'EngineOfficer', status: 'Active' }, { transaction: t });
    const uTrong = await User.create({ username: 'tdtrong@star66.vn', password: defPass, role: 'EngineOfficer', status: 'Active' }, { transaction: t });
    const uTue = await User.create({ username: 'nhtue@star66.vn', password: defPass, role: 'Sailor', status: 'Active' }, { transaction: t });
    const uSu = await User.create({ username: 'pgsu@star66.vn', password: defPass, role: 'Sailor', status: 'Active' }, { transaction: t });
    const uHung = await User.create({ username: 'nvhung@star66.vn', password: defPass, role: 'Sailor', status: 'Active' }, { transaction: t });
    const uHao = await User.create({ username: 'chhao@star66.vn', password: defPass, role: 'Sailor', status: 'Active' }, { transaction: t });
    const uQuangS = await User.create({ username: 'pmquang@star66.vn', password: defPass, role: 'Sailor', status: 'Active' }, { transaction: t });
    // Thợ máy STAR 66
    const uLong = await User.create({ username: 'ntlong@star66.vn', password: defPass, role: 'EngineCrew', status: 'Active' }, { transaction: t });
    const uNam = await User.create({ username: 'tvnam@star66.vn', password: defPass, role: 'EngineCrew', status: 'Active' }, { transaction: t });

    // --- MV VINH QUANG SUN crew ---
    const uMinh = await User.create({ username: 'nqminh@vqs.vn', password: defPass, role: 'Master', status: 'Active' }, { transaction: t });
    const uHungV = await User.create({ username: 'tvhung@vqs.vn', password: defPass, role: 'ChiefOfficer', status: 'Active' }, { transaction: t });
    const uAn = await User.create({ username: 'ldan@vqs.vn', password: defPass, role: 'DeckOfficer', status: 'Active' }, { transaction: t });
    const uThanh = await User.create({ username: 'pvthanh@vqs.vn', password: defPass, role: 'EngineOfficer', status: 'Active' }, { transaction: t });
    const uQuan = await User.create({ username: 'nmquan@vqs.vn', password: defPass, role: 'EngineOfficer', status: 'Active' }, { transaction: t });
    const uViet = await User.create({ username: 'tqviet@vqs.vn', password: defPass, role: 'Sailor', status: 'Active' }, { transaction: t });
    const uPhuc = await User.create({ username: 'hvphuc@vqs.vn', password: defPass, role: 'Sailor', status: 'Active' }, { transaction: t });
    const uThang = await User.create({ username: 'nbthang@vqs.vn', password: defPass, role: 'Sailor', status: 'Active' }, { transaction: t });
    // Thợ máy VQS
    const uKhoa = await User.create({ username: 'ldkhoa@vqs.vn', password: defPass, role: 'EngineCrew', status: 'Active' }, { transaction: t });
    const uDat = await User.create({ username: 'ntdat@vqs.vn', password: defPass, role: 'EngineCrew', status: 'Active' }, { transaction: t });

    // --- CrewProfiles: STAR 66 (dữ liệu thực từ crew list) ---
    const cpDuong = await CrewProfile.create({ userId: uDuong.id, fullName: 'Nguyễn Viết Dương', email: 'nvduong@star66.vn', phone: '0912000001', cccd: 'C9598172', department: 'Deck', position: 'Captain (CAPT)' }, { transaction: t });
    const cpTuong = await CrewProfile.create({ userId: uTuong.id, fullName: 'Trần Văn Tường', email: 'tvtuong@star66.vn', phone: '0912000002', cccd: 'C3312408', department: 'Deck', position: 'Chief Officer (C/O)' }, { transaction: t });
    const cpTuan = await CrewProfile.create({ userId: uTuan.id, fullName: 'Lê Hồng Tuấn', email: 'lhtuan@star66.vn', phone: '0912000003', cccd: 'C9892219', department: 'Deck', position: 'Deck Officer (D/O)' }, { transaction: t });
    const cpDuc = await CrewProfile.create({ userId: uDuc.id, fullName: 'Phạm Công Đức', email: 'pcduc@star66.vn', phone: '0912000004', cccd: 'P01388973', department: 'Engine', position: 'Chief Engineer (C/E)' }, { transaction: t });
    const cpTrong = await CrewProfile.create({ userId: uTrong.id, fullName: 'Trần Đức Trọng', email: 'tdtrong@star66.vn', phone: '0912000005', cccd: 'E04190606', department: 'Engine', position: 'Engine Officer (E/O)' }, { transaction: t });
    const cpTue = await CrewProfile.create({ userId: uTue.id, fullName: 'Ngô Hồng Tuệ', email: 'nhtue@star66.vn', phone: '0912000006', cccd: 'K0053122', department: 'Deck', position: 'Able Seaman Deck (ABD)' }, { transaction: t });
    const cpSu = await CrewProfile.create({ userId: uSu.id, fullName: 'Phạm Gia Sư', email: 'pgsu@star66.vn', phone: '0912000007', cccd: 'C9608788', department: 'Deck', position: 'Ordinary Seaman Deck (OSD)' }, { transaction: t });
    const cpHung = await CrewProfile.create({ userId: uHung.id, fullName: 'Nguyễn Văn Hùng', email: 'nvhung@star66.vn', phone: '0912000008', cccd: 'C543525', department: 'Deck', position: 'Ordinary Seaman Deck (OSD)' }, { transaction: t });
    const cpHao = await CrewProfile.create({ userId: uHao.id, fullName: 'Cao Hữu Hào', email: 'chhao@star66.vn', phone: '0912000009', cccd: 'C935390', department: 'Engine', position: 'Able Seaman Engine (ABE)' }, { transaction: t });
    const cpQuangS = await CrewProfile.create({ userId: uQuangS.id, fullName: 'Phan Minh Quang', email: 'pmquang@star66.vn', phone: '0912000010', cccd: 'K0505651', department: 'Deck', position: 'Cook' }, { transaction: t });
    const cpLong = await CrewProfile.create({ userId: uLong.id, fullName: 'Nguyễn Thành Long', email: 'ntlong@star66.vn', phone: '0912000011', cccd: 'C1234567', department: 'Engine', position: 'Engine Crew (Thợ máy)' }, { transaction: t });
    const cpNam = await CrewProfile.create({ userId: uNam.id, fullName: 'Trần Văn Nam', email: 'tvnam@star66.vn', phone: '0912000012', cccd: 'C7654321', department: 'Engine', position: 'Engine Crew (Thợ máy)' }, { transaction: t });

    // --- CrewProfiles: MV VINH QUANG SUN ---
    const cpMinh = await CrewProfile.create({ userId: uMinh.id, fullName: 'Nguyễn Quang Minh', email: 'nqminh@vqs.vn', phone: '0987000001', cccd: 'VHQ001001', department: 'Deck', position: 'Captain (CAPT)' }, { transaction: t });
    const cpHungV = await CrewProfile.create({ userId: uHungV.id, fullName: 'Trần Văn Hùng', email: 'tvhung@vqs.vn', phone: '0987000002', cccd: 'VHQ001002', department: 'Deck', position: 'Chief Officer (C/O)' }, { transaction: t });
    const cpAn = await CrewProfile.create({ userId: uAn.id, fullName: 'Lê Đức An', email: 'ldan@vqs.vn', phone: '0987000003', cccd: 'VHQ001003', department: 'Deck', position: 'Deck Officer (D/O)' }, { transaction: t });
    const cpThanh = await CrewProfile.create({ userId: uThanh.id, fullName: 'Phạm Văn Thành', email: 'pvthanh@vqs.vn', phone: '0987000004', cccd: 'VHQ001004', department: 'Engine', position: 'Chief Engineer (C/E)' }, { transaction: t });
    const cpQuan = await CrewProfile.create({ userId: uQuan.id, fullName: 'Nguyễn Minh Quân', email: 'nmquan@vqs.vn', phone: '0987000005', cccd: 'VHQ001005', department: 'Engine', position: 'Engine Officer (E/O)' }, { transaction: t });
    const cpViet = await CrewProfile.create({ userId: uViet.id, fullName: 'Trần Quốc Việt', email: 'tqviet@vqs.vn', phone: '0987000006', cccd: 'VHQ001006', department: 'Deck', position: 'Able Seaman Deck (ABD)' }, { transaction: t });
    const cpPhuc = await CrewProfile.create({ userId: uPhuc.id, fullName: 'Hoàng Văn Phúc', email: 'hvphuc@vqs.vn', phone: '0987000007', cccd: 'VHQ001007', department: 'Deck', position: 'Ordinary Seaman Deck (OSD)' }, { transaction: t });
    const cpThang = await CrewProfile.create({ userId: uThang.id, fullName: 'Nguyễn Bá Thắng', email: 'nbthang@vqs.vn', phone: '0987000008', cccd: 'VHQ001008', department: 'Engine', position: 'Engine Crew' }, { transaction: t });
    const cpKhoa = await CrewProfile.create({ userId: uKhoa.id, fullName: 'Lê Đức Khoa', email: 'ldkhoa@vqs.vn', phone: '0987000009', cccd: 'VHQ001009', department: 'Engine', position: 'Engine Crew (Thợ máy)' }, { transaction: t });
    const cpDat = await CrewProfile.create({ userId: uDat.id, fullName: 'Nguyễn Thanh Đạt', email: 'ntdat@vqs.vn', phone: '0987000010', cccd: 'VHQ001010', department: 'Engine', position: 'Engine Crew (Thợ máy)' }, { transaction: t });

    // --- Certificates: Nguyễn Viết Dương (từ tài liệu thực) ---
    await CrewCertificate.bulkCreate([
      { crewId: cpDuong.id, certificateName: 'Certificate of Competency - Master (Ships < 3000 GT)', issueDate: '2024-12-23', expiryDate: '2029-12-23', fileUrl: null, status: 'Valid' },
      { crewId: cpDuong.id, certificateName: 'Ship Security Officer (SSO) - 1717.SOBNHP', issueDate: '2021-03-24', expiryDate: '2026-03-24', fileUrl: null, status: 'Expired' },
      { crewId: cpDuong.id, certificateName: 'GMDSS Radio Operator - GOC/BTTTT 1242', issueDate: '2024-06-25', expiryDate: '2029-06-18', fileUrl: null, status: 'Valid' },
    ], { transaction: t });

    // --- Certificates: phần còn lại (mẫu nghiệp vụ chuẩn) ---
    await CrewCertificate.bulkCreate([
      { crewId: cpTuong.id, certificateName: 'Certificate of Competency - Chief Officer', issueDate: '2023-01-15', expiryDate: '2028-01-15', fileUrl: null, status: 'Valid' },
      { crewId: cpTuong.id, certificateName: 'Basic Safety Training (BST)', issueDate: '2022-06-01', expiryDate: '2027-06-01', fileUrl: null, status: 'Valid' },
      { crewId: cpTuan.id, certificateName: 'Officer of the Watch (OOW) - Deck', issueDate: '2023-03-10', expiryDate: '2028-03-10', fileUrl: null, status: 'Valid' },
      { crewId: cpDuc.id, certificateName: 'Certificate of Competency - Chief Engineer', issueDate: '2022-11-20', expiryDate: '2027-11-20', fileUrl: null, status: 'Valid' },
      { crewId: cpDuc.id, certificateName: 'GMDSS Radio Operator', issueDate: '2023-05-15', expiryDate: '2028-05-15', fileUrl: null, status: 'Valid' },
      { crewId: cpTrong.id, certificateName: 'Engineer Officer of the Watch (EOOW)', issueDate: '2024-02-28', expiryDate: '2029-02-28', fileUrl: null, status: 'Valid' },
      { crewId: cpMinh.id, certificateName: 'Certificate of Competency - Master (< 3000 GT)', issueDate: '2023-06-01', expiryDate: '2028-06-01', fileUrl: null, status: 'Valid' },
      { crewId: cpHungV.id, certificateName: 'Certificate of Competency - Chief Officer', issueDate: '2024-01-10', expiryDate: '2029-01-10', fileUrl: null, status: 'Valid' },
      { crewId: cpThanh.id, certificateName: 'Certificate of Competency - Chief Engineer', issueDate: '2023-09-05', expiryDate: '2028-09-05', fileUrl: null, status: 'Valid' },
      { crewId: cpAn.id, certificateName: 'Officer of the Watch (OOW) - Deck', issueDate: '2024-04-20', expiryDate: '2029-04-20', fileUrl: null, status: 'Valid' },
      { crewId: cpQuan.id, certificateName: 'Engineer Officer of the Watch (EOOW)', issueDate: '2023-11-11', expiryDate: '2028-11-11', fileUrl: null, status: 'Valid' },
    ], { transaction: t });

    console.log('✅ Users & Crew xong');

    // ================================================================
    // SHIPS
    // ================================================================
    const shipVQS = await Ship.create({ shipName: 'MV VINH QUANG SUN', imoNumber: '9215672', flag: 'Vietnam', status: 'Active' }, { transaction: t });
    const shipS66 = await Ship.create({ shipName: 'MV STAR 66', imoNumber: '9588548', flag: 'Vietnam', status: 'Active' }, { transaction: t });

    await ShipCapacity.bulkCreate([
      { shipId: shipVQS.id, maxCargoWeight: 3500, maxCargoVolume: 4200, maxCrew: 15 },
      { shipId: shipS66.id, maxCargoWeight: 3200, maxCargoVolume: 3800, maxCrew: 15 },
    ], { transaction: t });

    await ShipDocument.bulkCreate([
      { shipId: shipVQS.id, documentName: 'Certificate of Registry', documentType: 'Registry', expiryDate: '2028-12-31', fileUrl: null, status: 'Valid' },
      { shipId: shipVQS.id, documentName: 'Safety Management Certificate (SMC)', documentType: 'Safety', expiryDate: '2027-06-30', fileUrl: null, status: 'Valid' },
      { shipId: shipVQS.id, documentName: 'International Load Line Certificate', documentType: 'Safety', expiryDate: '2026-08-15', fileUrl: null, status: 'Valid' },
      { shipId: shipVQS.id, documentName: 'MARPOL Annex I Certificate', documentType: 'Environmental', expiryDate: '2027-03-20', fileUrl: null, status: 'Valid' },
      { shipId: shipS66.id, documentName: 'Certificate of Registry', documentType: 'Registry', expiryDate: '2029-05-20', fileUrl: null, status: 'Valid' },
      { shipId: shipS66.id, documentName: 'Safety Management Certificate (SMC)', documentType: 'Safety', expiryDate: '2028-03-10', fileUrl: null, status: 'Valid' },
      { shipId: shipS66.id, documentName: 'International Load Line Certificate', documentType: 'Safety', expiryDate: '2028-11-30', fileUrl: null, status: 'Valid' },
      { shipId: shipS66.id, documentName: 'MARPOL Annex I Certificate', documentType: 'Environmental', expiryDate: '2027-11-30', fileUrl: null, status: 'Valid' },
    ], { transaction: t });

    console.log('✅ Ships & Documents xong');

    // ================================================================
    // ENGINES & PARAMETERS
    // ================================================================
    const eVQSMain = await Engine.create({ shipId: shipVQS.id, engineName: 'Main Engine - MAN B&W 6S35ME', engineType: 'Main Engine', status: 'Operational' }, { transaction: t });
    const eVQSGen1 = await Engine.create({ shipId: shipVQS.id, engineName: 'Generator Engine No.1', engineType: 'Generator', status: 'Operational' }, { transaction: t });
    const eVQSGen2 = await Engine.create({ shipId: shipVQS.id, engineName: 'Generator Engine No.2', engineType: 'Generator', status: 'Standby' }, { transaction: t });
    const eS66Main = await Engine.create({ shipId: shipS66.id, engineName: 'Main Engine - MAN B&W 6S35ME', engineType: 'Main Engine', status: 'Operational' }, { transaction: t });
    const eS66Gen1 = await Engine.create({ shipId: shipS66.id, engineName: 'Generator Engine No.1', engineType: 'Generator', status: 'Operational' }, { transaction: t });
    const eS66Gen2 = await Engine.create({ shipId: shipS66.id, engineName: 'Generator Engine No.2', engineType: 'Generator', status: 'Standby' }, { transaction: t });

    // Engine parameters từ Engine Log thực tế (Voyage 1/4, Sea Area: Nam Biển Đông)
    // Giá trị thực: RPM=660, FO Press=4.8, Scav=5.2, Air=2.0, Start=1.2, LubOil=65°C, CoolWater=59°C, ExhGas=385~390°C
    const paramDefs = [
      { name: 'RPM (Main Engine)', maxValue: 750 },
      { name: 'Fuel Oil Pressure (kg/cm²)', maxValue: 6.0 },
      { name: 'Scavenge Pressure (kg/cm²)', maxValue: 6.5 },
      { name: 'Air Pressure (kg/cm²)', maxValue: 2.5 },
      { name: 'Start Air Pressure (kg/cm²)', maxValue: 1.5 },
      { name: 'Lube Oil Temperature (°C)', maxValue: 80 },
      { name: 'Cooling Water Temp (°C)', maxValue: 75 },
      { name: 'Exhaust Gas Temp XL2 (°C)', maxValue: 420 },
      { name: 'Exhaust Gas Temp XL3 (°C)', maxValue: 420 },
      { name: 'Exhaust Gas Temp XL4 (°C)', maxValue: 420 },
      { name: 'Exhaust Gas Temp XL5 (°C)', maxValue: 420 },
      { name: 'Exhaust Gas Temp XL6 (°C)', maxValue: 420 },
    ];

    const epVQS = [];
    for (const p of paramDefs) {
      epVQS.push(await EngineParameter.create({ engineId: eVQSMain.id, ...p }, { transaction: t }));
    }

    const epS66 = [];
    for (const p of paramDefs) {
      epS66.push(await EngineParameter.create({ engineId: eS66Main.id, ...p }, { transaction: t }));
    }

    // 3 thông số bắt buộc cho máy đèn (Generator) — giống form thêm tàu
    const genParamDefs = [
      { name: 'Fuel Oil Pressure', maxValue: 6.0 },
      { name: 'Exhaust Gas Temp XL2 (°C)', maxValue: 420 },
      { name: 'Cooling Water Temp (°C)', maxValue: 75 },
    ];

    for (const gen of [eVQSGen1, eVQSGen2, eS66Gen1, eS66Gen2]) {
      for (const p of genParamDefs) {
        await EngineParameter.create({ engineId: gen.id, ...p }, { transaction: t });
      }
    }

    console.log('✅ Engines & Parameters xong');

    // ================================================================
    // EQUIPMENT
    // ================================================================
    const equipList = [
      { equipmentName: 'Crane No.1', equipmentType: 'Crane', location: 'Main Deck Forward', status: 'Operational' },
      { equipmentName: 'Bilge Pump No.1', equipmentType: 'Pump', location: 'Engine Room', status: 'Operational' },
      { equipmentName: 'Bilge Pump No.2', equipmentType: 'Pump', location: 'Engine Room', status: 'Operational' },
      { equipmentName: 'Fuel Oil Transfer Pump', equipmentType: 'Pump', location: 'Engine Room', status: 'Operational' },
      { equipmentName: 'Fire Fighting System', equipmentType: 'Safety', location: 'Throughout', status: 'Operational' },
      { equipmentName: 'Lifeboat No.1 (Port)', equipmentType: 'Safety', location: 'Port Side', status: 'Operational' },
      { equipmentName: 'Lifeboat No.2 (Starboard)', equipmentType: 'Safety', location: 'Starboard Side', status: 'Operational' },
      { equipmentName: 'EPIRB', equipmentType: 'Navigation', location: 'Bridge', status: 'Operational' },
    ];

    const vqsEquip = [];
    const s66Equip = [];
    for (const e of equipList) {
      vqsEquip.push(await Equipment.create({ shipId: shipVQS.id, ...e }, { transaction: t }));
      s66Equip.push(await Equipment.create({ shipId: shipS66.id, ...e }, { transaction: t }));
    }

    console.log('✅ Equipment xong');

    // ================================================================
    // CARGO HOLDS
    // ================================================================
    // VQS: 2 hầm (từ Production Daily Report: H1 ~1,316 MT, H2 ~1,483 MT)
    const holdVQS1 = await CargoHold.create({ shipId: shipVQS.id, holdName: 'Hold No.1', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });
    const holdVQS2 = await CargoHold.create({ shipId: shipVQS.id, holdName: 'Hold No.2', maxCapacity: 1600, currentUsage: 0, status: 'Available' }, { transaction: t });

    // STAR 66: 2 hầm đang có hàng (voyage 01/26 đang InProgress)
    const holdS661 = await CargoHold.create({ shipId: shipS66.id, holdName: 'Hold No.1', maxCapacity: 1500, currentUsage: 1398.38, status: 'Occupied' }, { transaction: t });
    const holdS662 = await CargoHold.create({ shipId: shipS66.id, holdName: 'Hold No.2', maxCapacity: 1500, currentUsage: 1398.38, status: 'Occupied' }, { transaction: t });

    console.log('✅ Cargo Holds xong');

    // ================================================================
    // VOYAGES
    // ================================================================
    // VQS 01/2026 - Completed (Manila run)
    const vVQS01 = await Voyage.create({
      shipId: shipVQS.id,
      departurePort: 'Cảng Hồ Chí Minh, Việt Nam',
      destinationPort: 'Manila, Philippines',
      departureDate: '2026-01-10',
      arrivalDate: '2026-01-18',
      status: 'Completed',
    }, { transaction: t });

    // VQS 02/2026 - Completed (từ Deck Log 16/03/2026: General Santos → HCM)
    const vVQS02 = await Voyage.create({
      shipId: shipVQS.id,
      departurePort: 'SFI Port, Gen. Santos City, Philippines',
      destinationPort: 'Cảng Hồ Chí Minh, Việt Nam',
      departureDate: '2026-03-10',
      arrivalDate: '2026-03-20',
      status: 'Completed',
    }, { transaction: t });

    // VQS 03/2026 - Completed (từ SOF & NFD docs: HCM → Gen. Santos, arrived Apr 09, completed Apr 16)
    const vVQS03 = await Voyage.create({
      shipId: shipVQS.id,
      departurePort: 'Cảng Hồ Chí Minh, Việt Nam',
      destinationPort: 'SFI Port, Gen. Santos City, Philippines',
      departureDate: '2026-04-01',
      arrivalDate: '2026-04-09',
      status: 'Completed',
    }, { transaction: t });

    // STAR 66 01/2026 - InProgress (từ Cargo Manifest: HCM → Kuching, 18 May 2026)
    const vS6601 = await Voyage.create({
      shipId: shipS66.id,
      departurePort: 'Cảng Hồ Chí Minh, Việt Nam',
      destinationPort: 'Kuching, Sarawak, Malaysia',
      departureDate: '2026-05-18',
      arrivalDate: '2026-05-25',
      status: 'InProgress',
    }, { transaction: t });

    // STAR 66 02/2026 - Planned
    const vS6602 = await Voyage.create({
      shipId: shipS66.id,
      departurePort: 'Kuching, Sarawak, Malaysia',
      destinationPort: 'Cảng Hồ Chí Minh, Việt Nam',
      departureDate: '2026-06-20',
      arrivalDate: '2026-06-27',
      status: 'Planned',
    }, { transaction: t });

    // VQS 04/2026 - InProgress (hành trình test hiện tại)
    const vVQS04 = await Voyage.create({
      shipId: shipVQS.id,
      departurePort: 'Cảng Hồ Chí Minh, Việt Nam',
      destinationPort: 'Manila, Philippines',
      departureDate: '2026-06-15',
      arrivalDate: '2026-06-25',
      status: 'InProgress',
    }, { transaction: t });

    console.log('✅ Voyages xong');

    // ================================================================
    // VOYAGE CREW
    // ================================================================
    const vqsCrewList = [
      { crewId: cpMinh.id, role: 'Master' },
      { crewId: cpHungV.id, role: 'Chief Officer' },
      { crewId: cpAn.id, role: 'Deck Officer' },
      { crewId: cpThanh.id, role: 'Chief Engineer' },
      { crewId: cpQuan.id, role: 'Engine Officer' },
      { crewId: cpViet.id, role: 'Able Seaman Deck' },
      { crewId: cpPhuc.id, role: 'Ordinary Seaman Deck' },
      { crewId: cpThang.id, role: 'Engine Crew' },
      { crewId: cpKhoa.id, role: 'Engine Crew' },
      { crewId: cpDat.id, role: 'Engine Crew' },
    ];
    const s66CrewList = [
      { crewId: cpDuong.id, role: 'Master' },
      { crewId: cpTuong.id, role: 'Chief Officer' },
      { crewId: cpTuan.id, role: 'Deck Officer' },
      { crewId: cpDuc.id, role: 'Chief Engineer' },
      { crewId: cpTrong.id, role: 'Engine Officer' },
      { crewId: cpTue.id, role: 'Able Seaman Deck' },
      { crewId: cpSu.id, role: 'Ordinary Seaman Deck' },
      { crewId: cpHung.id, role: 'Ordinary Seaman Deck' },
      { crewId: cpHao.id, role: 'Able Seaman Engine' },
      { crewId: cpQuangS.id, role: 'Cook' },
      { crewId: cpLong.id, role: 'Engine Crew' },
      { crewId: cpNam.id, role: 'Engine Crew' },
    ];

    for (const v of [vVQS01, vVQS02, vVQS03, vVQS04]) {
      await VoyageCrew.bulkCreate(vqsCrewList.map(c => ({ voyageId: v.id, ...c })), { transaction: t });
    }
    for (const v of [vS6601, vS6602]) {
      await VoyageCrew.bulkCreate(s66CrewList.map(c => ({ voyageId: v.id, ...c })), { transaction: t });
    }

    console.log('✅ VoyageCrew xong');

    // ================================================================
    // CARGO TYPES (loại hàng cấu hình được)
    // ================================================================
    await CargoType.bulkCreate([
      { name: 'Rice', description: 'Gạo' },
      { name: 'Coal', description: 'Than đá' },
      { name: 'Stores', description: 'Vật tư, lương thực' },
      { name: 'Container', description: 'Hàng container' },
      { name: 'Steel', description: 'Sắt thép' },
      { name: 'Cement', description: 'Xi măng' },
    ], { transaction: t });

    // ================================================================
    // CARGO, CARGO ITEMS, CARGO ALLOCATION
    // ================================================================

    // VQS 01/2026 - Manila
    const cVQS01 = await Cargo.create({ voyageId: vVQS01.id, cargoName: 'Vietnam White Rice 5% Broken', cargoType: 'Rice', totalWeight: 2750.0, totalVolume: 3200, status: 'Discharged' }, { transaction: t });
    await CargoItem.create({ cargoId: cVQS01.id, itemName: 'White Rice 25KG Bags', quantity: 110000, weight: 2750.0, volume: 3200 }, { transaction: t });
    await CargoAllocation.bulkCreate([
      { cargoId: cVQS01.id, cargoHoldId: holdVQS1.id, allocatedWeight: 1320, status: 'Discharged' },
      { cargoId: cVQS01.id, cargoHoldId: holdVQS2.id, allocatedWeight: 1430, status: 'Discharged' },
    ], { transaction: t });

    // VQS 02/2026 - Return trip (ballast, no cargo) - tạo 1 cargo nhỏ cho có data
    const cVQS02 = await Cargo.create({ voyageId: vVQS02.id, cargoName: 'Ship Stores & Provisions', cargoType: 'Stores', totalWeight: 15.5, totalVolume: 20, status: 'Discharged' }, { transaction: t });
    await CargoItem.create({ cargoId: cVQS02.id, itemName: 'Food & Provisions', quantity: 1, weight: 15.5, volume: 20 }, { transaction: t });

    // VQS 03/2026 - Từ tài liệu thực (SOF, Production Daily Report, Cargo Certificate)
    // BL: VQS-01 (25kg rice) + VQS-02
    // H1: 52,665 bao × 25kg = 1,316.625 MT | H2: 59,335 bao × 25kg = 1,483.375 MT
    const cVQS03 = await Cargo.create({
      voyageId: vVQS03.id,
      cargoName: 'Vietnam White Rice 5% Broken - Sweet Hasmin',
      cargoType: 'Rice',
      totalWeight: 2810.08,
      totalVolume: 3400.0,
      status: 'Discharged',
    }, { transaction: t });

    await CargoItem.bulkCreate([
      { cargoId: cVQS03.id, itemName: 'Sweet Hasmin Rice 25KG Bags (Good Order)', quantity: 111806, weight: 2795.15, volume: 3380 },
      { cargoId: cVQS03.id, itemName: 'Busted/Broken Bags', quantity: 108, weight: 2.70, volume: 5 },
      { cargoId: cVQS03.id, itemName: 'Wet Bags', quantity: 36, weight: 0.90, volume: 2 },
      { cargoId: cVQS03.id, itemName: 'Empty Broken Bags', quantity: 50, weight: 0, volume: 13 },
    ], { transaction: t });

    await CargoAllocation.bulkCreate([
      { cargoId: cVQS03.id, cargoHoldId: holdVQS1.id, allocatedWeight: 1316.625, status: 'Discharged' },
      { cargoId: cVQS03.id, cargoHoldId: holdVQS2.id, allocatedWeight: 1483.375, status: 'Discharged' },
    ], { transaction: t });

    // STAR 66 01/2026 - Từ Cargo Manifest thực: HCM → Kuching
    // BL: ST66/HCM/KCH-01/26, Shipper: MEKONG FOOD CORP, Notify: PADIBERAS NASIONAL BERHAD (BERNAS)
    const cS6601 = await Cargo.create({
      voyageId: vS6601.id,
      cargoName: 'Vietnamese Long Grain White Rice 5% Broken (Freshly Milled Stock)',
      cargoType: 'Rice',
      totalWeight: 2796.75,
      totalVolume: 3500.0,
      status: 'Loaded',
    }, { transaction: t });

    await CargoItem.bulkCreate([
      { cargoId: cS6601.id, itemName: 'Long Grain Rice 50KG New PP Bags (Good Order)', quantity: 55935, weight: 2796.75, volume: 3490 },
      { cargoId: cS6601.id, itemName: '0.5% Empty Bags Allowance', quantity: 280, weight: 0, volume: 10 },
    ], { transaction: t });

    await CargoAllocation.bulkCreate([
      { cargoId: cS6601.id, cargoHoldId: holdS661.id, allocatedWeight: 1398.38, status: 'Allocated' },
      { cargoId: cS6601.id, cargoHoldId: holdS662.id, allocatedWeight: 1398.38, status: 'Allocated' },
    ], { transaction: t });

    console.log('✅ Cargo xong');

    // ================================================================
    // SHIFTS, SHIFT LOGS, DECK LOGS, ENGINE LOGS, ENGINE LOG VALUES
    // Dựa trên Deck Log thực 16/03/2026 (Voyage VQS 02) và Engine Log 05/05/2026 (STAR 66)
    // ================================================================

    // Tham số thực từ Engine Log: RPM=660, FO=4.8, Scav=5.2, Air=2.0, Start=1.2, LubOil=65, CoolWater=59, XL2=385, XL3=390, XL4=390, XL5=385, XL6=385
    const actualEngineValues = [660, 4.8, 5.2, 2.0, 1.2, 65, 59, 385, 390, 390, 385, 385];

    // 6 ca trực/ngày, mỗi ca 4 tiếng — mô phỏng 1 ngày hải trình VQS 02 (16/03/2026)
    const watchDef = [
      { label: '00-04', sh: 0, eh: 4, deckCrew: cpAn.id, engCrew: cpQuan.id, sailor: cpViet.id },
      { label: '04-08', sh: 4, eh: 8, deckCrew: cpHungV.id, engCrew: cpThanh.id, sailor: cpPhuc.id },
      { label: '08-12', sh: 8, eh: 12, deckCrew: cpAn.id, engCrew: cpQuan.id, sailor: cpViet.id },
      { label: '12-16', sh: 12, eh: 16, deckCrew: cpHungV.id, engCrew: cpThanh.id, sailor: cpPhuc.id },
      { label: '16-20', sh: 16, eh: 20, deckCrew: cpAn.id, engCrew: cpQuan.id, sailor: cpViet.id },
      { label: '20-24', sh: 20, eh: 0, deckCrew: cpHungV.id, engCrew: cpThanh.id, sailor: cpPhuc.id },
    ];

    for (const w of watchDef) {
      const st = new Date('2026-03-16');
      st.setHours(w.sh, 0, 0, 0);
      const et = new Date('2026-03-16');
      if (w.eh === 0) { et.setDate(et.getDate() + 1); et.setHours(0, 0, 0, 0); }
      else et.setHours(w.eh, 0, 0, 0);

      // --- Deck watch (Officer) ---
      const dShift = await Shift.create({ voyageId: vVQS02.id, crewId: w.deckCrew, startTime: st, endTime: et, status: 'Completed' }, { transaction: t });
      const dSLog = await ShiftLog.create({
        shiftId: dShift.id, logType: 'Deck',
        content: `Ca trực boong ${w.label}H. Tàu hoạt động bình thường. HT 283°, tốc độ 6.5kn, RPM 660. Gió NE cấp 4, khí tượng bc, khí áp 1015. Giao ca an toàn.`,
        createdAt: et,
      }, { transaction: t });
      await DeckLog.create({
        shiftLogId: dSLog.id,
        note: `Course: 283°T (Gyro). Speed: 6.5kn (Log). RPM: 660. Wind: NE F4. Baro: 1015. Sea: 3. Vis: 5nm. Air temp: 28°C. Sea temp: 27°C. No special occurrence.`,
      }, { transaction: t });

      // --- Deck watch (Sailor) ---
      const sailorShift = await Shift.create({ voyageId: vVQS02.id, crewId: w.sailor, startTime: st, endTime: et, status: 'Completed' }, { transaction: t });
      const sailorSLog = await ShiftLog.create({
        shiftId: sailorShift.id, logType: 'Deck',
        content: `Hỗ trợ sỹ quan trực ca ${w.label}H. Cảnh giới an toàn, theo dõi radar. Không có báo động.`,
        createdAt: et,
      }, { transaction: t });
      await DeckLog.create({
        shiftLogId: sailorSLog.id,
        note: `Thực hiện nhiệm vụ cảnh giới an toàn. Báo cáo định kỳ mục tiêu. Lau dọn buồng lái.`,
      }, { transaction: t });

      // --- Engine watch ---
      const eShift = await Shift.create({ voyageId: vVQS02.id, crewId: w.engCrew, startTime: st, endTime: et, status: 'Completed' }, { transaction: t });
      const eSLog = await ShiftLog.create({
        shiftId: eShift.id, logType: 'Engine',
        content: `Ca máy ${w.label}H. Máy chính MAN B&W hoạt động bình thường. RPM 660. Các thông số trong giới hạn an toàn. Giao ca bình thường.`,
        createdAt: et,
      }, { transaction: t });
      const eLog = await EngineLog.create({
        shiftLogId: eSLog.id,
        engineId: eVQSMain.id,
        note: `Main engine running normally at 660 RPM. All pressures and temperatures within normal range. Generator No.1 on load, No.2 on standby.`,
      }, { transaction: t });

      // Engine log values từ dữ liệu thực
      for (let i = 0; i < actualEngineValues.length; i++) {
        if (epVQS[i]) {
          await EngineLogValue.create({ engineLogId: eLog.id, parameterId: epVQS[i].id, value: actualEngineValues[i] }, { transaction: t });
        }
      }
    }

    // 1 ca engine log cho STAR 66 (Voyage 01, 05/05/2026 - Engine Log thực)
    const s66ShiftSt = new Date('2026-05-20T08:00:00');
    const s66ShiftEt = new Date('2026-05-20T12:00:00');
    const s66Shift = await Shift.create({ voyageId: vS6601.id, crewId: cpTrong.id, startTime: s66ShiftSt, endTime: s66ShiftEt, status: 'Completed' }, { transaction: t });
    const s66SLog = await ShiftLog.create({ shiftId: s66Shift.id, logType: 'Engine', content: 'Ca máy 08-12H. Hành trình đến Kuching. Máy chính ổn định. RPM 660. Các thông số bình thường.', createdAt: s66ShiftEt }, { transaction: t });
    const s66ELog = await EngineLog.create({ shiftLogId: s66SLog.id, engineId: eS66Main.id, note: 'Sea area: South China Sea. Main engine 660 RPM. All parameters normal.' }, { transaction: t });
    for (let i = 0; i < actualEngineValues.length; i++) {
      if (epS66[i]) {
        await EngineLogValue.create({ engineLogId: s66ELog.id, parameterId: epS66[i].id, value: actualEngineValues[i] }, { transaction: t });
      }
    }

    // ================================================================
    // CA TRỰC CHO VQS-04 (Hải trình test — InProgress)
    // 3 ngày: 15, 16, 17/06/2026 — mỗi ngày 6 ca (4h/ca)
    // Thợ máy trực: cpKhoa (ldkhoa@vqs.vn), cpDat, cpThang
    // Sỹ quan máy: cpThanh (E/O), cpQuan
    // ================================================================
    const vqs04WatchDef = [
      { label: '00-04', sh: 0, eh: 4, engCrew: cpKhoa.id, deckCrew: cpAn.id, sailor: cpViet.id },
      { label: '04-08', sh: 4, eh: 8, engCrew: cpDat.id, deckCrew: cpHungV.id, sailor: cpPhuc.id },
      { label: '08-12', sh: 8, eh: 12, engCrew: cpThang.id, deckCrew: cpAn.id, sailor: cpViet.id },
      { label: '12-16', sh: 12, eh: 16, engCrew: cpKhoa.id, deckCrew: cpHungV.id, sailor: cpPhuc.id },
      { label: '16-20', sh: 16, eh: 20, engCrew: cpDat.id, deckCrew: cpAn.id, sailor: cpViet.id },
      { label: '20-24', sh: 20, eh: 0, engCrew: cpThang.id, deckCrew: cpHungV.id, sailor: cpPhuc.id },
    ];

    const vqs04Days = ['2026-06-15', '2026-06-16', '2026-06-17'];
    for (const day of vqs04Days) {
      for (const w of vqs04WatchDef) {
        const st = new Date(day);
        st.setHours(w.sh, 0, 0, 0);
        const et = new Date(day);
        if (w.eh === 0) { et.setDate(et.getDate() + 1); et.setHours(0, 0, 0, 0); }
        else et.setHours(w.eh, 0, 0, 0);
        
        // Deck watch (Officer)
        await Shift.create({ voyageId: vVQS04.id, crewId: w.deckCrew, startTime: st, endTime: et, status: et < new Date() ? 'Completed' : 'InProgress' }, { transaction: t });
        // Deck watch (Sailor)
        await Shift.create({ voyageId: vVQS04.id, crewId: w.sailor, startTime: st, endTime: et, status: et < new Date() ? 'Completed' : 'InProgress' }, { transaction: t });
        // Engine watch
        await Shift.create({ voyageId: vVQS04.id, crewId: w.engCrew, startTime: st, endTime: et, status: et < new Date() ? 'Completed' : 'InProgress' }, { transaction: t });
      }
    }

    // Ca trực riêng cho Sỹ quan máy (E/O) — cpThanh, cpQuan
    for (const day of vqs04Days) {
      // E/O ca sáng 08-16
      const eoSt1 = new Date(day); eoSt1.setHours(8, 0, 0, 0);
      const eoEt1 = new Date(day); eoEt1.setHours(16, 0, 0, 0);
      await Shift.create({ voyageId: vVQS04.id, crewId: cpThanh.id, startTime: eoSt1, endTime: eoEt1, status: eoEt1 < new Date() ? 'Completed' : 'InProgress' }, { transaction: t });

      // E/O ca đêm 20-04
      const eoSt2 = new Date(day); eoSt2.setHours(20, 0, 0, 0);
      const eoEt2 = new Date(day); eoEt2.setDate(eoEt2.getDate() + 1); eoEt2.setHours(4, 0, 0, 0);
      await Shift.create({ voyageId: vVQS04.id, crewId: cpQuan.id, startTime: eoSt2, endTime: eoEt2, status: eoEt2 < new Date() ? 'Completed' : 'InProgress' }, { transaction: t });
    }

    console.log('✅ Shifts & Logs xong');

    // ================================================================
    // ATTENDANCE
    // ================================================================
    // VQS 03/2026 - PreDeparture (01/04, 07:00)
    for (const c of vqsCrewList) {
      await Attendance.create({ voyageId: vVQS03.id, crewId: c.crewId, attendanceType: 'PreDeparture', status: 'Present', recordedAt: new Date('2026-04-01T07:00:00') }, { transaction: t });
    }
    // VQS 03/2026 - PostDischarge (16/04, 14:00) — sau khi bốc dỡ xong tại Gen. Santos
    for (const c of vqsCrewList) {
      await Attendance.create({ voyageId: vVQS03.id, crewId: c.crewId, attendanceType: 'PostDischarge', status: 'Present', recordedAt: new Date('2026-04-16T14:00:00') }, { transaction: t });
    }
    // STAR 66 01/2026 - PreDeparture (18/05, 06:00)
    for (const c of s66CrewList) {
      await Attendance.create({ voyageId: vS6601.id, crewId: c.crewId, attendanceType: 'PreDeparture', status: 'Present', recordedAt: new Date('2026-05-18T06:00:00') }, { transaction: t });
    }
    // VQS 02/2026 - cả 2 chiều
    for (const c of vqsCrewList) {
      await Attendance.create({ voyageId: vVQS02.id, crewId: c.crewId, attendanceType: 'PreDeparture', status: 'Present', recordedAt: new Date('2026-03-10T07:00:00') }, { transaction: t });
      await Attendance.create({ voyageId: vVQS02.id, crewId: c.crewId, attendanceType: 'PostDischarge', status: 'Present', recordedAt: new Date('2026-03-20T12:00:00') }, { transaction: t });
    }

    console.log('✅ Attendance xong');

    // ================================================================
    // REPORTS & REPLIES
    // ================================================================
    const r1 = await Report.create({
      createdBy: cpQuan.id,
      reportType: 'Engine',
      title: 'Báo cáo sự cố: Tiếng ồn bất thường tại Generator No.2',
      content: 'Ca máy 08-12H ngày 03/04/2026. Phát hiện Generator No.2 phát ra tiếng ồn bất thường. Kiểm tra sơ bộ: gioăng làm kín trục có dấu hiệu rò rỉ nhẹ. Đề nghị kiểm tra kỹ và thay thế tại cảng tiếp theo.',
      status: 'Resolved',
    }, { transaction: t });
    await ReportReply.create({ reportId: r1.id, repliedBy: cpMinh.id, content: 'Đã xem xét. Chấp thuận đề xuất thay gioăng. Yêu cầu ghi nhận vào Repair Log và đặt phụ tùng tại cảng Gen. Santos City.', repliedAt: new Date('2026-04-03T15:30:00') }, { transaction: t });

    await Report.create({
      createdBy: cpHungV.id,
      reportType: 'Deck',
      title: 'Báo cáo tình trạng hầm hàng sau bốc dỡ - VQS Voyage 03/2026',
      content: 'H1 và H2 đã bốc dỡ hoàn tất lúc 22:20H ngày 15/04/2026. Tổng 112,000 bao = 2,800 MTS. Ghi nhận: 18 bao rách (busted bags), 50 bao rỗng (sweepings = 0.451 MTS). Đã ký xác nhận với Cargo Checker và đại diện người nhận hàng Kingfields Trade Inc. Đề nghị Master phê duyệt Cargo Discharge Certificate.',
      status: 'Open',
    }, { transaction: t });

    const r3 = await Report.create({
      createdBy: cpDuc.id,
      reportType: 'Engine',
      title: 'Nhật ký máy - STAR 66 Voyage 01/26: HCM → Kuching',
      content: 'Hành trình tính đến 20/05/2026. Máy chính MAN B&W 6S35ME hoạt động ổn định, RPM 660. Nhiệt độ khí xả các xilanh: XL2=385, XL3=390, XL4=390, XL5=385, XL6=385°C. Áp suất FO=4.8 kg/cm², Scavenge=5.2 kg/cm². Tiêu thụ HFO 12.5 MT/ngày. Không có sự cố.',
      status: 'InProgress',
    }, { transaction: t });
    await ReportReply.create({ reportId: r3.id, repliedBy: cpDuong.id, content: 'Đã xem xét nhật ký máy. Tiếp tục duy trì. Yêu cầu cập nhật mỗi 24 giờ cho đến khi cập cảng Kuching.', repliedAt: new Date('2026-05-20T09:00:00') }, { transaction: t });

    await Report.create({
      createdBy: cpAn.id,
      reportType: 'Deck',
      title: 'Báo cáo ca trực boong - Ngày 16/03/2026 (VQS Voyage 02)',
      content: 'Ngày 16/03/2026. Hành trình về cảng HCM. Thời tiết: Gió NE cấp 4-5, biển cấp 3-4. Hướng thật 283°, tốc độ 6.5 hải lý/giờ. Khí áp 1015 mbar. Không có sự cố trong ngày. Tất cả các ca trực an toàn. ETA HCM: 20/03/2026.',
      status: 'Resolved',
    }, { transaction: t });

    console.log('✅ Reports xong');

    // ================================================================
    // REPAIR LOGS
    // ================================================================
    await RepairLog.create({
      equipmentId: vqsEquip[1].id, // Bilge Pump No.1
      engineId: null,
      repairedBy: cpThang.id,
      description: 'Thay thế roăng làm kín bơm nước đáy tàu số 1 (Bilge Pump No.1). Kiểm tra áp suất sau sửa chữa: đạt yêu cầu. Thực hiện tại hải trình VQS 02/2026.',
      repairedAt: new Date('2026-03-15T10:00:00'),
    }, { transaction: t });

    await RepairLog.create({
      equipmentId: null,
      engineId: eVQSGen2.id,
      repairedBy: cpQuan.id,
      description: 'Vệ sinh bầu lọc dầu nhờn và thay dầu bôi trơn định kỳ 1000 giờ cho Generator No.2. Kiểm tra các thông số sau bảo dưỡng: bình thường.',
      repairedAt: new Date('2026-04-05T14:00:00'),
    }, { transaction: t });

    await RepairLog.create({
      equipmentId: null,
      engineId: eS66Main.id,
      repairedBy: cpTrong.id,
      description: 'Kiểm tra và siết chặt các bu lông liên kết máy chính với đế tàu (STAR 66). Đo độ rung: trong giới hạn. Thực hiện trước khi khởi hành Voyage 01/26.',
      repairedAt: new Date('2026-05-16T09:00:00'),
    }, { transaction: t });

    console.log('✅ Repair Logs xong');

    // ================================================================
    // COMMIT
    // ================================================================
    await t.commit();

    console.log('\n🎉 Seed data hoàn tất!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TÀI KHOẢN MẪU');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  [Admin]    admin@vinhquang.vn  → Admin@CargoOps2026');
    console.log('  [Master]   nvduong@star66.vn   → CargoOps@2026  (STAR 66)');
    console.log('  [C/O]      tvtuong@star66.vn   → CargoOps@2026');
    console.log('  [C/E]      pcduc@star66.vn     → CargoOps@2026');
    console.log('  [Thợ máy]  ntlong@star66.vn    → CargoOps@2026  (STAR 66)');
    console.log('  [Master]   nqminh@vqs.vn         CargoOps@2026  (VINH QUANG SUN)');
    console.log('  [C/O]      tvhung@vqs.vn         CargoOps@2026');
    console.log('  [Thợ máy]  ldkhoa@vqs.vn         CargoOps@2026  (VQS)');
    console.log('  [Thủy thủ] tqviet@vqs.vn         CargoOps@2026  (VQS Sailor)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚢 TÀUAU:  MV VINH QUANG SUN (IMO 9215672)  |  MV STAR 66 (IMO 9588548)');
    console.log('🗺️  HÀNH TRÌNH: 3× VQS (Completed) | 1× VQS (InProgress) | 1× S66 (InProgress) | 1× S66 (Planned)');
    console.log('📦 HÀNG HOÁ:  VQS-03: 112,000 bao 25kg gạo (2,810 MT, Discharged)');
    console.log('              S66-01: 55,935 bao 50kg gạo (2,797 MT, Loaded)');
    console.log('📝 REPORTS:   4 báo cáo (Resolved/Open/InProgress/Resolved)');
    console.log('⚙️  ENGINE LOG: 6 ca trực boong + 6 ca máy VQS-02 | 1 ca máy S66-01');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    await t.rollback();
    console.error('❌ Lỗi seed, đã rollback:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
