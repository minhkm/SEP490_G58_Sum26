const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Engine = sequelize.define("Engine", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipId: { type: DataTypes.INTEGER, allowNull: false },
  engineName: { type: DataTypes.STRING },
  engineType: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: "Operational" },
}, { tableName: "Engine", timestamps: false });

module.exports = Engine;