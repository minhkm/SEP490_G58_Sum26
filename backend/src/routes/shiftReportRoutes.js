const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/shiftReportController");

const router = express.Router();
router.use(authMiddleware);

// Xuất Excel nhật ký trực boong / máy theo hải trình
router.get("/:voyageId/export/deck", controller.exportDeck);
router.get("/:voyageId/export/engine", controller.exportEngine);

module.exports = router;
