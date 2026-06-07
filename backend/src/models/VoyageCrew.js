const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const VoyageCrew = sequelize.define("VoyageCrew", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  crewId: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.STRING },
}, { tableName: "VoyageCrew", timestamps: false });

module.exports = VoyageCrew;