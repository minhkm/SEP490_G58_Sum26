const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const EngineParameter = sequelize.define("EngineParameter", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  engineId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // vd: "RPM", "Nhiệt độ", "Áp suất dầu"
  minValue: { type: DataTypes.FLOAT },
  maxValue: { type: DataTypes.FLOAT },
}, { tableName: "EngineParameter", timestamps: false });

module.exports = EngineParameter;