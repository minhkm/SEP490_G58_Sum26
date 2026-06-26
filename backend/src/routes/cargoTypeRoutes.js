const express = require('express');
const router = express.Router();
const cargoTypeController = require('../controllers/cargoTypeController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// Xem danh sách loại hàng: tất cả role được quản lý hàng hóa
const viewRoles = requireRole('Admin', 'Master', 'ChiefOfficer');
// Cấu hình (thêm/sửa/xoá) loại hàng: chỉ Admin
const adminOnly = requireRole('Admin');

router.get('/', authMiddleware, viewRoles, cargoTypeController.getAllCargoTypes);
router.post('/', authMiddleware, adminOnly, cargoTypeController.createCargoType);
router.put('/:id', authMiddleware, adminOnly, cargoTypeController.updateCargoType);
router.delete('/:id', authMiddleware, adminOnly, cargoTypeController.deleteCargoType);

module.exports = router;
