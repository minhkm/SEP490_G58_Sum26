const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const ShipDocument = sequelize.define("ShipDocument", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipId: { type: DataTypes.INTEGER, allowNull: false },
  documentName: { type: DataTypes.STRING },
  documentType: { type: DataTypes.STRING },
  expiryDate: { type: DataTypes.DATEONLY },
  fileUrl: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: "Valid" },
}, { tableName: "ShipDocument", timestamps: false });

module.exports = ShipDocument;