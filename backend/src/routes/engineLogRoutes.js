const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/engineLogController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middleware/upload');

// Áp dụng xác thực cho toàn bộ routes này
router.use(authMiddleware);

// Lấy danh sách hải trình của user
router.get('/my-voyages', ctrl.getMyVoyages);

// Lấy danh sách ca trực (hỗ trợ ?date=YYYY-MM-DD)
router.get('/shifts/:voyageId', ctrl.getShiftsForCurrentUser);

// Tạo nhật ký kiểm tra máy
router.post('/', ctrl.createEngineLog);

// Cập nhật nhật ký (chỉnh sửa — yêu cầu lý do)
router.put('/:shiftLogId', ctrl.updateEngineLog);

// Xem lịch sử kiểm tra theo ca trực
router.get('/history/shift/:shiftId', ctrl.getEngineLogsByShift);

// Xem lịch sử kiểm tra theo hải trình
router.get('/history/voyage/:voyageId', ctrl.getEngineLogsByVoyage);

// Upload ảnh cho nhật ký
router.post('/:shiftLogId/images', upload.array('images', 5), ctrl.uploadLogImages);

// Xem lịch sử chỉnh sửa
router.get('/:shiftLogId/edit-history', ctrl.getEditHistory);

module.exports = router;
