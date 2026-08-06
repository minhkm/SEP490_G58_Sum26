const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/deckLogController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middleware/upload');
const {
  requireOwnedShift,
  requireOwnedShiftLog,
} = require('../middlewares/logOwnershipMiddleware');

// Áp dụng xác thực cho toàn bộ routes này
router.use(authMiddleware);

// Quyền cụ thể được kiểm tra theo chức danh được phân công trong từng hải trình.

// Lấy danh sách hải trình mà user tham gia
router.get('/my-voyages', ctrl.getMyVoyages);

// Lấy danh sách ca trực (hỗ trợ ?date=YYYY-MM-DD)
router.get('/shifts/:voyageId', ctrl.getShiftsForCurrentUser);

// Ghi nhận nhật ký boong
router.post('/', requireOwnedShift({ activeWindow: true, duty: 'Deck' }), ctrl.createDeckLog);

// Cập nhật nhật ký (chỉnh sửa — yêu cầu lý do)
router.put('/:shiftLogId', requireOwnedShiftLog('Deck'), ctrl.updateDeckLog);

// Xem lịch sử trực boong theo ca trực
router.get(
  '/history/:shiftId',
  requireOwnedShift({ source: 'params', duty: 'Deck' }),
  ctrl.getDeckLogsByShift,
);

// Upload ảnh cho nhật ký
router.post(
  '/:shiftLogId/images',
  requireOwnedShiftLog('Deck'),
  upload.array('images', 5),
  ctrl.uploadLogImages,
);

// Xem lịch sử chỉnh sửa
router.get('/:shiftLogId/edit-history', requireOwnedShiftLog('Deck'), ctrl.getEditHistory);

module.exports = router;
