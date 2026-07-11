const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Equipment = sequelize.define("Equipment", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  equipmentName: { type: DataTypes.STRING },
  equipmentType: { type: DataTypes.STRING },
  location: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: "Operational" },
}, { tableName: "Equipment", timestamps: false });

module.exports = Equipment;