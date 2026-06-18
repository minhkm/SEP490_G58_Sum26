const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const repair = require('../controllers/repairController');

// Danh sách repair records
router.get('/tasks', auth, repair.getRepairTasks);

// Máy đèn dự phòng
router.get('/standby-generators', auth, repair.getStandbyGenerators);

// E/O bắt đầu sửa máy
router.post('/start', auth, repair.startRepair);

// E/O sửa xong, viết báo cáo
router.put('/:id/report', auth, repair.submitReport);

// Thuyền trưởng duyệt
router.put('/:id/review', auth, repair.masterReview);

module.exports = router;
