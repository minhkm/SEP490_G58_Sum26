const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const DeckLogEntry = sequelize.define("DeckLogEntry", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deckLogId: { type: DataTypes.INTEGER, allowNull: false },
  hour: { type: DataTypes.INTEGER, allowNull: false, comment: "Giờ 1-24" },
  courseTrue: { type: DataTypes.FLOAT, comment: "Hướng đi thật" },
  courseGyro: { type: DataTypes.FLOAT, comment: "La bàn con quay LBCQ" },
  courseSteer: { type: DataTypes.FLOAT, comment: "La bàn lái" },
  gyroError: { type: DataTypes.FLOAT, comment: "Sai số LBCQ" },
  courseMagnetic: { type: DataTypes.FLOAT, comment: "La bàn từ" },
  speed: { type: DataTypes.FLOAT, comment: "Tốc độ kế (Log)" },
  rpm: { type: DataTypes.FLOAT, comment: "Số vòng/phút" },
  windDirection: { type: DataTypes.STRING(10), comment: "Hướng gió (N, NE, S...)" },
  windForce: { type: DataTypes.INTEGER, comment: "Sức gió (Beaufort)" },
  weather: { type: DataTypes.STRING(20), comment: "Thời tiết viết tắt" },
  barometer: { type: DataTypes.FLOAT, comment: "Khí áp kế" },
  seaState: { type: DataTypes.INTEGER, comment: "Trạng thái biển" },
  visibility: { type: DataTypes.FLOAT, comment: "Tầm nhìn xa (hải lý)" },
  airTemp: { type: DataTypes.FLOAT, comment: "Nhiệt độ không khí °C" },
  seaTemp: { type: DataTypes.FLOAT, comment: "Nhiệt độ biển °C" },
}, { tableName: "DeckLogEntry", timestamps: false });

module.exports = DeckLogEntry;
