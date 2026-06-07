const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const EngineLogValue = sequelize.define("EngineLogValue", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  engineLogId: { type: DataTypes.INTEGER, allowNull: false },
  parameterId: { type: DataTypes.INTEGER, allowNull: false },
  value: { type: DataTypes.FLOAT, allowNull: false },
}, { tableName: "EngineLogValue", timestamps: false });

module.exports = EngineLogValue;