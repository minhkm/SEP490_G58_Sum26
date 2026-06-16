const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/engineLogController');
const authMiddleware = require('../middlewares/authMiddleware');

// Áp dụng xác thực cho toàn bộ routes này
router.use(authMiddleware);

// Lấy hải trình đang hoạt động (auto-detect)
router.get('/active-voyage', ctrl.getActiveVoyage);

// Lấy danh sách ca trực của người dùng hiện tại
router.get('/shifts/:voyageId', ctrl.getShiftsForCurrentUser);

// Tạo nhật ký kiểm tra máy
router.post('/', ctrl.createEngineLog);

// Xem lịch sử kiểm tra theo ca trực
router.get('/history/shift/:shiftId', ctrl.getEngineLogsByShift);

// Xem lịch sử kiểm tra theo hải trình
router.get('/history/voyage/:voyageId', ctrl.getEngineLogsByVoyage);

module.exports = router;
