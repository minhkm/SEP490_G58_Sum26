const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Cargo = sequelize.define("Cargo", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  cargoName: { type: DataTypes.STRING },
  cargoType: { type: DataTypes.STRING },
  totalWeight: { type: DataTypes.FLOAT },
  status: { type: DataTypes.STRING, defaultValue: "Registered" },
}, { tableName: "Cargo", timestamps: false });

module.exports = Cargo;