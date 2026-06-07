const express = require("express");
const { sequelize } = require("./models"); // ⬅ đổi chỗ này
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ Kết nối MySQL thành công");

    await sequelize.sync(); // alter: cập nhật bảng khi model đổi
    console.log("✅ Đồng bộ models xong");

    app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  }
}

start();