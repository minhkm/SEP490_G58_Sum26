const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CargoType = sequelize.define("CargoType", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  category: { type: DataTypes.STRING, defaultValue: "Bulk" },
  defaultUnit: { type: DataTypes.STRING, defaultValue: "MT" },
  stowageFactor: { type: DataTypes.FLOAT, defaultValue: 1.0 },
  description: { type: DataTypes.STRING },
}, { tableName: "CargoType", timestamps: false });

module.exports = CargoType;
