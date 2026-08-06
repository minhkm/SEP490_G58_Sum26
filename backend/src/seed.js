'use strict';

const bcrypt = require('bcrypt');
require('dotenv').config();

const {
  sequelize,
  User, CrewProfile, CrewCertificate,
  Ship, ShipCapacity, ShipDocument,
  Engine, EngineParameter,
  Equipment,
  CargoHold, Cargo, CargoItem, CargoAllocation, CargoType,
  Voyage, VoyageCrew,
  Attendance, Shift, ShiftLog, DeckLog, DeckLogEntry, EngineLog, EngineLogValue,
  Report, ReportReply,
} = require('./models');
const { ENGINE_STATUS, ENGINE_TYPE } = require('./utils/engine');
const { SHIP_STATUS } = require('./utils/vessel');

async function seed() {
  // Xóa toàn bộ bảng cũ và tạo lại bảng mới theo Model.
  // RepairLog là bảng di sản không còn Model nên Sequelize không tự xóa được.
  console.log('🔄 Đang xoá dữ liệu cũ và đồng bộ lại cơ sở dữ liệu...');
  await sequelize.authenticate();
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await sequelize.query('DROP TABLE IF EXISTS `RepairLog`');
    await sequelize.sync({ force: true });
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }


  const t = await sequelize.transaction();
  try {
    console.log('🌱 Bắt đầu tạo dữ liệu mẫu...');

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
    const uTue = await User.create({ username: 'nhtue@star66.vn', password: defPass, role: 'Crew', status: 'Available' }, { transaction: t });
    const uSu = await User.create({ username: 'pgsu@star66.vn', password: defPass, role: 'Crew', status: 'Available' }, { transaction: t });
    const uHung = await User.create({ username: 'nvhung@star66.vn', password: defPass, role: 'Crew', status: 'Available' }, { transaction: t });
    const uHao = await User.create({ username: 'chhao@star66.vn', password: defPass, role: 'Crew', status: 'Available' }, { transaction: t });
    const uQuangS = await User.create({ username: 'pmquang@star66.vn', password: defPass, role: 'Crew', status: 'Available' }, { transaction: t });
    // Thợ máy STAR 66
    const uLong = await User.create({ username: 'ntlong@star66.vn', password: defPass, role: 'EngineCrew', status: 'Available' }, { transaction: t });
    const uNam = await User.create({ username: 'tvnam@star66.vn', password: defPass, role: 'EngineCrew', status: 'Available' }, { transaction: t });

    // --- MV VINH QUANG SUN crew ---
    const uMinh = await User.create({ username: 'nqminh@vqs.vn', password: defPass, role: 'Master', status: 'Available' }, { transaction: t });
    const uHungV = await User.create({ username: 'tvhung@vqs.vn', password: defPass, role: 'ChiefOfficer', status: 'Available' }, { transaction: t });
    const uAn = await User.create({ username: 'ldan@vqs.vn', password: defPass, role: 'DeckOfficer', status: 'Available' }, { transaction: t });
    const uThanh = await User.create({ username: 'pvthanh@vqs.vn', password: defPass, role: 'EngineOfficer', status: 'Available' }, { transaction: t });
    const uQuan = await User.create({ username: 'nmquan@vqs.vn', password: defPass, role: 'EngineOfficer', status: 'Available' }, { transaction: t });
    const uViet = await User.create({ username: 'tqviet@vqs.vn', password: defPass, role: 'Crew', status: 'Available' }, { transaction: t });
    const uPhuc = await User.create({ username: 'hvphuc@vqs.vn', password: defPass, role: 'Crew', status: 'Available' }, { transaction: t });
    const uThang = await User.create({ username: 'nbthang@vqs.vn', password: defPass, role: 'Crew', status: 'Available' }, { transaction: t });
    // Thợ máy VQS
    const uKhoa = await User.create({ username: 'ldkhoa@vqs.vn', password: defPass, role: 'EngineCrew', status: 'Available' }, { transaction: t });
    const uDat = await User.create({ username: 'ntdat@vqs.vn', password: defPass, role: 'EngineCrew', status: 'Available' }, { transaction: t });

    // --- CrewProfiles: STAR 66 (dữ liệu thực từ crew list) ---
    const cpDuong = await CrewProfile.create({ userId: uDuong.id, fullName: 'Nguyễn Viết Dương', email: 'nvduong@star66.vn', phone: '0912000001', cccd: '034000000001', department: 'Deck', position: 'Captain' }, { transaction: t });
    const cpTuong = await CrewProfile.create({ userId: uTuong.id, fullName: 'Trần Văn Tường', email: 'tvtuong@star66.vn', phone: '0912000002', cccd: '034000000002', department: 'Deck', position: 'Chief Officer' }, { transaction: t });
    const cpTuan = await CrewProfile.create({ userId: uTuan.id, fullName: 'Lê Hồng Tuấn', email: 'lhtuan@star66.vn', phone: '0912000003', cccd: '034000000003', department: 'Deck', position: 'Deck Officer' }, { transaction: t });
    const cpDuc = await CrewProfile.create({ userId: uDuc.id, fullName: 'Phạm Công Đức', email: 'pcduc@star66.vn', phone: '0912000004', cccd: '034000000004', department: 'Engine', position: 'Chief Engineer' }, { transaction: t });
    const cpTrong = await CrewProfile.create({ userId: uTrong.id, fullName: 'Trần Đức Trọng', email: 'tdtrong@star66.vn', phone: '0912000005', cccd: '034000000005', department: 'Engine', position: 'Engine Officer' }, { transaction: t });
    const cpTue = await CrewProfile.create({ userId: uTue.id, fullName: 'Ngô Hồng Tuệ', email: 'nhtue@star66.vn', phone: '0912000006', cccd: '034000000006', department: 'Deck', position:'Seaman Deck' }, { transaction: t });
    const cpSu = await CrewProfile.create({ userId: uSu.id, fullName: 'Phạm Gia Sư', email: 'pgsu@star66.vn', phone: '0912000007', cccd: '034000000007', department: 'Deck', position: 'Seaman Deck' }, { transaction: t });
    const cpHung = await CrewProfile.create({ userId: uHung.id, fullName: 'Nguyễn Văn Hùng', email: 'nvhung@star66.vn', phone: '0912000008', cccd: '034000000008', department: 'Deck', position: 'Seaman Deck' }, { transaction: t });
    const cpHao = await CrewProfile.create({ userId: uHao.id, fullName: 'Cao Hữu Hào', email: 'chhao@star66.vn', phone: '0912000009', cccd: '034000000009', department: 'Engine', position: 'Seaman Engine' }, { transaction: t });
    const cpQuangS = await CrewProfile.create({ userId: uQuangS.id, fullName: 'Phan Minh Quang', email: 'pmquang@star66.vn', phone: '0912000010', cccd: '034000000010', department: 'Deck', position: 'Seaman Deck' }, { transaction: t });
    const cpLong = await CrewProfile.create({ userId: uLong.id, fullName: 'Nguyễn Thành Long', email: 'ntlong@star66.vn', phone: '0912000011', cccd: '034000000011', department: 'Engine', position: 'Engine Crew' }, { transaction: t });
    const cpNam = await CrewProfile.create({ userId: uNam.id, fullName: 'Trần Văn Nam', email: 'tvnam@star66.vn', phone: '0912000012', cccd: '034000000012', department: 'Engine', position: 'Engine Crew' }, { transaction: t });

    // --- CrewProfiles: MV VINH QUANG SUN ---
    const cpMinh = await CrewProfile.create({ userId: uMinh.id, fullName: 'Nguyễn Quang Minh', email: 'nqminh@vqs.vn', phone: '0987000001', cccd: '034000000013', department: 'Deck', position: 'Captain' }, { transaction: t });
    const cpHungV = await CrewProfile.create({ userId: uHungV.id, fullName: 'Trần Văn Hùng', email: 'tvhung@vqs.vn', phone: '0987000002', cccd: '034000000014', department: 'Deck', position: 'Chief Officer' }, { transaction: t });
    const cpAn = await CrewProfile.create({ userId: uAn.id, fullName: 'Lê Đức An', email: 'ldan@vqs.vn', phone: '0987000003', cccd: '034000000015', department: 'Deck', position: 'Deck Officer' }, { transaction: t });
    const cpThanh = await CrewProfile.create({ userId: uThanh.id, fullName: 'Phạm Văn Thành', email: 'pvthanh@vqs.vn', phone: '0987000004', cccd: '034000000016', department: 'Engine', position: 'Chief Engineer' }, { transaction: t });
    const cpQuan = await CrewProfile.create({ userId: uQuan.id, fullName: 'Nguyễn Minh Quân', email: 'nmquan@vqs.vn', phone: '0987000005', cccd: '034000000017', department: 'Engine', position: 'Engine Office' }, { transaction: t });
    const cpViet = await CrewProfile.create({ userId: uViet.id, fullName: 'Trần Quốc Việt', email: 'tqviet@vqs.vn', phone: '0987000006', cccd: '034000000018', department: 'Deck', position: 'Seaman Deck' }, { transaction: t });
    const cpPhuc = await CrewProfile.create({ userId: uPhuc.id, fullName: 'Hoàng Văn Phúc', email: 'hvphuc@vqs.vn', phone: '0987000007', cccd: '034000000019', department: 'Deck', position: 'Seaman Deck' }, { transaction: t });
    const cpThang = await CrewProfile.create({ userId: uThang.id, fullName: 'Nguyễn Bá Thắng', email: 'nbthang@vqs.vn', phone: '0987000008', cccd: '034000000020', department: 'Engine', position: 'Engine Crew' }, { transaction: t });
    const cpKhoa = await CrewProfile.create({ userId: uKhoa.id, fullName: 'Lê Đức Khoa', email: 'ldkhoa@vqs.vn', phone: '0987000009', cccd: '034000000021', department: 'Engine', position: 'Engine Crew' }, { transaction: t });
    const cpDat = await CrewProfile.create({ userId: uDat.id, fullName: 'Nguyễn Thanh Đạt', email: 'ntdat@vqs.vn', phone: '0987000010', cccd: '034000000022', department: 'Engine', position: 'Engine Crew' }, { transaction: t });

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

    console.log('✅ Người dùng và thuyền viên xong');

    // ================================================================
    // SHIPS
    // ================================================================
    const shipVQS = await Ship.create({ shipName: 'MV VINH QUANG SUN', imoNumber: '9215672', flag: 'Vietnam', status: SHIP_STATUS.OPERATIONAL }, { transaction: t });
    const shipS66 = await Ship.create({ shipName: 'MV STAR 66', imoNumber: '9588548', flag: 'Vietnam', status: SHIP_STATUS.OPERATIONAL }, { transaction: t });

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

    console.log('✅ Tàu và tài liệu xong');

    // ================================================================
    // ENGINES & PARAMETERS
    // ================================================================
    const eVQSMain = await Engine.create({ shipId: shipVQS.id, engineName: 'Máy chính - MAN B&W 6S35ME', engineType: ENGINE_TYPE.MAIN, status: ENGINE_STATUS.OPERATIONAL }, { transaction: t });
    const eVQSGen1 = await Engine.create({ shipId: shipVQS.id, engineName: 'Máy phụ số 1', engineType: ENGINE_TYPE.AUXILIARY, status: ENGINE_STATUS.OPERATIONAL }, { transaction: t });
    const eVQSGen2 = await Engine.create({ shipId: shipVQS.id, engineName: 'Máy phụ số 2', engineType: ENGINE_TYPE.AUXILIARY, status: ENGINE_STATUS.STANDBY }, { transaction: t });
    const eS66Main = await Engine.create({ shipId: shipS66.id, engineName: 'Máy chính - MAN B&W 6S35ME', engineType: ENGINE_TYPE.MAIN, status: ENGINE_STATUS.OPERATIONAL }, { transaction: t });
    const eS66Gen1 = await Engine.create({ shipId: shipS66.id, engineName: 'Máy phụ số 1', engineType: ENGINE_TYPE.AUXILIARY, status: ENGINE_STATUS.OPERATIONAL }, { transaction: t });
    const eS66Gen2 = await Engine.create({ shipId: shipS66.id, engineName: 'Máy phụ số 2', engineType: ENGINE_TYPE.AUXILIARY, status: ENGINE_STATUS.STANDBY }, { transaction: t });

    // Engine parameters từ Engine Log thực tế (Voyage 1/4, Sea Area: Nam Biển Đông)
    // Giá trị thực: RPM=660, FO Press=4.8, Scav=5.2, Air=2.0, Start=1.2, LubOil=65°C, CoolWater=59°C, ExhGas=385~390°C
    const paramDefs = [
      { name: 'Vòng quay máy chính (vòng/phút)', maxValue: 750 },
      { name: 'Áp suất dầu nhiên liệu (kg/cm²)', maxValue: 6.0 },
      { name: 'Áp suất khí quét (kg/cm²)', maxValue: 6.5 },
      { name: 'Áp suất khí nén (kg/cm²)', maxValue: 2.5 },
      { name: 'Áp suất khí khởi động (kg/cm²)', maxValue: 1.5 },
      { name: 'Nhiệt độ dầu bôi trơn (°C)', maxValue: 80 },
      { name: 'Nhiệt độ nước làm mát (°C)', maxValue: 75 },
      { name: 'Nhiệt độ khí xả XL2 (°C)', maxValue: 420 },
      { name: 'Nhiệt độ khí xả XL3 (°C)', maxValue: 420 },
      { name: 'Nhiệt độ khí xả XL4 (°C)', maxValue: 420 },
      { name: 'Nhiệt độ khí xả XL5 (°C)', maxValue: 420 },
      { name: 'Nhiệt độ khí xả XL6 (°C)', maxValue: 420 },
    ];

    const epVQS = [];
    for (const p of paramDefs) {
      epVQS.push(await EngineParameter.create({ engineId: eVQSMain.id, ...p }, { transaction: t }));
    }

    const epS66 = [];
    for (const p of paramDefs) {
      epS66.push(await EngineParameter.create({ engineId: eS66Main.id, ...p }, { transaction: t }));
    }

    // 3 thông số bắt buộc cho máy phụ — giống biểu mẫu thêm tàu
    const genParamDefs = [
      { name: 'Áp suất dầu nhiên liệu (kg/cm²)', maxValue: 6.0 },
      { name: 'Nhiệt độ khí xả XL2 (°C)', maxValue: 420 },
      { name: 'Nhiệt độ nước làm mát (°C)', maxValue: 75 },
    ];

    for (const gen of [eVQSGen1, eVQSGen2, eS66Gen1, eS66Gen2]) {
      for (const p of genParamDefs) {
        await EngineParameter.create({ engineId: gen.id, ...p }, { transaction: t });
      }
    }

    console.log('✅ Máy và thông số máy xong');

    // ================================================================
    // EQUIPMENT (gắn với tàu)
    // ================================================================
    const shipEquipTemplate = [
      // Thiết bị cứu sinh
      { equipmentName: 'Xuồng cứu sinh số 1 (Mạn trái)', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Xuồng cứu sinh số 2 (Mạn phải)', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Bè cứu sinh tự thổi', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 2, expiryNote: '12/2027' },
      { equipmentName: 'Áo phao cá nhân', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 25, expiryNote: null },
      { equipmentName: 'Phao tròn', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 8, expiryNote: null },
      // Thiết bị chữa cháy
      { equipmentName: 'Bình chữa cháy CO2 (Buồng máy)', equipmentType: 'Thiết bị chữa cháy', location: 'Buồng máy', quantity: 4, expiryNote: '06/2027' },
      { equipmentName: 'Bình chữa cháy bột xách tay', equipmentType: 'Thiết bị chữa cháy', location: 'Boong', quantity: 6, expiryNote: '06/2027' },
      { equipmentName: 'Hệ thống chữa cháy bằng bọt cố định', equipmentType: 'Thiết bị chữa cháy', location: 'Boong', quantity: 1, expiryNote: null },
      // Dụng cụ sửa chữa
      { equipmentName: 'Nồi hơi', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', quantity: 1, expiryNote: null },
      { equipmentName: 'Máy nén khí', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', quantity: 1, expiryNote: null },
      { equipmentName: 'Máy lọc dầu', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', quantity: 1, expiryNote: null },
      { equipmentName: 'Tủ đồ nghề (cờ lê, mỏ lết, búa)', equipmentType: 'Dụng cụ sửa chữa', location: 'Buồng máy', quantity: 1, expiryNote: null },
      // Thiết bị hàng hải
      { equipmentName: 'Ra-đa hàng hải', equipmentType: 'Thiết bị hàng hải', location: 'Buồng lái', quantity: 1, expiryNote: null },
      { equipmentName: 'Hải đồ điện tử (ECDIS)', equipmentType: 'Thiết bị hàng hải', location: 'Buồng lái', quantity: 1, expiryNote: null },
      { equipmentName: 'La bàn điện', equipmentType: 'Thiết bị hàng hải', location: 'Buồng lái', quantity: 1, expiryNote: null },
      { equipmentName: 'Hệ thống AIS', equipmentType: 'Thiết bị hàng hải', location: 'Buồng lái', quantity: 1, expiryNote: null },
      // Thiết bị liên lạc
      { equipmentName: 'Máy vô tuyến VHF', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', quantity: 2, expiryNote: null },
      { equipmentName: 'Hệ thống liên lạc vệ tinh (Inmarsat)', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', quantity: 1, expiryNote: null },
      { equipmentName: 'Phao vô tuyến chỉ báo vị trí (EPIRB)', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', quantity: 1, expiryNote: '08/2028' },
      { equipmentName: 'Thiết bị phát đáp radar (SART)', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', quantity: 2, expiryNote: '08/2028' },
      // Khác (boong)
      { equipmentName: 'Mỏ neo và máy tời neo', equipmentType: 'Khác', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Dây buộc tàu', equipmentType: 'Khác', location: 'Boong', quantity: 8, expiryNote: null },
      { equipmentName: 'Cần cẩu hàng số 1', equipmentType: 'Khác', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Nắp hầm hàng thủy lực', equipmentType: 'Khác', location: 'Boong', quantity: 2, expiryNote: null },
    ];

    // Tạo equipment cho từng tàu
    for (const ship of [shipVQS, shipS66]) {
      await Equipment.bulkCreate(
        shipEquipTemplate.map(e => ({
          ...e,
          shipId: ship.id,
          voyageId: null,
          brokenCount: 0,
          status: 'Hoạt động',
        })),
        { transaction: t }
      );
    }

    console.log('✅ Thiết bị tàu xong');

    // ================================================================
    // KHOANG HÀNG
    // ================================================================
    const holdVQS1 = await CargoHold.create({ shipId: shipVQS.id, holdName: 'Khoang hàng số 1', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });
    const holdVQS2 = await CargoHold.create({ shipId: shipVQS.id, holdName: 'Khoang hàng số 2', maxCapacity: 1600, currentUsage: 0, status: 'Available' }, { transaction: t });

    const holdS661 = await CargoHold.create({ shipId: shipS66.id, holdName: 'Khoang hàng số 1', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });
    const holdS662 = await CargoHold.create({ shipId: shipS66.id, holdName: 'Khoang hàng số 2', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });

    console.log('✅ Khoang hàng xong');

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
    console.log('✅ Loại hàng xong');

    // ================================================================
    // COMMIT
    // ================================================================
    await t.commit();
    console.log('✅ Đã xác nhận giao dịch thành công!');

    console.log('\n🎉 Hoàn tất tạo dữ liệu mẫu (Đã xoá hải trình theo yêu cầu)!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TÀI KHOẢN MẪU');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  [Quản trị viên] admin@vinhquang.vn → Admin@CargoOps2026');
    console.log('  [Thuyền trưởng]  nvduong@star66.vn  → CargoOps@2026  (STAR 66)');
    console.log('  [Đại phó]         tvtuong@star66.vn  → CargoOps@2026');
    console.log('  [Máy trưởng]      pcduc@star66.vn    → CargoOps@2026');
    console.log('  [Thợ máy]  ntlong@star66.vn    → CargoOps@2026  (STAR 66)');
    console.log('  [Thuyền trưởng]  nqminh@vqs.vn       CargoOps@2026  (VINH QUANG SUN)');
    console.log('  [Đại phó]         tvhung@vqs.vn       CargoOps@2026');
    console.log('  [Thợ máy]  ldkhoa@vqs.vn         CargoOps@2026  (VQS)');
    console.log('  [Thủy thủ] tqviet@vqs.vn         CargoOps@2026  (VQS)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚢 TÀU:  MV VINH QUANG SUN (IMO 9215672)  |  MV STAR 66 (IMO 9588548)');
    console.log('🗺️  HÀNH TRÌNH: 0 (Đã xoá toàn bộ hải trình)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    await t.rollback();
    console.error('❌ Lỗi tạo dữ liệu mẫu, đã hoàn tác:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
