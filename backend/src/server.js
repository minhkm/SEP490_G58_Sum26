const express = require("express");
const { sequelize } = require("./models"); // ⬅ đổi chỗ này
require("dotenv").config();

const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const voyageRoutes = require("./routes/voyageRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/voyages", voyageRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ Kết nối MySQL thành công");

    await sequelize.sync({ alter: true }); // Dùng lại alter để giữ data
    console.log("✅ Đồng bộ models xong");

    app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  }
}

start();
