const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Voyage = sequelize.define("Voyage", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipId: { type: DataTypes.INTEGER, allowNull: false },
  departurePort: { type: DataTypes.STRING },
  destinationPort: { type: DataTypes.STRING },
  departureDate: { type: DataTypes.DATEONLY },
  arrivalDate: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.STRING, defaultValue: "Planning" },
  isCrewSufficient: { type: DataTypes.BOOLEAN, defaultValue: false },
  isCargoLoaded: { type: DataTypes.BOOLEAN, defaultValue: false },
  issueReason: { type: DataTypes.TEXT },
  routeWaypoints: { type: DataTypes.JSON },
  routeStatus: { type: DataTypes.STRING, defaultValue: "Draft" },
}, { tableName: "Voyage", timestamps: false });

module.exports = Voyage;