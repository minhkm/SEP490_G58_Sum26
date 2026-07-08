const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Shift = sequelize.define("Shift", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  crewId: { type: DataTypes.INTEGER, allowNull: false },
  startTime: { type: DataTypes.DATE },
  endTime: { type: DataTypes.DATE },
  position: { type: DataTypes.STRING }, // vị trí/nhiệm vụ trong ca (preset theo bộ phận)
  note: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: "Scheduled" }, // Scheduled, InProgress, Completed, Cancelled
  // Bàn giao ca (lưu trên ca NHẬN): người trực trước bàn giao, người vào ca nhận
  handoverNote: { type: DataTypes.TEXT },          // ghi chú tình trạng do người bàn giao viết
  handedOverAt: { type: DataTypes.DATE },          // thời điểm người ca trước xác nhận bàn giao
  receivedAt: { type: DataTypes.DATE },            // thời điểm người ca này xác nhận nhận ca
  handoverLate: { type: DataTypes.BOOLEAN, defaultValue: false }, // bàn giao/nhận ngoài cửa sổ cho phép
}, { tableName: "Shift", timestamps: false });

module.exports = Shift;