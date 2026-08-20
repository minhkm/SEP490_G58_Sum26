const { SewageLog, Voyage, User } = require('../models');
const { sendSewageApprovalEmail } = require('../services/emailService');

exports.getLogsByVoyage = async (req, res) => {
  try {
    const logs = await SewageLog.findAll({
      where: { voyageId: req.params.voyageId },
      include: [
        { model: User, as: 'Requester', attributes: ['id', 'username', 'role'] },
        { model: User, as: 'Approver', attributes: ['id', 'username', 'role'] }
      ],
      order: [['requestDate', 'DESC']]
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const activeVoyageRole = req.headers['x-active-voyage-role'] || req.user.role;
    // Both ChiefOfficer and DeckOfficer could technically record, but strictly ChiefOfficer requested by user
    if (activeVoyageRole !== 'ChiefOfficer' && activeVoyageRole !== 'Admin' && req.user.role !== 'ChiefOfficer' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: `Chỉ Đại phó (ChiefOfficer) mới được tạo yêu cầu xả thải. Vai trò hiện tại của bạn: ${activeVoyageRole} / ${req.user.role}` });
    }

    const { voyageId, dischargeType, distanceFromLand, shipSpeed, volume, plannedDischargeDate, startLat, startLng, remarks } = req.body;

    if (!dischargeType || !plannedDischargeDate || distanceFromLand === undefined || shipSpeed === undefined || volume === undefined || startLat === undefined || startLng === undefined) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (loại xả thải, thời gian, khoảng cách, tốc độ, thể tích, tọa độ).' });
    }

    const allowedDischargeTypes = ['Untreated', 'Comminuted', 'Treated_STP'];
    if (!allowedDischargeTypes.includes(dischargeType)) {
      return res.status(400).json({ message: 'Loại xả thải không hợp lệ.' });
    }

    if (!Number.isFinite(Number(distanceFromLand)) || Number(distanceFromLand) <= 0) {
      return res.status(400).json({ message: 'Khoảng cách với bờ phải là số lớn hơn 0.' });
    }
    if (!Number.isFinite(Number(shipSpeed)) || Number(shipSpeed) <= 0) {
      return res.status(400).json({ message: 'Tốc độ tàu phải là số lớn hơn 0.' });
    }
    if (!Number.isFinite(Number(volume)) || Number(volume) <= 0) {
      return res.status(400).json({ message: 'Thể tích xả thải phải là số lớn hơn 0.' });
    }
    if (!Number.isFinite(Number(startLat)) || Number(startLat) < -90 || Number(startLat) > 90) {
      return res.status(400).json({ message: 'Vĩ độ phải nằm trong khoảng -90 đến 90.' });
    }
    if (!Number.isFinite(Number(startLng)) || Number(startLng) < -180 || Number(startLng) > 180) {
      return res.status(400).json({ message: 'Kinh độ phải nằm trong khoảng -180 đến 180.' });
    }

    const plannedDate = new Date(plannedDischargeDate);
    if (!Number.isFinite(plannedDate.getTime())) {
      return res.status(400).json({ message: 'Thời gian xả thải dự kiến không hợp lệ.' });
    }
    if (plannedDate < new Date()) {
      return res.status(400).json({ message: 'Thời gian xả thải dự kiến không được nằm trong quá khứ.' });
    }

    const voyage = await Voyage.findByPk(voyageId);
    if (!voyage) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });

    if (voyage.status !== 'Underway' && voyage.status !== 'Homeward Bounding') {
      return res.status(400).json({ message: 'Tàu chưa chạy (Status không phải Underway hoặc Homeward Bounding). Không được phép xả nước thải.' });
    }

    let isCompliant = true;
    if (dischargeType === 'Untreated') {
      if (distanceFromLand < 12 || shipSpeed < 4) isCompliant = false;
    } else if (dischargeType === 'Comminuted') {
      if (distanceFromLand < 3 || shipSpeed < 4) isCompliant = false;
    }

    // Process images — dùng Cloudinary URL (file.path)
    const images = req.files ? req.files.map(f => f.path) : [];


    const newLog = await SewageLog.create({
      voyageId,
      requestedBy: req.user.id,
      dischargeType,
      distanceFromLand,
      shipSpeed,
      volume,
      plannedDischargeDate,
      startLat,
      startLng,
      isCompliant,
      remarks,
      images
    });

    res.status(201).json({ message: 'Tạo yêu cầu xả thải thành công.', log: newLog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const activeVoyageRole = req.headers['x-active-voyage-role'] || req.user.role;
    if (activeVoyageRole !== 'Master' && activeVoyageRole !== 'Admin' && req.user.role !== 'Master' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: `Chỉ Thuyền trưởng mới được phê duyệt. Vai trò hiện tại của bạn: ${activeVoyageRole}` });
    }

    const log = await SewageLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });

    log.status = 'Approved';
    log.approvedBy = req.user.id;
    await log.save();

    res.json({ message: 'Đã phê duyệt yêu cầu xả thải.', log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const activeVoyageRole = req.headers['x-active-voyage-role'] || req.user.role;
    if (activeVoyageRole !== 'Master' && activeVoyageRole !== 'Admin' && req.user.role !== 'Master' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: `Chỉ Thuyền trưởng mới được từ chối. Vai trò hiện tại của bạn: ${activeVoyageRole}` });
    }

    const log = await SewageLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });

    log.status = 'Rejected';
    log.approvedBy = req.user.id;
    await log.save();

    res.json({ message: 'Đã từ chối yêu cầu xả thải.', log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
};
