const express = require("express");
const router = express.Router();
const portController = require("../controllers/portController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require('../middlewares/roleMiddleware');

const adminOnly = requireRole('Admin');

// Mọi người đã đăng nhập (cần token) đều có thể xem danh sách cảng
router.get("/", authMiddleware, portController.getAllPorts);

// Chỉ Admin mới được tạo/sửa/xoá
router.post(
  "/",
  authMiddleware,
  adminOnly,
  portController.createPort
);

router.put(
  "/:id",
  authMiddleware,
  adminOnly,
  portController.updatePort
);

router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  portController.deletePort
);

module.exports = router;
