const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const editRoles = requireRole('Admin', 'Agency');

router.get('/', authMiddleware, cargoController.getAllCargos);
router.get('/:id', authMiddleware, cargoController.getCargoById);
router.post('/', authMiddleware, editRoles, cargoController.createCargo);
router.put('/:id', authMiddleware, editRoles, cargoController.updateCargo);
router.delete('/:id', authMiddleware, editRoles, cargoController.deleteCargo);

module.exports = router;
