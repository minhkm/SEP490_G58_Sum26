const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Port = sequelize.define("Port", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  portName: { type: DataTypes.STRING, allowNull: false, unique: true },
  country: { type: DataTypes.STRING, allowNull: false },
  lat: { type: DataTypes.FLOAT, allowNull: false },
  lng: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "Active" }, // Active, Inactive
}, { tableName: "Port", timestamps: false });

module.exports = Port;
