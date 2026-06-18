const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const repair = require('../controllers/repairController');

// Engine Officer báo lỗi máy
router.post('/report', auth, repair.reportFailure);

// Lấy danh sách repair tasks (tất cả roles đều xem được)
router.get('/tasks', auth, repair.getRepairTasks);

// Lấy danh sách crew có thể giao việc
router.get('/available-crew', auth, repair.getAvailableCrew);

// Engine Officer giao việc sửa
router.put('/:id/assign', auth, repair.assignTask);

// Maintenance Crew bắt đầu sửa
router.put('/:id/start', auth, repair.startRepair);

// Maintenance Crew hoàn thành sửa + nộp báo cáo
router.put('/:id/complete', auth, repair.completeRepair);

// Engine Officer xác nhận kết quả
router.put('/:id/verify', auth, repair.verifyRepair);

// Master duyệt báo cáo cuối cùng
router.put('/:id/review', auth, repair.masterReview);

module.exports = router;
