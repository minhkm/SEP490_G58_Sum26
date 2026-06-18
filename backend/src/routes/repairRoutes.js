const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const repair = require('../controllers/repairController');

// Engine Officer tạo repair task (dựa trên nhật ký ca trực)
router.post('/tasks', auth, repair.createRepairTask);

// Lấy danh sách repair tasks
router.get('/tasks', auth, repair.getRepairTasks);

// Lấy danh sách thợ máy có thể giao việc
router.get('/available-crew', auth, repair.getAvailableCrew);

// Lấy máy đèn dự phòng còn hoạt động
router.get('/standby-generators', auth, repair.getStandbyGenerators);

// Engine Officer giao việc sửa
router.put('/:id/assign', auth, repair.assignTask);

// Thợ máy bắt đầu sửa
router.put('/:id/start', auth, repair.startRepair);

// Thợ máy sửa xong → gửi báo cáo (Repair Log)
router.put('/:id/submit-log', auth, repair.submitRepairLog);

// Engine Officer kiểm tra + ghi nhận (Record Repair Log)
router.put('/:id/verify', auth, repair.verifyAndRecord);

// Thuyền trưởng duyệt báo cáo
router.put('/:id/review', auth, repair.masterReview);

module.exports = router;
