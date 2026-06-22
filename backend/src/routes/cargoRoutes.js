const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// Chỉ Admin, Thuyền trưởng (Master) và Thuyền phó (ChiefOfficer) được quản lý hàng hóa
const cargoRoles = requireRole('Admin', 'Master', 'ChiefOfficer');

router.get('/', authMiddleware, cargoRoles, cargoController.getAllCargos);
router.get('/:id', authMiddleware, cargoRoles, cargoController.getCargoById);
router.post('/', authMiddleware, cargoRoles, cargoController.createCargo);
router.put('/:id', authMiddleware, cargoRoles, cargoController.updateCargo);
router.delete('/:id', authMiddleware, cargoRoles, cargoController.deleteCargo);

module.exports = router;
