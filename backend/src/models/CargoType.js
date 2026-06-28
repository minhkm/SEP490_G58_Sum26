const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CargoType = sequelize.define("CargoType", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING },
}, { tableName: "CargoType", timestamps: false });

module.exports = CargoType;
