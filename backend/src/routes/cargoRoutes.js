const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, cargoController.getAllCargos);
router.post('/', authMiddleware, cargoController.createCargo);
router.put('/:id', authMiddleware, cargoController.updateCargo);
router.delete('/:id', authMiddleware, cargoController.deleteCargo);

module.exports = router;
