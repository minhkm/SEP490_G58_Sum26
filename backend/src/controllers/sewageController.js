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

    const voyage = await Voyage.findByPk(voyageId);
    if (!voyage) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });

    if (voyage.status !== 'Underway') {
      return res.status(400).json({ message: 'Tàu chưa chạy (Status không phải Underway). Không được phép xả nước thải.' });
    }

    let isCompliant = true;
    if (dischargeType === 'Untreated') {
      if (distanceFromLand < 12 || shipSpeed < 4) isCompliant = false;
    } else if (dischargeType === 'Comminuted') {
      if (distanceFromLand < 3 || shipSpeed < 4) isCompliant = false;
    }

    // Process images
    const images = req.files ? req.files.map(f => `/uploads/logs/${f.filename}`) : [];

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

    // Notify Master
    try {
      const master = await User.findOne({ where: { role: 'Master' } });
      if (master) {
        await sendSewageApprovalEmail(master.username, req.user.username, voyageId);
      }
    } catch(err) {
      console.error("Error sending email:", err);
    }

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
