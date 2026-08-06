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
app.use("/api/voyages/:voyageId/operation-reports", require("./routes/operationReportRoutes"));
app.use("/api/voyages/:voyageId/operation-report", require("./routes/operationReportRoutes"));
app.use("/api/vessels", require("./routes/vesselRoutes"));
app.use("/api/cargos", require("./routes/cargoRoutes"));
app.use("/api/cargo-types", require("./routes/cargoTypeRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/crews", require("./routes/crewRoutes"));
app.use("/api/engine-logs", require("./routes/engineLogRoutes"));
app.use("/api/shifts", require("./routes/shiftRoutes"));
app.use("/api/shift-reports", require("./routes/shiftReportRoutes"));
app.use("/api/deck-logs", require("./routes/deckLogRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/sewage-logs", require("./routes/sewageRoutes"));

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ Kết nối MySQL thành công");

    await sequelize.query("SET SESSION sql_mode=''");
    await sequelize.sync({ alter: true }); // Tạm thời dùng alter: true để fix lỗi db trên Railway
    console.log("✅ Đồng bộ models xong");


    app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server: http://0.0.0.0:${PORT}`));
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  }
}

start();
