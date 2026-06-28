const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/deckLogController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middleware/upload');

// Áp dụng xác thực cho toàn bộ routes này
router.use(authMiddleware);

// Lấy danh sách hải trình mà user tham gia
router.get('/my-voyages', ctrl.getMyVoyages);

// Lấy danh sách ca trực (hỗ trợ ?date=YYYY-MM-DD)
router.get('/shifts/:voyageId', ctrl.getShiftsForCurrentUser);

// Ghi nhận nhật ký boong
router.post('/', ctrl.createDeckLog);

// Cập nhật nhật ký (chỉnh sửa — yêu cầu lý do)
router.put('/:shiftLogId', ctrl.updateDeckLog);

// Xem lịch sử trực boong theo ca trực
router.get('/history/:shiftId', ctrl.getDeckLogsByShift);

// Upload ảnh cho nhật ký
router.post('/:shiftLogId/images', upload.array('images', 5), ctrl.uploadLogImages);

// Xem lịch sử chỉnh sửa
router.get('/:shiftLogId/edit-history', ctrl.getEditHistory);

module.exports = router;
