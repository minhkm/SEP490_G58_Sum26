const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const controller = require("../controllers/operationReportController");

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

router.get("/preview", controller.preview);
router.get("/export", controller.exportExcel);
router.get("/", controller.list);
router.get("/:reportId", controller.getOne);
router.post("/finalize", controller.finalize);
router.post("/:reportId/acknowledge", controller.acknowledge);

module.exports = router;
