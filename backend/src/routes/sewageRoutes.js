const express = require('express');
const router = express.Router();
const sewageController = require('../controllers/sewageController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

router.use(authMiddleware);

router.get('/voyage/:voyageId', sewageController.getLogsByVoyage);
router.post('/', upload.array('images', 5), sewageController.createRequest);
router.put('/:id/approve', sewageController.approveRequest);
router.put('/:id/reject', sewageController.rejectRequest);

module.exports = router;
