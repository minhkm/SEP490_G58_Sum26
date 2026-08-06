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

// Chỉ Thợ máy (EngineCrew) mới được ghi nhật ký trực máy
router.use((req, res, next) => {
  if (req.user?.role !== 'EngineCrew') {
    return res.status(403).json({ message: 'Chỉ Thợ máy mới được truy cập nhật ký trực máy.' });
  }
  next();
});

// Lấy danh sách hải trình của user
router.get('/my-voyages', ctrl.getMyVoyages);

// Lấy danh sách ca trực (hỗ trợ ?date=YYYY-MM-DD)
router.get('/shifts/:voyageId', ctrl.getShiftsForCurrentUser);

// Tạo nhật ký kiểm tra máy
router.post(
  '/',
  requireOwnedShift({ activeWindow: true }),
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
  requireOwnedShift({ source: 'params' }),
  ctrl.getEngineLogsByShift,
);

// Xem lịch sử kiểm tra theo hải trình
router.get('/history/voyage/:voyageId', requireVoyageAssignment, ctrl.getEngineLogsByVoyage);

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
