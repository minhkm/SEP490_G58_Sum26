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
  Attendance, Shift, ShiftLog, DeckLog, DeckLogEntry, EngineLog, EngineLogValue,
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
    const uDuong = await User.create({ username: 'nvduong@star66.vn', password: defPass, role: 'Master', status: 'Available' }, { transaction: t });
    const uTuong = await User.create({ username: 'tvtuong@star66.vn', password: defPass, role: 'ChiefOfficer', status: 'Available' }, { transaction: t });
    const uTuan = await User.create({ username: 'lhtuan@star66.vn', password: defPass, role: 'DeckOfficer', status: 'Available' }, { transaction: t });
    const uDuc = await User.create({ username: 'pcduc@star66.vn', password: defPass, role: 'EngineOfficer', status: 'Available' }, { transaction: t });
    const uTrong = await User.create({ username: 'tdtrong@star66.vn', password: defPass, role: 'EngineOfficer', status: 'Available' }, { transaction: t });
    const uTue = await User.create({ username: 'nhtue@star66.vn', password: defPass, role: 'Sailor', status: 'Available' }, { transaction: t });
    const uSu = await User.create({ username: 'pgsu@star66.vn', password: defPass, role: 'Sailor', status: 'Available' }, { transaction: t });
    const uHung = await User.create({ username: 'nvhung@star66.vn', password: defPass, role: 'Sailor', status: 'Available' }, { transaction: t });
    const uHao = await User.create({ username: 'chhao@star66.vn', password: defPass, role: 'Sailor', status: 'Available' }, { transaction: t });
    const uQuangS = await User.create({ username: 'pmquang@star66.vn', password: defPass, role: 'Sailor', status: 'Available' }, { transaction: t });
    // Thợ máy STAR 66
    const uLong = await User.create({ username: 'ntlong@star66.vn', password: defPass, role: 'EngineCrew', status: 'Available' }, { transaction: t });
    const uNam = await User.create({ username: 'tvnam@star66.vn', password: defPass, role: 'EngineCrew', status: 'Available' }, { transaction: t });

    // --- MV VINH QUANG SUN crew ---
    const uMinh = await User.create({ username: 'nqminh@vqs.vn', password: defPass, role: 'Master', status: 'Available' }, { transaction: t });
    const uHungV = await User.create({ username: 'tvhung@vqs.vn', password: defPass, role: 'ChiefOfficer', status: 'Available' }, { transaction: t });
    const uAn = await User.create({ username: 'ldan@vqs.vn', password: defPass, role: 'DeckOfficer', status: 'Available' }, { transaction: t });
    const uThanh = await User.create({ username: 'pvthanh@vqs.vn', password: defPass, role: 'EngineOfficer', status: 'Available' }, { transaction: t });
    const uQuan = await User.create({ username: 'nmquan@vqs.vn', password: defPass, role: 'EngineOfficer', status: 'Available' }, { transaction: t });
    const uViet = await User.create({ username: 'tqviet@vqs.vn', password: defPass, role: 'Sailor', status: 'Available' }, { transaction: t });
    const uPhuc = await User.create({ username: 'hvphuc@vqs.vn', password: defPass, role: 'Sailor', status: 'Available' }, { transaction: t });
    const uThang = await User.create({ username: 'nbthang@vqs.vn', password: defPass, role: 'Sailor', status: 'Available' }, { transaction: t });
    // Thợ máy VQS
    const uKhoa = await User.create({ username: 'ldkhoa@vqs.vn', password: defPass, role: 'EngineCrew', status: 'Available' }, { transaction: t });
    const uDat = await User.create({ username: 'ntdat@vqs.vn', password: defPass, role: 'EngineCrew', status: 'Available' }, { transaction: t });

    // --- CrewProfiles: STAR 66 (dữ liệu thực từ crew list) ---
    const cpDuong = await CrewProfile.create({ userId: uDuong.id, fullName: 'Nguyễn Viết Dương', email: 'nvduong@star66.vn', phone: '0912000001', cccd: '034000000001', department: 'Deck', position: 'Captain (CAPT)' }, { transaction: t });
    const cpTuong = await CrewProfile.create({ userId: uTuong.id, fullName: 'Trần Văn Tường', email: 'tvtuong@star66.vn', phone: '0912000002', cccd: '034000000002', department: 'Deck', position: 'Chief Officer (C/O)' }, { transaction: t });
    const cpTuan = await CrewProfile.create({ userId: uTuan.id, fullName: 'Lê Hồng Tuấn', email: 'lhtuan@star66.vn', phone: '0912000003', cccd: '034000000003', department: 'Deck', position: 'Deck Officer (D/O)' }, { transaction: t });
    const cpDuc = await CrewProfile.create({ userId: uDuc.id, fullName: 'Phạm Công Đức', email: 'pcduc@star66.vn', phone: '0912000004', cccd: '034000000004', department: 'Engine', position: 'Chief Engineer (C/E)' }, { transaction: t });
    const cpTrong = await CrewProfile.create({ userId: uTrong.id, fullName: 'Trần Đức Trọng', email: 'tdtrong@star66.vn', phone: '0912000005', cccd: '034000000005', department: 'Engine', position: 'Engine Officer (E/O)' }, { transaction: t });
    const cpTue = await CrewProfile.create({ userId: uTue.id, fullName: 'Ngô Hồng Tuệ', email: 'nhtue@star66.vn', phone: '0912000006', cccd: '034000000006', department: 'Deck', position: 'Able Seaman Deck (ABD)' }, { transaction: t });
    const cpSu = await CrewProfile.create({ userId: uSu.id, fullName: 'Phạm Gia Sư', email: 'pgsu@star66.vn', phone: '0912000007', cccd: '034000000007', department: 'Deck', position: 'Ordinary Seaman Deck (OSD)' }, { transaction: t });
    const cpHung = await CrewProfile.create({ userId: uHung.id, fullName: 'Nguyễn Văn Hùng', email: 'nvhung@star66.vn', phone: '0912000008', cccd: '034000000008', department: 'Deck', position: 'Ordinary Seaman Deck (OSD)' }, { transaction: t });
    const cpHao = await CrewProfile.create({ userId: uHao.id, fullName: 'Cao Hữu Hào', email: 'chhao@star66.vn', phone: '0912000009', cccd: '034000000009', department: 'Engine', position: 'Able Seaman Engine (ABE)' }, { transaction: t });
    const cpQuangS = await CrewProfile.create({ userId: uQuangS.id, fullName: 'Phan Minh Quang', email: 'pmquang@star66.vn', phone: '0912000010', cccd: '034000000010', department: 'Deck', position: 'Cook' }, { transaction: t });
    const cpLong = await CrewProfile.create({ userId: uLong.id, fullName: 'Nguyễn Thành Long', email: 'ntlong@star66.vn', phone: '0912000011', cccd: '034000000011', department: 'Engine', position: 'Engine Crew (Thợ máy)' }, { transaction: t });
    const cpNam = await CrewProfile.create({ userId: uNam.id, fullName: 'Trần Văn Nam', email: 'tvnam@star66.vn', phone: '0912000012', cccd: '034000000012', department: 'Engine', position: 'Engine Crew (Thợ máy)' }, { transaction: t });

    // --- CrewProfiles: MV VINH QUANG SUN ---
    const cpMinh = await CrewProfile.create({ userId: uMinh.id, fullName: 'Nguyễn Quang Minh', email: 'nqminh@vqs.vn', phone: '0987000001', cccd: '034000000013', department: 'Deck', position: 'Captain (CAPT)' }, { transaction: t });
    const cpHungV = await CrewProfile.create({ userId: uHungV.id, fullName: 'Trần Văn Hùng', email: 'tvhung@vqs.vn', phone: '0987000002', cccd: '034000000014', department: 'Deck', position: 'Chief Officer (C/O)' }, { transaction: t });
    const cpAn = await CrewProfile.create({ userId: uAn.id, fullName: 'Lê Đức An', email: 'ldan@vqs.vn', phone: '0987000003', cccd: '034000000015', department: 'Deck', position: 'Deck Officer (D/O)' }, { transaction: t });
    const cpThanh = await CrewProfile.create({ userId: uThanh.id, fullName: 'Phạm Văn Thành', email: 'pvthanh@vqs.vn', phone: '0987000004', cccd: '034000000016', department: 'Engine', position: 'Chief Engineer (C/E)' }, { transaction: t });
    const cpQuan = await CrewProfile.create({ userId: uQuan.id, fullName: 'Nguyễn Minh Quân', email: 'nmquan@vqs.vn', phone: '0987000005', cccd: '034000000017', department: 'Engine', position: 'Engine Officer (E/O)' }, { transaction: t });
    const cpViet = await CrewProfile.create({ userId: uViet.id, fullName: 'Trần Quốc Việt', email: 'tqviet@vqs.vn', phone: '0987000006', cccd: '034000000018', department: 'Deck', position: 'Able Seaman Deck (ABD)' }, { transaction: t });
    const cpPhuc = await CrewProfile.create({ userId: uPhuc.id, fullName: 'Hoàng Văn Phúc', email: 'hvphuc@vqs.vn', phone: '0987000007', cccd: '034000000019', department: 'Deck', position: 'Ordinary Seaman Deck (OSD)' }, { transaction: t });
    const cpThang = await CrewProfile.create({ userId: uThang.id, fullName: 'Nguyễn Bá Thắng', email: 'nbthang@vqs.vn', phone: '0987000008', cccd: '034000000020', department: 'Engine', position: 'Engine Crew' }, { transaction: t });
    const cpKhoa = await CrewProfile.create({ userId: uKhoa.id, fullName: 'Lê Đức Khoa', email: 'ldkhoa@vqs.vn', phone: '0987000009', cccd: '034000000021', department: 'Engine', position: 'Engine Crew (Thợ máy)' }, { transaction: t });
    const cpDat = await CrewProfile.create({ userId: uDat.id, fullName: 'Nguyễn Thanh Đạt', email: 'ntdat@vqs.vn', phone: '0987000010', cccd: '034000000022', department: 'Engine', position: 'Engine Crew (Thợ máy)' }, { transaction: t });

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
      { shipId: shipVQS.id, maxCargoWeight: 3500, maxCargoVolume: 4200, minCrew: 10, maxCrew: 15 },
      { shipId: shipS66.id, maxCargoWeight: 3200, maxCargoVolume: 3800, minCrew: 10, maxCrew: 15 },
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
      // Thiết bị cứu sinh
      { equipmentName: 'Xuồng cứu sinh số 1 (Mạn trái)', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Xuồng cứu sinh số 2 (Mạn phải)', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Bè cứu sinh tự thổi', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Áo phao cá nhân (25 chiếc)', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Phao tròn (8 chiếc)', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', status: 'Hoạt động' },
      // Thiết bị chữa cháy
      { equipmentName: 'Bình chữa cháy CO2 (Buồng máy)', equipmentType: 'Thiết bị chữa cháy', location: 'Buồng máy', status: 'Hoạt động' },
      { equipmentName: 'Bình chữa cháy bột xách tay', equipmentType: 'Thiết bị chữa cháy', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Hệ thống chữa cháy cố định (Foam)', equipmentType: 'Thiết bị chữa cháy', location: 'Boong', status: 'Hoạt động' },
      // Dụng cụ sửa chữa (gộp máy móc chính + phụ trợ + dụng cụ)
      { equipmentName: 'Máy phát điện số 1', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', status: 'Hoạt động' },
      { equipmentName: 'Máy phát điện số 2', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', status: 'Hoạt động' },
      { equipmentName: 'Nồi hơi (Boiler)', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', status: 'Hoạt động' },
      { equipmentName: 'Máy nén khí', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', status: 'Hoạt động' },
      { equipmentName: 'Máy lọc dầu (Purifier)', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', status: 'Hoạt động' },
      { equipmentName: 'Máy hàn, máy cắt, máy tiện', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', status: 'Hoạt động' },
      { equipmentName: 'Tủ đồ nghề (cờ lê, mỏ lết, búa)', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', status: 'Hoạt động' },
      // Thiết bị hàng hải
      { equipmentName: 'Radar hàng hải', equipmentType: 'Thiết bị hàng hải', location: 'Buồng lái', status: 'Hoạt động' },
      { equipmentName: 'Hải đồ điện tử (ECDIS)', equipmentType: 'Thiết bị hàng hải', location: 'Buồng lái', status: 'Hoạt động' },
      { equipmentName: 'La bàn điện (Gyro Compass)', equipmentType: 'Thiết bị hàng hải', location: 'Buồng lái', status: 'Hoạt động' },
      { equipmentName: 'Hệ thống AIS', equipmentType: 'Thiết bị hàng hải', location: 'Buồng lái', status: 'Hoạt động' },
      // Thiết bị liên lạc (gộp thông tin cứu nạn)
      { equipmentName: 'Máy vô tuyến VHF', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', status: 'Hoạt động' },
      { equipmentName: 'Hệ thống liên lạc vệ tinh (Inmarsat)', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', status: 'Hoạt động' },
      { equipmentName: 'Phao vô tuyến chỉ báo vị trí (EPIRB)', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', status: 'Hoạt động' },
      { equipmentName: 'Thiết bị phát đáp radar (SART)', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', status: 'Hoạt động' },
      // Thiết bị boong khác
      { equipmentName: 'Mỏ neo & Máy tời neo (Windlass)', equipmentType: 'Khác', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Dây buộc tàu (Mooring lines)', equipmentType: 'Khác', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Cần cẩu hàng số 1', equipmentType: 'Khác', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Nắp hầm hàng thủy lực (Hatch covers)', equipmentType: 'Khác', location: 'Boong', status: 'Hoạt động' },
      { equipmentName: 'Cọc khóa container (Twistlock)', equipmentType: 'Khác', location: 'Boong', status: 'Hoạt động' },
      // Thiết bị y tế & khác
      { equipmentName: 'Tủ thuốc sơ cấp cứu', equipmentType: 'Thiết bị y tế', location: 'Boong', status: 'Hoạt động' },
    ];

    // (Equipment bị lược bỏ vì yêu cầu xoá toàn bộ hải trình, mà Equipment model bắt buộc phải có voyageId)

    // ================================================================
    // CARGO HOLDS
    // ================================================================
    const holdVQS1 = await CargoHold.create({ shipId: shipVQS.id, holdName: 'Hold No.1', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });
    const holdVQS2 = await CargoHold.create({ shipId: shipVQS.id, holdName: 'Hold No.2', maxCapacity: 1600, currentUsage: 0, status: 'Available' }, { transaction: t });

    const holdS661 = await CargoHold.create({ shipId: shipS66.id, holdName: 'Hold No.1', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });
    const holdS662 = await CargoHold.create({ shipId: shipS66.id, holdName: 'Hold No.2', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });

    console.log('✅ Cargo Holds xong');

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
    console.log('✅ Cargo Types xong');

    // ================================================================
    // REPAIR LOGS
    // ================================================================
    await RepairLog.create({
      equipmentId: null,
      engineId: eVQSGen2.id,
      repairedBy: cpQuan.id,
      description: 'Vệ sinh bầu lọc dầu nhờn và thay dầu bôi trơn định kỳ 1000 giờ cho Generator No.2.',
      repairedAt: new Date('2026-04-05T14:00:00'),
    }, { transaction: t });

    await RepairLog.create({
      equipmentId: null,
      engineId: eS66Main.id,
      repairedBy: cpTrong.id,
      description: 'Kiểm tra và siết chặt các bu lông liên kết máy chính với đế tàu (STAR 66).',
      repairedAt: new Date('2026-05-16T09:00:00'),
    }, { transaction: t });

    console.log('✅ Repair Logs xong');

    // ================================================================
    // COMMIT
    // ================================================================
    await t.commit();
    console.log('✅ Transaction committed thành công!');

    console.log('\n🎉 Seed data hoàn tất (Đã xoá hải trình theo yêu cầu)!\n');
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
    console.log('🚢 TÀU:  MV VINH QUANG SUN (IMO 9215672)  |  MV STAR 66 (IMO 9588548)');
    console.log('🗺️  HÀNH TRÌNH: 0 (Đã xoá toàn bộ hải trình)');
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
