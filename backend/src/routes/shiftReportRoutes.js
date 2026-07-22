const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/shiftReportController");

const router = express.Router();
router.use(authMiddleware);

// Xuất Excel nhật ký trực boong theo hải trình
router.get("/:voyageId/export/deck", controller.exportDeck);

module.exports = router;
