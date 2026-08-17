'use strict';

const bcrypt = require('bcrypt');
require('dotenv').config();

// ⚠️ SAFETY GUARD: Ngăn chạy seed nhầm trên production
// Railway tự inject RAILWAY_ENVIRONMENT=production
// Muốn seed production phải dùng: npm run seed:prod
// hoặc truyền flag --confirm khi chạy thủ công
const isProduction = process.env.RAILWAY_ENVIRONMENT === 'production'
  || process.env.NODE_ENV === 'production';
const hasConfirm = process.argv.includes('--confirm');

if (isProduction && !hasConfirm) {
  console.error('\n🚨 DỪNG LẠI! Đây là môi trường PRODUCTION (Railway)!');
  console.error('   Chạy seed sẽ XÓA SẠCH toàn bộ dữ liệu thực.');
  console.error('   Nếu chắc chắn, chạy: node src/seed.js --confirm');
  console.error('   Hoặc từ local: npm run seed:prod\n');
  process.exit(1);
}

const {
  sequelize,
  User, CrewProfile, CrewCertificate,
  Ship, ShipCapacity, ShipDocument,
  Engine, EngineParameter,
  Equipment,
  CargoHold, Cargo, CargoItem, CargoAllocation, CargoType, CargoOperation,
  Voyage, VoyageCrew,
  Attendance, Shift, ShiftLog, DeckLog, DeckLogEntry, EngineLog, EngineLogValue,
  Report, ReportReply,
  Port,
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
    // Mật khẩu demo dùng chung cho MỌI tài khoản (kể cả Admin) để dễ trình bày.
    const DEMO_PASSWORD = '12345678';
    const defPass = await bcrypt.hash(DEMO_PASSWORD, SALT);

    // --- Company admin (quản lý tàu, tạo hải trình) ---
    await User.create({ username: 'admin@vinhquang.vn', password: defPass, role: 'Admin', status: 'Active' }, { transaction: t });

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

    // ================================================================
    // NHÂN SỰ BỔ SUNG (khai báo dạng dữ liệu + vòng lặp cho gọn)
    // - 9 người: kíp tàu MV BIEN DONG 09 (được phân công vào hải trình VOY-03)
    // - 23 người: đội dự bị của công ty, luôn ở trạng thái Sẵn sàng để test
    //   tạo hải trình mới (đủ 4 chức danh bắt buộc cho ít nhất 2 chuyến).
    // ================================================================
    const POSITION_BY_ROLE = {
      Master: 'Captain',
      ChiefOfficer: 'Chief Officer',
      DeckOfficer: 'Deck Officer',
      EngineOfficer: 'Chief Engineer',
      EngineCrew: 'Engine Crew',
      Sailor: 'Seaman Deck',
    };
    const DEPARTMENT_BY_ROLE = {
      Master: 'Deck',
      ChiefOfficer: 'Deck',
      DeckOfficer: 'Deck',
      EngineOfficer: 'Engine',
      EngineCrew: 'Engine',
      Sailor: 'Deck',
    };

    // Kíp trực tiếp của MV BIEN DONG 09
    const bienDongCrewDefs = [
      { fullName: 'Vũ Đình Khánh', email: 'vdkhanh@biendong09.vn', role: 'Master' },
      { fullName: 'Đỗ Trọng Nghĩa', email: 'dtnghia@biendong09.vn', role: 'ChiefOfficer' },
      { fullName: 'Lý Văn Cường', email: 'lvcuong@biendong09.vn', role: 'DeckOfficer' },
      { fullName: 'Bùi Xuân Hoà', email: 'bxhoa@biendong09.vn', role: 'EngineOfficer' },
      { fullName: 'Đặng Minh Tú', email: 'dmtu@biendong09.vn', role: 'EngineCrew' },
      { fullName: 'Hồ Sỹ Bình', email: 'hsbinh@biendong09.vn', role: 'EngineCrew' },
      { fullName: 'Ngô Văn Lâm', email: 'nvlam@biendong09.vn', role: 'Sailor' },
      { fullName: 'Trịnh Bá Kiên', email: 'tbkien@biendong09.vn', role: 'Sailor' },
      { fullName: 'Phùng Quốc Đại', email: 'pqdai@biendong09.vn', role: 'Sailor' },
    ];

    // Đội dự bị trên bờ — chưa thuộc hải trình nào
    const reserveCrewDefs = [
      { fullName: 'Nguyễn Hải Đăng', email: 'nhdang@vinhquang.vn', role: 'Master' },
      { fullName: 'Trương Công Định', email: 'tcdinh@vinhquang.vn', role: 'Master' },
      { fullName: 'Lâm Tuấn Vũ', email: 'ltvu@vinhquang.vn', role: 'Master' },
      { fullName: 'Vương Đức Hải', email: 'vdhai@vinhquang.vn', role: 'ChiefOfficer' },
      { fullName: 'Tạ Quang Huy', email: 'tqhuy@vinhquang.vn', role: 'ChiefOfficer' },
      { fullName: 'Đinh Ngọc Sơn', email: 'dnson@vinhquang.vn', role: 'ChiefOfficer' },
      { fullName: 'Chu Văn Lợi', email: 'cvloi@vinhquang.vn', role: 'DeckOfficer' },
      { fullName: 'Mai Thế Anh', email: 'mtanh@vinhquang.vn', role: 'DeckOfficer' },
      { fullName: 'Hà Trung Kiên', email: 'htkien@vinhquang.vn', role: 'DeckOfficer' },
      { fullName: 'Lương Bá Thành', email: 'lbthanh@vinhquang.vn', role: 'EngineOfficer' },
      { fullName: 'Nghiêm Xuân Phú', email: 'nxphu@vinhquang.vn', role: 'EngineOfficer' },
      { fullName: 'Tô Vĩnh Hưng', email: 'tvhung2@vinhquang.vn', role: 'EngineOfficer' },
      { fullName: 'Dương Văn Tài', email: 'dvtai@vinhquang.vn', role: 'EngineCrew' },
      { fullName: 'Đoàn Hữu Nghị', email: 'dhnghi@vinhquang.vn', role: 'EngineCrew' },
      { fullName: 'Kiều Anh Dũng', email: 'kadung@vinhquang.vn', role: 'EngineCrew' },
      { fullName: 'Lại Văn Chính', email: 'lvchinh@vinhquang.vn', role: 'EngineCrew' },
      { fullName: 'Phan Trọng Nhân', email: 'ptnhan@vinhquang.vn', role: 'EngineCrew' },
      { fullName: 'Bạch Đình Vinh', email: 'bdvinh@vinhquang.vn', role: 'Sailor' },
      { fullName: 'Cao Văn Thọ', email: 'cvtho@vinhquang.vn', role: 'Sailor' },
      { fullName: 'Đỗ Quang Trường', email: 'dqtruong@vinhquang.vn', role: 'Sailor' },
      { fullName: 'Lê Minh Khoa', email: 'lmkhoa@vinhquang.vn', role: 'Sailor' },
      { fullName: 'Nguyễn Đức Toàn', email: 'ndtoan@vinhquang.vn', role: 'Sailor' },
      { fullName: 'Vũ Hồng Phong', email: 'vhphong@vinhquang.vn', role: 'Sailor' },
    ];

    // 22 hồ sơ phía trên đã dùng hết cccd 034000000001..022 → nhóm mới đánh số tiếp.
    let crewSeq = 22;
    const createCrewFromDef = async (def) => {
      crewSeq += 1;
      const user = await User.create({
        username: def.email,
        password: defPass,
        role: def.role,
        status: 'Available',
      }, { transaction: t });
      return CrewProfile.create({
        userId: user.id,
        fullName: def.fullName,
        email: def.email,
        phone: `0908${String(crewSeq).padStart(6, '0')}`,
        cccd: `034${String(crewSeq).padStart(9, '0')}`,
        department: DEPARTMENT_BY_ROLE[def.role],
        position: POSITION_BY_ROLE[def.role],
      }, { transaction: t });
    };

    const bienDongCrew = [];
    for (const def of bienDongCrewDefs) {
      bienDongCrew.push(await createCrewFromDef(def));
    }

    const reserveCrew = [];
    for (const def of reserveCrewDefs) {
      reserveCrew.push(await createCrewFromDef(def));
    }

    // Chứng chỉ cho các sĩ quan mới (thuyền trưởng / đại phó / sĩ quan boong / máy trưởng)
    const OFFICER_CERTIFICATES = {
      Master: 'Certificate of Competency - Master (< 3000 GT)',
      ChiefOfficer: 'Certificate of Competency - Chief Officer',
      DeckOfficer: 'Officer of the Watch (OOW) - Deck',
      EngineOfficer: 'Certificate of Competency - Chief Engineer',
    };
    const officerCertificates = [];
    [...bienDongCrewDefs, ...reserveCrewDefs].forEach((def, idx) => {
      const certificateName = OFFICER_CERTIFICATES[def.role];
      if (!certificateName) return;
      const profile = idx < bienDongCrew.length
        ? bienDongCrew[idx]
        : reserveCrew[idx - bienDongCrew.length];
      officerCertificates.push({
        crewId: profile.id,
        certificateName,
        issueDate: '2023-07-01',
        expiryDate: '2028-07-01',
        fileUrl: null,
        status: 'Valid',
      });
    });
    await CrewCertificate.bulkCreate(officerCertificates, { transaction: t });

    console.log(`✅ Người dùng và thuyền viên xong (${22 + bienDongCrew.length + reserveCrew.length} thuyền viên)`);

    // ================================================================
    // SHIPS
    // ================================================================
    // 2 tàu chủ lực (có sẵn) — đều đang chạy hải trình nên status là "Đang làm việc".
    const shipVQS = await Ship.create({ shipName: 'MV VINH QUANG SUN', imoNumber: '9215672', flag: 'Vietnam', status: SHIP_STATUS.WORKING }, { transaction: t });
    const shipS66 = await Ship.create({ shipName: 'MV STAR 66', imoNumber: '9588548', flag: 'Vietnam', status: SHIP_STATUS.WORKING }, { transaction: t });

    // 4 tàu bổ sung — phủ đủ các trạng thái để demo bộ lọc/thống kê ở màn Quản lý Đội tàu.
    // Lưu ý: "Đang trên hải trình" KHÔNG lưu ở đây, backend tự suy ra từ hải trình
    // chưa Completed/Cancelled (xem vesselRoutes.js) → tàu BIEN DONG 09 để "Đang làm việc".
    const shipBD09 = await Ship.create({ shipName: 'MV BIEN DONG 09', imoNumber: '9631507', flag: 'Vietnam', status: SHIP_STATUS.WORKING }, { transaction: t });
    const shipHPG = await Ship.create({ shipName: 'MV HAI PHONG GLORY', imoNumber: '9455121', flag: 'Vietnam', status: SHIP_STATUS.OPERATIONAL }, { transaction: t });
    const shipTS18 = await Ship.create({ shipName: 'MV TRUONG SA 18', imoNumber: '9327104', flag: 'Vietnam', status: SHIP_STATUS.MAINTENANCE }, { transaction: t });
    const shipPQP = await Ship.create({ shipName: 'MV PHU QUOC PEARL', imoNumber: '9702389', flag: 'Vietnam', status: SHIP_STATUS.INACTIVE }, { transaction: t });

    const allShips = [shipVQS, shipS66, shipBD09, shipHPG, shipTS18, shipPQP];

    await ShipCapacity.bulkCreate([
      { shipId: shipVQS.id, maxCargoWeight: 3500, maxCargoVolume: 4200, minCrew: 10, maxCrew: 15 },
      { shipId: shipS66.id, maxCargoWeight: 3200, maxCargoVolume: 3800, minCrew: 10, maxCrew: 15 },
      // Tàu ven biển cỡ nhỏ hơn: định biên 8-14 người
      { shipId: shipBD09.id, maxCargoWeight: 2800, maxCargoVolume: 3400, minCrew: 8, maxCrew: 14 },
      { shipId: shipHPG.id, maxCargoWeight: 3000, maxCargoVolume: 3600, minCrew: 8, maxCrew: 14 },
      { shipId: shipTS18.id, maxCargoWeight: 2600, maxCargoVolume: 3200, minCrew: 8, maxCrew: 14 },
      { shipId: shipPQP.id, maxCargoWeight: 2400, maxCargoVolume: 3000, minCrew: 8, maxCrew: 14 },
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

    // Bộ hồ sơ tiêu chuẩn cho 4 tàu bổ sung.
    // Tàu bảo trì / ngừng hoạt động cố tình có 1 chứng chỉ hết hạn để demo cảnh báo.
    const shipDocTemplate = [
      { documentName: 'Certificate of Registry', documentType: 'Registry', expiryDate: '2029-01-31' },
      { documentName: 'Safety Management Certificate (SMC)', documentType: 'Safety', expiryDate: '2028-05-31' },
      { documentName: 'International Load Line Certificate', documentType: 'Safety', expiryDate: '2027-09-30' },
      { documentName: 'MARPOL Annex I Certificate', documentType: 'Environmental', expiryDate: '2027-12-31' },
    ];
    for (const ship of [shipBD09, shipHPG, shipTS18, shipPQP]) {
      const needsExpiredDoc = ship.id === shipTS18.id || ship.id === shipPQP.id;
      await ShipDocument.bulkCreate(
        shipDocTemplate.map((doc, idx) => {
          const expired = needsExpiredDoc && idx === 2;
          return {
            shipId: ship.id,
            ...doc,
            expiryDate: expired ? '2026-02-28' : doc.expiryDate,
            fileUrl: null,
            status: expired ? 'Expired' : 'Valid',
          };
        }),
        { transaction: t }
      );
    }

    console.log(`✅ Tàu và tài liệu xong (${allShips.length} tàu)`);

    // ================================================================
    // ENGINES & PARAMETERS
    // ================================================================
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

    // 3 thông số bắt buộc cho máy phụ — giống biểu mẫu thêm tàu
    const genParamDefs = [
      { name: 'Áp suất dầu nhiên liệu (kg/cm²)', maxValue: 6.0 },
      { name: 'Nhiệt độ khí xả XL2 (°C)', maxValue: 420 },
      { name: 'Nhiệt độ nước làm mát (°C)', maxValue: 75 },
    ];

    // Mỗi tàu: 1 máy chính + 2 máy phụ (máy phụ số 2 để dự phòng).
    // Tàu đang bảo trì thì máy chính ở trạng thái "Đang bảo dưỡng".
    const createEnginesForShip = async (ship) => {
      const mainStatus = ship.status === SHIP_STATUS.MAINTENANCE
        ? ENGINE_STATUS.MAINTENANCE
        : ENGINE_STATUS.OPERATIONAL;

      const mainEngine = await Engine.create({
        shipId: ship.id,
        engineName: 'Máy chính - MAN B&W 6S35ME',
        engineType: ENGINE_TYPE.MAIN,
        status: mainStatus,
      }, { transaction: t });
      for (const p of paramDefs) {
        await EngineParameter.create({ engineId: mainEngine.id, ...p }, { transaction: t });
      }

      for (const [idx, status] of [ENGINE_STATUS.OPERATIONAL, ENGINE_STATUS.STANDBY].entries()) {
        const gen = await Engine.create({
          shipId: ship.id,
          engineName: `Máy phụ số ${idx + 1}`,
          engineType: ENGINE_TYPE.AUXILIARY,
          status,
        }, { transaction: t });
        for (const p of genParamDefs) {
          await EngineParameter.create({ engineId: gen.id, ...p }, { transaction: t });
        }
      }
    };

    for (const ship of allShips) {
      await createEnginesForShip(ship);
    }

    console.log(`✅ Máy và thông số máy xong (${allShips.length * 3} máy)`);

    // ================================================================
    // EQUIPMENT (gắn với tàu)
    // ================================================================
    const shipEquipTemplate = [
      // Thiết bị cứu sinh
      { equipmentName: 'Xuồng cứu sinh số 1 (Mạn trái)', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Xuồng cứu sinh số 2 (Mạn phải)', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Bè cứu sinh tự thổi', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 2, expiryNote: '2027-12-31' },
      { equipmentName: 'Áo phao cá nhân', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 25, expiryNote: null },
      { equipmentName: 'Phao tròn', equipmentType: 'Thiết bị cứu sinh', location: 'Boong', quantity: 8, expiryNote: null },
      // Thiết bị chữa cháy
      { equipmentName: 'Bình chữa cháy CO2 (Buồng máy)', equipmentType: 'Thiết bị chữa cháy', location: 'Buồng máy', quantity: 4, expiryNote: '2027-06-30' },
      { equipmentName: 'Bình chữa cháy bột xách tay', equipmentType: 'Thiết bị chữa cháy', location: 'Boong', quantity: 6, expiryNote: '2027-06-30' },
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
      { equipmentName: 'Phao vô tuyến chỉ báo vị trí (EPIRB)', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', quantity: 1, expiryNote: '2028-08-31' },
      { equipmentName: 'Thiết bị phát đáp radar (SART)', equipmentType: 'Thiết bị liên lạc', location: 'Buồng lái', quantity: 2, expiryNote: '2028-08-31' },
      // Khác (boong)
      { equipmentName: 'Mỏ neo và máy tời neo', equipmentType: 'Khác', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Dây buộc tàu', equipmentType: 'Khác', location: 'Boong', quantity: 8, expiryNote: null },
      { equipmentName: 'Cần cẩu hàng số 1', equipmentType: 'Khác', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Nắp hầm hàng thủy lực', equipmentType: 'Khác', location: 'Boong', quantity: 2, expiryNote: null },
    ];

    // Tạo equipment cho TẤT CẢ các tàu.
    // Tàu đang bảo trì có thêm vài thiết bị hỏng để demo màn Thiết bị và vật tư.
    for (const ship of allShips) {
      const brokenFor = (equipmentName) => {
        if (ship.id !== shipTS18.id) return 0;
        if (equipmentName === 'Bình chữa cháy bột xách tay') return 2;
        if (equipmentName === 'Áo phao cá nhân') return 3;
        return 0;
      };
      await Equipment.bulkCreate(
        shipEquipTemplate.map(e => ({
          ...e,
          shipId: ship.id,
          voyageId: null,
          brokenCount: brokenFor(e.equipmentName),
          status: 'Hoạt động',
        })),
        { transaction: t }
      );
    }

    console.log(`✅ Thiết bị tàu xong (${allShips.length * shipEquipTemplate.length} bản ghi)`);

    // ================================================================
    // KHOANG HÀNG (maxCapacity / currentUsage tính bằng m³)
    // ================================================================
    const holdVQS1 = await CargoHold.create({ shipId: shipVQS.id, holdName: 'Khoang hàng số 1', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });
    const holdVQS2 = await CargoHold.create({ shipId: shipVQS.id, holdName: 'Khoang hàng số 2', maxCapacity: 1600, currentUsage: 0, status: 'Available' }, { transaction: t });

    const holdS661 = await CargoHold.create({ shipId: shipS66.id, holdName: 'Khoang hàng số 1', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });
    const holdS662 = await CargoHold.create({ shipId: shipS66.id, holdName: 'Khoang hàng số 2', maxCapacity: 1500, currentUsage: 0, status: 'Available' }, { transaction: t });

    // 4 tàu bổ sung: mỗi tàu 2 khoang
    const extraHolds = {};
    for (const ship of [shipBD09, shipHPG, shipTS18, shipPQP]) {
      extraHolds[ship.id] = [
        await CargoHold.create({ shipId: ship.id, holdName: 'Khoang hàng số 1', maxCapacity: 1400, currentUsage: 0, status: 'Available' }, { transaction: t }),
        await CargoHold.create({ shipId: ship.id, holdName: 'Khoang hàng số 2', maxCapacity: 1400, currentUsage: 0, status: 'Available' }, { transaction: t }),
      ];
    }

    console.log('✅ Khoang hàng xong');

    // ================================================================
    // CARGO TYPES (loại hàng cấu hình được)
    // ================================================================
    const cargoTypeDefs = [
      { name: 'Sắt thép', defaultUnit: 'MT', stowageFactor: 0.45, description: 'Sắt thép cuộn, thép tấm, phôi thép (Hàng nặng)' },
      { name: 'Quặng sắt', defaultUnit: 'MT', stowageFactor: 0.48, description: 'Quặng sắt, bauxite, khoáng sản thô (Hàng nặng)' },
      { name: 'Xi măng', defaultUnit: 'MT', stowageFactor: 0.80, description: 'Xi măng bao 50kg / xi măng rời (Cần chống ẩm)' },
      { name: 'Phân bón', defaultUnit: 'MT', stowageFactor: 1.18, description: 'Phân bón Ure, NPK đóng bao hoặc xá' },
      { name: 'Than đá', defaultUnit: 'MT', stowageFactor: 1.30, description: 'Than đá cám, than nhiệt điện công nghiệp' },
      { name: 'Ngũ cốc', defaultUnit: 'MT', stowageFactor: 1.35, description: 'Ngũ cốc, bắp ngô, lúa mì chở xá' },
      { name: 'Gạo', defaultUnit: 'MT', stowageFactor: 1.45, description: 'Gạo xuất khẩu đóng bao 50kg (Cần thông gió hầm)' },
      { name: 'Cà phê', defaultUnit: 'BAG', stowageFactor: 1.80, description: 'Cà phê nhân đóng bao 60kg xuất khẩu' },
      { name: 'Hàng Container', defaultUnit: 'TEU', stowageFactor: 2.20, description: 'Hàng đóng trong container tiêu chuẩn 20ft/40ft' },
      { name: 'Bông sợi', defaultUnit: 'MT', stowageFactor: 2.60, description: 'Bông sợi dệt may ép kiện (Hàng nhẹ cồng kềnh)' },
      { name: 'Thiết bị điện', defaultUnit: 'PCS', stowageFactor: 3.50, description: 'Máy móc, thiết bị điện tử đóng trong thùng carton' },
      { name: 'Dầu nhờn', defaultUnit: 'BBL', stowageFactor: 1.15, description: 'Dầu bôi trơn đóng thùng phuy tiêu chuẩn' },
    ];
    await CargoType.bulkCreate(cargoTypeDefs, { transaction: t });
    console.log('✅ Loại hàng xong');

    // ================================================================
    // PORTS (CẢNG)
    // ================================================================
    const SEAPORTS = [
      // --- VIỆT NAM ---
      { portName: 'Cảng Cát Lái (Hồ Chí Minh, Việt Nam)', country: 'Vietnam' , lat: 10.7667971, lng: 106.7954767 },
      { portName: 'Cảng Sài Gòn (Hồ Chí Minh, Việt Nam)', country: 'Vietnam' , lat: 8.7318724, lng: 106.6322895 },
      { portName: 'Cảng Hiệp Phước (Hồ Chí Minh, Việt Nam)', country: 'Vietnam' , lat: 10.4026823, lng: 107.1795119 },
      { portName: 'Cảng Hải Phòng (Hải Phòng, Việt Nam)', country: 'Vietnam' , lat: 20.8632078, lng: 106.6895646 },
      { portName: 'Cảng Đình Vũ (Hải Phòng, Việt Nam)', country: 'Vietnam' , lat: 10.4206143, lng: 107.2146008 },
      { portName: 'Cảng Lạch Huyện (Hải Phòng, Việt Nam)', country: 'Vietnam' , lat: 20.798367, lng: 106.9055297 },
      { portName: 'Cảng Đà Nẵng (Đà Nẵng, Việt Nam)', country: 'Vietnam' , lat: 15.4769446, lng: 108.6869021 },
      { portName: 'Cảng Tiên Sa (Đà Nẵng, Việt Nam)', country: 'Vietnam' , lat: 16.119709, lng: 108.2171737 },
      { portName: 'Cảng Quy Nhơn (Bình Định, Việt Nam)', country: 'Vietnam' , lat: 13.7787437, lng: 109.2424598 },
      { portName: 'Cảng Vũng Tàu (BR-VT, Việt Nam)', country: 'Vietnam' , lat: 10.3869289, lng: 107.0625009 },
      { portName: 'Cảng Cái Mép - Thị Vải (BR-VT, Việt Nam)', country: 'Vietnam' , lat: 10.5369289, lng: 107.0125009 },
      { portName: 'Cảng Phú Mỹ (BR-VT, Việt Nam)', country: 'Vietnam' , lat: 10.5869289, lng: 107.0225009 },
      { portName: 'Cảng Nha Trang (Khánh Hòa, Việt Nam)', country: 'Vietnam' , lat: 12.2000, lng: 109.2000 },
      { portName: 'Cảng Cam Ranh (Khánh Hòa, Việt Nam)', country: 'Vietnam' , lat: 11.998251, lng: 109.2173774 },
      { portName: 'Cảng Cẩm Phả (Quảng Ninh, Việt Nam)', country: 'Vietnam' , lat: 21.0100, lng: 107.3300 },
      { portName: 'Cảng Cái Lân (Quảng Ninh, Việt Nam)', country: 'Vietnam' , lat: 20.9736595, lng: 107.0536768 },
      { portName: 'Cảng Nghi Sơn (Thanh Hóa, Việt Nam)', country: 'Vietnam' , lat: 19.3148657, lng: 105.8144636 },
      { portName: 'Cảng Vũng Áng (Hà Tĩnh, Việt Nam)', country: 'Vietnam' , lat: 18.1118603, lng: 106.4080058 },
      { portName: 'Cảng Chân Mây (Thừa Thiên Huế, Việt Nam)', country: 'Vietnam' , lat: 16.3306507, lng: 108.0224026 },
      { portName: 'Cảng Dung Quất (Quảng Ngãi, Việt Nam)', country: 'Vietnam' , lat: 15.415307, lng: 108.7966372 },
      { portName: 'Cảng Cần Thơ (Cần Thơ, Việt Nam)', country: 'Vietnam' , lat: 19.9043348, lng: 105.4629163 },

      // --- SINGAPORE ---
      { portName: 'Cảng Singapore (PSA, Singapore)', country: 'Singapore' , lat: 1.2811983, lng: 103.7751981 },
      { portName: 'Cảng Jurong (Singapore)', country: 'Singapore' , lat: 1.3073194, lng: 103.7187343 },
      { portName: 'Cảng Keppel (Singapore)', country: 'Singapore' , lat: 1.2610, lng: 103.8220 },
      { portName: 'Cảng Pasir Panjang (Singapore)', country: 'Singapore' , lat: 1.2763998, lng: 103.7914017 },

      // --- MALAYSIA ---
      { portName: 'Port Klang (Selangor, Malaysia)', country: 'Malaysia' , lat: 2.9996963, lng: 101.3913589 },
      { portName: 'Cảng Tanjung Pelepas (Johor, Malaysia)', country: 'Malaysia' , lat: 1.3638949, lng: 103.5541482 },
      { portName: 'Cảng Penang (Penang, Malaysia)', country: 'Malaysia' , lat: 5.4191106, lng: 100.3445895 },
      { portName: 'Cảng Johor (Pasir Gudang, Malaysia)', country: 'Malaysia' , lat: 1.4390587, lng: 103.9015989 },
      { portName: 'Cảng Bintulu (Sarawak, Malaysia)', country: 'Malaysia' , lat: 3.055309, lng: 112.9480102 },
      { portName: 'Cảng Kuantan (Pahang, Malaysia)', country: 'Malaysia' , lat: 3.980539, lng: 103.4241516 },
      { portName: 'Cảng Kuching (Sarawak, Malaysia)', country: 'Malaysia' , lat: 1.5526634, lng: 110.3906004 },
      { portName: 'Cảng Kota Kinabalu (Sabah, Malaysia)', country: 'Malaysia' , lat: 5.9948698, lng: 116.0828562 },

      // --- THÁI LAN ---
      { portName: 'Cảng Laem Chabang (Chonburi, Thái Lan)', country: 'Thailand' , lat: 13.0734119, lng: 100.8994177 },
      { portName: 'Cảng Bangkok (Khlong Toei, Thái Lan)', country: 'Thailand' , lat: 13.7061508, lng: 100.5752327 },
      { portName: 'Cảng Map Ta Phut (Rayong, Thái Lan)', country: 'Thailand' , lat: 12.668777, lng: 101.1547309 },
      { portName: 'Cảng Songkhla (Songkhla, Thái Lan)', country: 'Thailand' , lat: 7.2280171, lng: 100.569692 },
      { portName: 'Cảng Phuket (Phuket, Thái Lan)', country: 'Thailand' , lat: 7.8750215, lng: 98.4176493 },

      // --- INDONESIA ---
      { portName: 'Cảng Tanjung Priok (Jakarta, Indonesia)', country: 'Indonesia' , lat: -6.1037982, lng: 106.8824532 },
      { portName: 'Cảng Tanjung Perak (Surabaya, Indonesia)', country: 'Indonesia' , lat: -7.1964103, lng: 112.7330655 },
      { portName: 'Cảng Belawan (Medan, Indonesia)', country: 'Indonesia' , lat: 3.7780783, lng: 98.6806199 },
      { portName: 'Cảng Makassar (South Sulawesi, Indonesia)', country: 'Indonesia' , lat: -5.1221355, lng: 119.4074487 },
      { portName: 'Cảng Semarang / Tanjung Emas (Java, Indonesia)', country: 'Indonesia' , lat: -6.9477594, lng: 110.4243042 },
      { portName: 'Cảng Batam (Riau Islands, Indonesia)', country: 'Indonesia' , lat: 1.0821452, lng: 103.9342899 },
      { portName: 'Cảng Panjang (Sumatra, Indonesia)', country: 'Indonesia' , lat: 1.259693, lng: 103.7836489 },
      { portName: 'Cảng Balikpapan (Kalimantan, Indonesia)', country: 'Indonesia' , lat: -1.1598236, lng: 116.7838201 },

      // --- PHILIPPINES ---
      { portName: 'Cảng Manila (Manila, Philippines)', country: 'Philippines' , lat: 14.5995, lng: 120.9842 },
      { portName: 'Cảng Cebu (Cebu, Philippines)', country: 'Philippines' , lat: 11.2498938, lng: 125.000487 },
      { portName: 'Cảng Davao (Mindanao, Philippines)', country: 'Philippines' , lat: 7.1265272, lng: 125.6627111 },
      { portName: 'Cảng Batangas (Luzon, Philippines)', country: 'Philippines' , lat: 13.7544544, lng: 121.0413059 },
      { portName: 'Cảng Subic Bay (Zambales, Philippines)', country: 'Philippines' , lat: 14.8157249, lng: 120.2834936 },
      { portName: 'Cảng Cagayan de Oro (Mindanao, Philippines)', country: 'Philippines' , lat: 8.4945316, lng: 124.6621902 },
      { portName: 'Cảng Iloilo (Visayas, Philippines)', country: 'Philippines' , lat: 10.6901234, lng: 122.5826142 },
      { portName: 'Cảng Zamboanga (Mindanao, Philippines)', country: 'Philippines' , lat: 7.0707779, lng: 122.2125093 },

      // --- CAMPUCHIA ---
      { portName: 'Cảng Sihanoukville (PAS, Campuchia)', country: 'Cambodia' , lat: 10.6520936, lng: 103.5210411 },
      { portName: 'Cảng Phnom Penh (PPAP, Campuchia)', country: 'Cambodia' , lat: 11.5466365, lng: 104.8125936 },
      { portName: 'Cảng Koh Kong (Campuchia)', country: 'Cambodia' , lat: 11.1172525, lng: 103.7306307 },

      // --- MYANMAR ---
      { portName: 'Cảng Yangon (Yangon, Myanmar)', country: 'Myanmar' , lat: 16.9122626, lng: 96.1368079 },
      { portName: 'Cảng Thilawa (Thanlyin, Myanmar)', country: 'Myanmar' , lat: 16.6676527, lng: 96.253149 },
      { portName: 'Cảng Sittwe (Rakhine, Myanmar)', country: 'Myanmar' , lat: 20.1330489, lng: 92.8731834 },
      { portName: 'Cảng Pathein (Ayeyarwady, Myanmar)', country: 'Myanmar' , lat: 16.8136014, lng: 94.7753243 },

      // --- BRUNEI ---
      { portName: 'Cảng Muara (Brunei)', country: 'Brunei' , lat: 5.0296228, lng: 115.0732004 },
      { portName: 'Cảng Kuala Belait (Brunei)', country: 'Brunei' , lat: 4.5833, lng: 114.2000 },

      // --- ĐÔNG TIMOR (TIMOR-LESTE) ---
      { portName: 'Cảng Dili (Timor-Leste)', country: 'Timor-Leste' , lat: -8.5500, lng: 125.5667 },
      { portName: 'Cảng Tibar Bay (Timor-Leste)', country: 'Timor-Leste' , lat: -8.5721133, lng: 125.4749679 },

      // --- ĐÀI LOAN ---
      { portName: 'Cảng Cao Hùng (Kaohsiung, Đài Loan)', country: 'Taiwan' , lat: 22.550645, lng: 120.3202879 },
      { portName: 'Cảng Keelung (Cơ Long, Đài Loan)', country: 'Taiwan' , lat: 25.1462479, lng: 121.7556113 },
      { portName: 'Cảng Taichung (Đài Trung, Đài Loan)', country: 'Taiwan' , lat: 24.3043419, lng: 120.6026908 },
    ];
    await Port.bulkCreate(SEAPORTS.map(p => ({ ...p, status: 'Active' })), { transaction: t });
    console.log(`✅ Cảng xong (${SEAPORTS.length} cảng)`);

    // ================================================================
    // HẢI TRÌNH + HÀNG HOÁ + ĐIỂM DANH
    // ----------------------------------------------------------------
    // Seed ghi thẳng DB nên không đi qua validate của API → phải tự giữ
    // các bất biến nghiệp vụ, nếu không UI sẽ chặn thao tác tiếp theo:
    //  · Tàu có hải trình chưa Completed/Cancelled → hiển thị "Đang trên hải trình".
    //  · Mỗi hải trình cần >= 5 loại vật tư y tế.
    //  · Phải đủ 4 chức danh: Thuyền trưởng, Đại phó, Sĩ quan boong, Máy trưởng.
    //  · Underway cần: điểm danh đủ + lộ trình Approved + hàng đã lên tàu.
    // ================================================================

    // Ngày tương đối để bộ dữ liệu luôn "mới" dù seed lại lúc nào.
    const baseDate = new Date();
    const dayOffset = (n) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    // Hệ số chất xếp tra theo TÊN loại hàng — Cargo.cargoType phải khớp CargoType.name
    const sfMap = Object.fromEntries(cargoTypeDefs.map(ct => [ct.name, ct.stowageFactor]));
    const volumeOf = (cargoType, weight) => Math.round(weight * (sfMap[cargoType] || 1.0) * 100) / 100;

    // Chuỗi chức danh phải khớp CREW_ROLE_OPTIONS ở frontend/src/pages/CreateVoyagePage.jsx
    const V_ROLE = {
      CAPTAIN: 'Captain (CAPT)',
      CHIEF_OFFICER: 'Đại phó (Chief Officer)',
      DECK_OFFICER: 'Sĩ quan boong (Deck Officer)',
      CHIEF_ENGINEER: 'Máy trưởng (Chief Engineer)',
      ENGINE_CREW: 'Thợ máy (Engine Crew)',
      SAILOR: 'Thủy thủ (Crew)',
    };
    // Chỉ Thợ máy / Thủy thủ được phép trùng chức danh → sĩ quan máy thứ 2 xuống làm thợ máy.
    const VOYAGE_ROLE_BY_ACCOUNT = {
      Master: V_ROLE.CAPTAIN,
      ChiefOfficer: V_ROLE.CHIEF_OFFICER,
      DeckOfficer: V_ROLE.DECK_OFFICER,
      EngineOfficer: V_ROLE.CHIEF_ENGINEER,
      EngineCrew: V_ROLE.ENGINE_CREW,
      Sailor: V_ROLE.SAILOR,
      Crew: V_ROLE.SAILOR,
    };

    // Vật tư y tế của hải trình (>= 5 loại theo ràng buộc voyageRoutes.js)
    const medicalSupplyTemplate = [
      { equipmentName: 'Tủ thuốc cấp cứu tiêu chuẩn', location: 'Buồng lái', quantity: 1, expiryNote: dayOffset(540) },
      { equipmentName: 'Bộ sơ cứu cầm máu', location: 'Buồng lái', quantity: 3, expiryNote: dayOffset(400) },
      { equipmentName: 'Bình oxy y tế cầm tay', location: 'Buồng lái', quantity: 2, expiryNote: dayOffset(620) },
      { equipmentName: 'Cáng cứu thương', location: 'Boong', quantity: 1, expiryNote: null },
      { equipmentName: 'Thuốc say sóng và giảm đau', location: 'Buồng lái', quantity: 5, expiryNote: dayOffset(300) },
      { equipmentName: 'Bộ nẹp cố định xương gãy', location: 'Boong', quantity: 2, expiryNote: null },
    ];

    const createMedicalSupplies = (voyageId) => Equipment.bulkCreate(
      medicalSupplyTemplate.map(e => ({
        ...e,
        voyageId,
        shipId: null,
        equipmentType: 'Vật tư y tế',
        brokenCount: 0,
        status: 'Hoạt động',
      })),
      { transaction: t }
    );

    const assignCrew = (voyageId, assignments) => VoyageCrew.bulkCreate(
      assignments.map(a => ({ voyageId, crewId: a.profile.id, role: a.role })),
      { transaction: t }
    );

    // Điểm danh: PreDeparture (trước khởi hành) / PostDischarge (kết thúc chuyến)
    const recordAttendance = (voyageId, assignments, attendanceType, attendanceDate, recordedBy) =>
      Attendance.bulkCreate(
        assignments.map(a => ({
          voyageId,
          crewId: a.profile.id,
          attendanceType,
          status: 'Present',
          attendanceDate,
          recordedAt: new Date(`${attendanceDate}T07:30:00.000Z`),
          recordedBy,
          note: null,
        })),
        { transaction: t }
      );

    // Tạo lô hàng + chi tiết + phân bổ khoang, giữ đồng bộ:
    //   CargoItem.allocations (JSON) ⇄ CargoAllocation (bảng) ⇄ CargoHold.currentUsage (m³)
    // Hàng đã dỡ thì KHÔNG còn chiếm chỗ khoang (giống voyageRoutes.js).
    const createCargoWithItems = async ({ voyageId = null, cargoName, cargoType, unit, quantity, status, items }) => {
      const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
      const totalVolume = items.reduce((sum, i) => sum + volumeOf(cargoType, i.weight), 0);
      const cargo = await Cargo.create({
        voyageId,
        cargoName,
        cargoType,
        totalWeight,
        totalVolume: Math.round(totalVolume * 100) / 100,
        quantity,
        unit,
        status,
      }, { transaction: t });

      const weightByHold = {};
      for (const item of items) {
        const volume = volumeOf(cargoType, item.weight);
        const allocations = item.hold
          ? [{ holdId: item.hold.id, weight: item.weight, volume }]
          : [];
        const cargoItem = await CargoItem.create({
          cargoId: cargo.id,
          itemName: item.itemName,
          quantity: item.quantity,
          weight: item.weight,
          volume,
          isLoaded: Boolean(item.isLoaded),
          isDischarged: Boolean(item.isDischarged),
          holdId: null,
          allocations,
        }, { transaction: t });

        if (item.hold && item.isLoaded) {
          weightByHold[item.hold.id] = (weightByHold[item.hold.id] || 0) + item.weight;

          // Chỉ hàng còn trên tàu mới chiếm dung tích khoang
          if (!item.isDischarged) {
            item.hold.currentUsage = Math.round((item.hold.currentUsage + volume) * 100) / 100;
            await item.hold.save({ transaction: t });
          }
        }

        if (voyageId && item.isLoaded) {
          await CargoOperation.create({
            voyageId,
            cargoId: cargo.id,
            cargoItemId: cargoItem.id,
            operationType: 'LOAD',
            plannedQuantity: item.quantity,
            actualQuantity: item.quantity,
            plannedWeight: item.weight,
            actualWeight: item.weight,
            unit: unit || 'ton',
            port: item.loadPort || null,
            completedAt: new Date(`${item.loadedOn}T09:00:00.000Z`),
            status: 'Completed',
            note: null,
          }, { transaction: t });
        }
        if (voyageId && item.isDischarged) {
          await CargoOperation.create({
            voyageId,
            cargoId: cargo.id,
            cargoItemId: cargoItem.id,
            operationType: 'UNLOAD',
            plannedQuantity: item.quantity,
            actualQuantity: item.quantity,
            plannedWeight: item.weight,
            actualWeight: item.weight,
            unit: unit || 'ton',
            port: item.dischargePort || null,
            completedAt: new Date(`${item.dischargedOn}T15:00:00.000Z`),
            status: 'Completed',
            note: null,
          }, { transaction: t });
        }
      }

      for (const [holdId, weight] of Object.entries(weightByHold)) {
        await CargoAllocation.create({
          cargoId: cargo.id,
          cargoHoldId: Number(holdId),
          allocatedWeight: weight,
          status: 'Allocated',
        }, { transaction: t });
      }

      return cargo;
    };

    // ---------- Phân công nhân sự cho từng kíp tàu ----------
    // MV VINH QUANG SUN — 10 người (minCrew 10)
    const crewVQS = [
      { profile: cpMinh, role: V_ROLE.CAPTAIN },
      { profile: cpHungV, role: V_ROLE.CHIEF_OFFICER },
      { profile: cpAn, role: V_ROLE.DECK_OFFICER },
      { profile: cpThanh, role: V_ROLE.CHIEF_ENGINEER },
      { profile: cpQuan, role: V_ROLE.ENGINE_CREW },
      { profile: cpKhoa, role: V_ROLE.ENGINE_CREW },
      { profile: cpDat, role: V_ROLE.ENGINE_CREW },
      { profile: cpViet, role: V_ROLE.SAILOR },
      { profile: cpPhuc, role: V_ROLE.SAILOR },
      { profile: cpThang, role: V_ROLE.SAILOR },
    ];

    // MV STAR 66 — 12 người (minCrew 10, maxCrew 15)
    const crewS66 = [
      { profile: cpDuong, role: V_ROLE.CAPTAIN },
      { profile: cpTuong, role: V_ROLE.CHIEF_OFFICER },
      { profile: cpTuan, role: V_ROLE.DECK_OFFICER },
      { profile: cpDuc, role: V_ROLE.CHIEF_ENGINEER },
      { profile: cpTrong, role: V_ROLE.ENGINE_CREW },
      { profile: cpHao, role: V_ROLE.ENGINE_CREW },
      { profile: cpLong, role: V_ROLE.ENGINE_CREW },
      { profile: cpNam, role: V_ROLE.ENGINE_CREW },
      { profile: cpTue, role: V_ROLE.SAILOR },
      { profile: cpSu, role: V_ROLE.SAILOR },
      { profile: cpHung, role: V_ROLE.SAILOR },
      { profile: cpQuangS, role: V_ROLE.SAILOR },
    ];

    // MV BIEN DONG 09 — 9 người (minCrew 8)
    const crewBD09 = bienDongCrew.map((profile, idx) => ({
      profile,
      role: VOYAGE_ROLE_BY_ACCOUNT[bienDongCrewDefs[idx].role],
    }));

    // Hai kíp lấy từ đội dự bị cho các chuyến ĐÃ hoàn thành.
    // Hải trình Completed không khoá nhân sự → 23 người này vẫn ở trạng thái Sẵn sàng.
    const pickReserveCrew = (indexes) => indexes.map(i => ({
      profile: reserveCrew[i],
      role: VOYAGE_ROLE_BY_ACCOUNT[reserveCrewDefs[i].role],
    }));
    const crewHPG = pickReserveCrew([0, 3, 6, 9, 12, 13, 17, 18, 19]);
    const crewTS18 = pickReserveCrew([1, 4, 7, 10, 14, 15, 20, 21, 22]);

    // ---------- VOY-01: MV VINH QUANG SUN — Đang di chuyển ----------
    const voy01 = await Voyage.create({
      shipId: shipVQS.id,
      departurePort: 'Cảng Hải Phòng (Hải Phòng, Việt Nam)',
      destinationPort: 'Cảng Cát Lái (Hồ Chí Minh, Việt Nam)',
      departureDate: dayOffset(-4),
      arrivalDate: dayOffset(3),
      status: 'Underway',
      isCrewSufficient: true,
      isCargoLoaded: true,
      routeStatus: 'Approved',
      routeWaypoints: [
        { lat: 20.8632, lng: 106.6896, name: 'Cảng đi: Cảng Hải Phòng' },
        { lat: 17.60, lng: 108.00, name: 'Cửa Vịnh Bắc Bộ (Nam)' },
        { lat: 16.35, lng: 108.60, name: 'Ngoài khơi Đà Nẵng / Sơn Trà' },
        { lat: 12.20, lng: 109.65, name: 'Ngoài khơi Nha Trang / Cam Ranh' },
        { lat: 10.25, lng: 107.05, name: 'Phao số 0 Vũng Tàu' },
        { lat: 10.7668, lng: 106.7955, name: 'Cảng đến: Cảng Cát Lái' },
      ],
    }, { transaction: t });
    await assignCrew(voy01.id, crewVQS);
    await recordAttendance(voy01.id, crewVQS, 'PreDeparture', dayOffset(-4), cpMinh.userId);
    await createMedicalSupplies(voy01.id);
    await createCargoWithItems({
      voyageId: voy01.id,
      cargoName: 'Gạo xuất khẩu Hải Phòng - Cát Lái',
      cargoType: 'Gạo',
      unit: 'MT',
      quantity: 16000,
      status: 'Đã lên tàu',
      items: [{ itemName: 'Gạo 5% tấm đóng bao 50kg', quantity: 16000, weight: 800, hold: holdVQS1, isLoaded: true, loadedOn: dayOffset(-5), loadPort: 'Cảng Hải Phòng (Hải Phòng, Việt Nam)' }],
    });
    await createCargoWithItems({
      voyageId: voy01.id,
      cargoName: 'Xi măng bao Nghi Sơn',
      cargoType: 'Xi măng',
      unit: 'MT',
      quantity: 18000,
      status: 'Đã lên tàu',
      items: [{ itemName: 'Xi măng PCB40 bao 50kg', quantity: 18000, weight: 900, hold: holdVQS2, isLoaded: true, loadedOn: dayOffset(-5), loadPort: 'Cảng Hải Phòng (Hải Phòng, Việt Nam)' }],
    });

    // ---------- VOY-02: MV STAR 66 — Đã làm hàng xong ----------
    // Cố ý CHƯA điểm danh và lộ trình còn Draft → demo được luồng
    // Đại phó lập lộ trình → gửi duyệt → Thuyền trưởng phê duyệt → điểm danh → chạy.
    const voy02 = await Voyage.create({
      shipId: shipS66.id,
      departurePort: 'Cảng Cẩm Phả (Quảng Ninh, Việt Nam)',
      destinationPort: 'Cảng Đà Nẵng (Đà Nẵng, Việt Nam)',
      departureDate: dayOffset(2),
      arrivalDate: dayOffset(8),
      status: 'Loaded',
      isCrewSufficient: false,
      isCargoLoaded: true,
      routeStatus: 'Draft',
      routeWaypoints: [],
    }, { transaction: t });
    await assignCrew(voy02.id, crewS66);
    await createMedicalSupplies(voy02.id);
    await createCargoWithItems({
      voyageId: voy02.id,
      cargoName: 'Than đá nhiệt điện Cẩm Phả',
      cargoType: 'Than đá',
      unit: 'MT',
      quantity: 1000,
      status: 'Đã lên tàu',
      items: [{ itemName: 'Than cám 6a', quantity: 1000, weight: 1000, hold: holdS661, isLoaded: true, loadedOn: dayOffset(-1), loadPort: 'Cảng Cẩm Phả (Quảng Ninh, Việt Nam)' }],
    });
    await createCargoWithItems({
      voyageId: voy02.id,
      cargoName: 'Thép cuộn Hoà Phát',
      cargoType: 'Sắt thép',
      unit: 'MT',
      quantity: 600,
      status: 'Đã lên tàu',
      items: [{ itemName: 'Thép cuộn cán nóng HRC', quantity: 600, weight: 1200, hold: holdS662, isLoaded: true, loadedOn: dayOffset(-1), loadPort: 'Cảng Cẩm Phả (Quảng Ninh, Việt Nam)' }],
    });

    // ---------- VOY-03: MV BIEN DONG 09 — Lên kế hoạch ----------
    const voy03 = await Voyage.create({
      shipId: shipBD09.id,
      departurePort: 'Cảng Quy Nhơn (Bình Định, Việt Nam)',
      destinationPort: 'Cảng Singapore (PSA, Singapore)',
      departureDate: dayOffset(6),
      arrivalDate: dayOffset(13),
      status: 'Planning',
      isCrewSufficient: false,
      isCargoLoaded: false,
      routeStatus: 'Draft',
      routeWaypoints: [],
    }, { transaction: t });
    await assignCrew(voy03.id, crewBD09);
    await createMedicalSupplies(voy03.id);
    await createCargoWithItems({
      voyageId: voy03.id,
      cargoName: 'Cà phê nhân xuất khẩu Tây Nguyên',
      cargoType: 'Cà phê',
      unit: 'BAG',
      quantity: 10000,
      status: 'Đã ở cảng',
      items: [{ itemName: 'Cà phê Robusta bao 60kg', quantity: 10000, weight: 600, hold: null, isLoaded: false }],
    });

    // ---------- VOY-04: MV HAI PHONG GLORY — Hoàn thành ----------
    const voy04 = await Voyage.create({
      shipId: shipHPG.id,
      departurePort: 'Cảng Đình Vũ (Hải Phòng, Việt Nam)',
      destinationPort: 'Cảng Chân Mây (Thừa Thiên Huế, Việt Nam)',
      departureDate: dayOffset(-32),
      arrivalDate: dayOffset(-25),
      status: 'Completed',
      isCrewSufficient: true,
      isCargoLoaded: true,
      routeStatus: 'Approved',
      routeWaypoints: [
        { lat: 20.8632, lng: 106.6896, name: 'Cảng đi: Cảng Đình Vũ' },
        { lat: 19.30, lng: 107.60, name: 'Giữa Vịnh Bắc Bộ' },
        { lat: 16.3307, lng: 108.0224, name: 'Cảng đến: Cảng Chân Mây' },
      ],
    }, { transaction: t });
    await assignCrew(voy04.id, crewHPG);
    await recordAttendance(voy04.id, crewHPG, 'PreDeparture', dayOffset(-32), crewHPG[0].profile.userId);
    await recordAttendance(voy04.id, crewHPG, 'PostDischarge', dayOffset(-25), crewHPG[0].profile.userId);
    await createMedicalSupplies(voy04.id);
    await createCargoWithItems({
      voyageId: voy04.id,
      cargoName: 'Phân bón NPK Đình Vũ',
      cargoType: 'Phân bón',
      unit: 'MT',
      quantity: 14000,
      status: 'Đã giao thành công',
      items: [{
        itemName: 'Phân NPK bao 50kg', quantity: 14000, weight: 700, hold: extraHolds[shipHPG.id][0],
        isLoaded: true, loadedOn: dayOffset(-33), loadPort: 'Cảng Đình Vũ (Hải Phòng, Việt Nam)',
        isDischarged: true, dischargedOn: dayOffset(-25), dischargePort: 'Cảng Chân Mây (Thừa Thiên Huế, Việt Nam)',
      }],
    });

    // ---------- VOY-05: MV TRUONG SA 18 — Hoàn thành (tàu về xưởng bảo trì) ----------
    const voy05 = await Voyage.create({
      shipId: shipTS18.id,
      departurePort: 'Cảng Nghi Sơn (Thanh Hóa, Việt Nam)',
      destinationPort: 'Cảng Cần Thơ (Cần Thơ, Việt Nam)',
      departureDate: dayOffset(-58),
      arrivalDate: dayOffset(-48),
      status: 'Completed',
      isCrewSufficient: true,
      isCargoLoaded: true,
      routeStatus: 'Approved',
      routeWaypoints: [
        { lat: 19.3149, lng: 105.8145, name: 'Cảng đi: Cảng Nghi Sơn' },
        { lat: 16.35, lng: 108.60, name: 'Ngoài khơi Đà Nẵng / Sơn Trà' },
        { lat: 10.25, lng: 107.05, name: 'Phao số 0 Vũng Tàu' },
        { lat: 19.9043, lng: 105.4629, name: 'Cảng đến: Cảng Cần Thơ' },
      ],
    }, { transaction: t });
    await assignCrew(voy05.id, crewTS18);
    await recordAttendance(voy05.id, crewTS18, 'PreDeparture', dayOffset(-58), crewTS18[0].profile.userId);
    await recordAttendance(voy05.id, crewTS18, 'PostDischarge', dayOffset(-48), crewTS18[0].profile.userId);
    await createMedicalSupplies(voy05.id);
    await createCargoWithItems({
      voyageId: voy05.id,
      cargoName: 'Ngũ cốc nhập khẩu Nghi Sơn',
      cargoType: 'Ngũ cốc',
      unit: 'MT',
      quantity: 650,
      status: 'Đã giao thành công',
      items: [{
        itemName: 'Bắp hạt chở xá', quantity: 650, weight: 650, hold: extraHolds[shipTS18.id][0],
        isLoaded: true, loadedOn: dayOffset(-59), loadPort: 'Cảng Nghi Sơn (Thanh Hóa, Việt Nam)',
        isDischarged: true, dischargedOn: dayOffset(-48), dischargePort: 'Cảng Cần Thơ (Cần Thơ, Việt Nam)',
      }],
    });

    // ---------- VOY-06: MV PHU QUOC PEARL — Đã huỷ ----------
    // Theo hành vi huỷ ở voyageRoutes.js: không còn VoyageCrew, hàng được trả về cảng.
    const voy06 = await Voyage.create({
      shipId: shipPQP.id,
      departurePort: 'Cảng Vũng Tàu (BR-VT, Việt Nam)',
      destinationPort: 'Port Klang (Selangor, Malaysia)',
      departureDate: dayOffset(-14),
      arrivalDate: dayOffset(-6),
      status: 'Cancelled',
      isCrewSufficient: false,
      isCargoLoaded: false,
      issueReason: 'Huỷ chuyến do tàu phải lên đà kiểm định ngoài kế hoạch, hàng đã được trả về cảng.',
      routeStatus: 'Draft',
      routeWaypoints: [],
    }, { transaction: t });

    console.log('✅ Hải trình xong (6 chuyến)');

    // Sinh mã hải trình cho các chuyến đã seed
    const seededVoyages = [voy01, voy02, voy03, voy04, voy05, voy06];
    for (const v of seededVoyages) {
      const yy = v.departureDate ? new Date(v.departureDate).getFullYear().toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
      const seq = String(v.id).padStart(3, '0');
      const voyageCode = `QT17-${yy}${seq}-S`;
      await v.update({ voyageCode }, { transaction: t });
    }


    // ---------- Lô hàng tự do: chưa thuộc hải trình nào ----------
    // Dùng để demo/test luồng tạo hải trình mới rồi gán hàng vào.
    await createCargoWithItems({
      cargoName: 'Thép tấm đóng tàu Phú Mỹ',
      cargoType: 'Sắt thép',
      unit: 'MT',
      quantity: 500,
      status: 'Đã ở cảng',
      items: [{ itemName: 'Thép tấm SS400', quantity: 500, weight: 500, hold: null, isLoaded: false }],
    });
    await createCargoWithItems({
      cargoName: 'Hàng công-ten-nơ Cát Lái - Singapore',
      cargoType: 'Hàng Container',
      unit: 'TEU',
      quantity: 120,
      status: 'Đã ở cảng',
      items: [
        { itemName: 'Container 20ft hàng bách hoá', quantity: 80, weight: 320, hold: null, isLoaded: false },
        { itemName: 'Container 40ft hàng may mặc', quantity: 40, weight: 260, hold: null, isLoaded: false },
      ],
    });
    await createCargoWithItems({
      cargoName: 'Bông sợi nhập khẩu cho nhà máy dệt',
      cargoType: 'Bông sợi',
      unit: 'MT',
      quantity: 300,
      status: 'Đã ở cảng',
      items: [{ itemName: 'Bông sợi ép kiện', quantity: 300, weight: 300, hold: null, isLoaded: false }],
    });

    console.log('✅ Hàng hoá xong (10 lô, trong đó 3 lô chưa gán hải trình)');

    // ================================================================
    // COMMIT
    // ================================================================
    await t.commit();
    console.log('✅ Đã xác nhận giao dịch thành công!');

    const line = '━'.repeat(74);
    console.log('\n🎉 Hoàn tất tạo dữ liệu mẫu cho demo!\n');
    console.log(line);
    console.log(`🔑 MẬT KHẨU CHUNG CHO MỌI TÀI KHOẢN: ${DEMO_PASSWORD}`);
    console.log(line);
    console.log('  Quản trị viên      admin@vinhquang.vn');
    console.log('  ── Đang chạy hải trình ─────────────────────────────────────────────');
    console.log('  Thuyền trưởng      nqminh@vqs.vn          MV VINH QUANG SUN · Đang di chuyển');
    console.log('  Đại phó            tvhung@vqs.vn          MV VINH QUANG SUN · Đang di chuyển');
    console.log('  Thuỷ thủ           tqviet@vqs.vn          MV VINH QUANG SUN · ghi nhật ký boong');
    console.log('  Thợ máy            ldkhoa@vqs.vn          MV VINH QUANG SUN · ghi nhật ký máy');
    console.log('  Thuyền trưởng      nvduong@star66.vn      MV STAR 66 · Đã làm hàng xong');
    console.log('  Đại phó            tvtuong@star66.vn      MV STAR 66 · lập & gửi duyệt lộ trình');
    console.log('  Thuyền trưởng      vdkhanh@biendong09.vn  MV BIEN DONG 09 · Lên kế hoạch');
    console.log('  ── Đội dự bị (Sẵn sàng, 23 người) ──────────────────────────────────');
    console.log('  Thuyền trưởng      nhdang@vinhquang.vn / tcdinh@vinhquang.vn / ltvu@vinhquang.vn');
    console.log('  Đại phó            vdhai@vinhquang.vn / tqhuy@vinhquang.vn / dnson@vinhquang.vn');
    console.log('  Sĩ quan boong      cvloi@vinhquang.vn / mtanh@vinhquang.vn / htkien@vinhquang.vn');
    console.log('  Máy trưởng         lbthanh@vinhquang.vn / nxphu@vinhquang.vn / tvhung2@vinhquang.vn');
    console.log(line);
    console.log('🚢 ĐỘI TÀU (6 chiếc)');
    console.log(line);
    console.log('  MV VINH QUANG SUN   IMO 9215672   → Đang trên hải trình');
    console.log('  MV STAR 66          IMO 9588548   → Đang trên hải trình');
    console.log('  MV BIEN DONG 09     IMO 9631507   → Đang trên hải trình');
    console.log('  MV HAI PHONG GLORY  IMO 9455121   → Sẵn sàng  (dùng tàu này để test tạo hải trình mới)');
    console.log('  MV TRUONG SA 18     IMO 9327104   → Bảo trì');
    console.log('  MV PHU QUOC PEARL   IMO 9702389   → Ngừng hoạt động');
    console.log(line);
    console.log('🗺️  HẢI TRÌNH (6 chuyến)');
    console.log(line);
    console.log(`  #${voy01.id} Hải Phòng → Cát Lái        Đang di chuyển     (đã điểm danh, lộ trình đã duyệt)`);
    console.log(`  #${voy02.id} Cẩm Phả → Đà Nẵng          Đã làm hàng xong   (chờ lập lộ trình + điểm danh)`);
    console.log(`  #${voy03.id} Quy Nhơn → Singapore       Lên kế hoạch       (chờ bốc xếp hàng)`);
    console.log(`  #${voy04.id} Đình Vũ → Chân Mây         Hoàn thành`);
    console.log(`  #${voy05.id} Nghi Sơn → Cần Thơ         Hoàn thành`);
    console.log(`  #${voy06.id} Vũng Tàu → Port Klang      Đã huỷ`);
    console.log(line);
    console.log('👥 THUYỀN VIÊN: 54 người  ·  📦 HÀNG HOÁ: 10 lô (3 lô còn ở cảng, chưa gán chuyến)');
    console.log(`${line}\n`);

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
