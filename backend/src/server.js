const express = require("express");
const { sequelize } = require("./models"); // ⬅ đổi chỗ này
require("dotenv").config();

const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const voyageRoutes = require("./routes/voyageRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/voyages", voyageRoutes);
app.use("/api/vessels", require("./routes/vesselRoutes"));
app.use("/api/cargos", require("./routes/cargoRoutes"));
app.use("/api/cargo-types", require("./routes/cargoTypeRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/crews", require("./routes/crewRoutes"));
app.use("/api/engine-logs", require("./routes/engineLogRoutes"));
app.use("/api/deck-logs", require("./routes/deckLogRoutes"));

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
