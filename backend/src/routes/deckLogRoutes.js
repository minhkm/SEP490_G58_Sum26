const express = require('express');
const router = express.Router();
const deckLogController = require('../controllers/deckLogController');
const authMiddleware = require('../middlewares/authMiddleware');

// Áp dụng xác thực cho toàn bộ routes này
router.use(authMiddleware);

// API lấy danh sách hải trình mà user tham gia
router.get('/my-voyages', deckLogController.getMyVoyages);

// API lấy danh sách ca trực của người dùng trong một hải trình
router.get('/shifts/:voyageId', deckLogController.getShiftsForCurrentUser);

// API ghi nhận nhật ký boong
router.post('/', deckLogController.createDeckLog);

// API xem lịch sử trực boong theo ca trực
router.get('/history/:shiftId', deckLogController.getDeckLogsByShift);

module.exports = router;
