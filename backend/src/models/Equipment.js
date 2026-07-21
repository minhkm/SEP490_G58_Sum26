const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Equipment = sequelize.define("Equipment", {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId:      { type: DataTypes.INTEGER, allowNull: true },   // null = equipment của tàu (không phải hải trình)
  shipId:        { type: DataTypes.INTEGER, allowNull: true },   // null = equipment của hải trình (thiết bị y tế)
  equipmentName: { type: DataTypes.STRING, allowNull: false },
  equipmentType: { type: DataTypes.STRING },
  location:      { type: DataTypes.STRING },
  quantity:      { type: DataTypes.INTEGER, defaultValue: 1 },
  expiryNote:    { type: DataTypes.STRING, allowNull: true },    // ghi chú hạn sử dụng (text tự do)
  brokenCount:   { type: DataTypes.INTEGER, defaultValue: 0 },   // số lượng hỏng
  status:        { type: DataTypes.STRING, defaultValue: "Operational" },
}, { tableName: "Equipment", timestamps: false });

module.exports = Equipment;