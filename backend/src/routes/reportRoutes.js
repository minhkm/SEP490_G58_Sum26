const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// Module Báo cáo dành cho thuyền viên trên tàu. Admin/Agency (trên bờ) không can thiệp luồng duyệt.
const allReportRoles = requireRole('Master', 'ChiefOfficer', 'DeckOfficer', 'EngineOfficer', 'EngineCrew', 'Sailor');
// FT-10 v2 (vấn đề #2a): Master chỉ tiếp nhận xử lý — không tạo báo cáo
const createReportRoles = requireRole('ChiefOfficer', 'DeckOfficer', 'EngineOfficer', 'EngineCrew', 'Sailor');

router.use(authMiddleware);

router.get('/', allReportRoles, reportController.getReports);
// FT-10 v2 (vấn đề #4): preview ngữ cảnh ca trực trước khi tạo báo cáo (phải đặt TRƯỚC /:id)
router.get('/shift/:shiftId/context', createReportRoles, reportController.getShiftContext);
router.get('/:id', allReportRoles, reportController.getReportById);
router.post('/', createReportRoles, reportController.createReport);
router.post('/:id/replies', allReportRoles, reportController.addReply);
router.post('/:id/escalate', allReportRoles, reportController.escalateReport);
router.post('/:id/resolve', allReportRoles, reportController.resolveReport);
router.post('/:id/close', allReportRoles, reportController.closeReport);
router.post('/:id/reopen', allReportRoles, reportController.reopenReport);
router.post('/:id/reject', allReportRoles, reportController.rejectReport);

module.exports = router;
