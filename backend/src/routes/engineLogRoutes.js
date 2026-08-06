const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/engineLogController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middleware/upload');
const {
  requireOwnedShift,
  requireOwnedShiftLog,
  requireVoyageAssignment,
  validateEngineValues,
} = require('../middlewares/logOwnershipMiddleware');

// Áp dụng xác thực cho toàn bộ routes này
router.use(authMiddleware);

// Quyền cụ thể được kiểm tra theo chức danh được phân công trong từng hải trình.

// Lấy danh sách hải trình của user
router.get('/my-voyages', ctrl.getMyVoyages);

// Lấy danh sách ca trực (hỗ trợ ?date=YYYY-MM-DD)
router.get('/shifts/:voyageId', ctrl.getShiftsForCurrentUser);

// Tạo nhật ký kiểm tra máy
router.post(
  '/',
  requireOwnedShift({ activeWindow: true, duty: 'Engine' }),
  validateEngineValues(),
  ctrl.createEngineLog,
);

// Cập nhật nhật ký (chỉnh sửa — yêu cầu lý do)
router.put(
  '/:shiftLogId',
  requireOwnedShiftLog('Engine'),
  validateEngineValues({ update: true }),
  ctrl.updateEngineLog,
);

// Xem lịch sử kiểm tra theo ca trực
router.get(
  '/history/shift/:shiftId',
  requireOwnedShift({ source: 'params', duty: 'Engine' }),
  ctrl.getEngineLogsByShift,
);

// Xem lịch sử kiểm tra theo hải trình
router.get('/history/voyage/:voyageId', requireVoyageAssignment('Engine'), ctrl.getEngineLogsByVoyage);

// Upload ảnh cho nhật ký
router.post(
  '/:shiftLogId/images',
  requireOwnedShiftLog('Engine'),
  upload.array('images', 5),
  ctrl.uploadLogImages,
);

// Xem lịch sử chỉnh sửa
router.get('/:shiftLogId/edit-history', requireOwnedShiftLog('Engine'), ctrl.getEditHistory);

module.exports = router;
