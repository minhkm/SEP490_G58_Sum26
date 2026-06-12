const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, cargoController.getAllCargos);

module.exports = router;
