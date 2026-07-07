const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// Module Báo cáo dành cho thuyền viên trên tàu. Admin/Agency (trên bờ) không can thiệp luồng duyệt.
const reportRoles = requireRole('Master', 'ChiefOfficer', 'DeckOfficer', 'EngineOfficer', 'EngineCrew', 'Sailor');

router.use(authMiddleware, reportRoles);

router.get('/', reportController.getReports);
router.get('/:id', reportController.getReportById);
router.post('/', reportController.createReport);
router.post('/:id/replies', reportController.addReply);
router.post('/:id/escalate', reportController.escalateReport);
router.post('/:id/resolve', reportController.resolveReport);
router.post('/:id/close', reportController.closeReport);
router.post('/:id/reopen', reportController.reopenReport);
router.post('/:id/reject', reportController.rejectReport);

module.exports = router;
