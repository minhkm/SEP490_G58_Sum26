const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Ship = sequelize.define("Ship", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipName: { type: DataTypes.STRING },
  imoNumber: { type: DataTypes.STRING },
  flag: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: "Active" },
}, { tableName: "Ship", timestamps: false });

module.exports = Ship;