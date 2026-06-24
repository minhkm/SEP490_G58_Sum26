const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CargoItem = sequelize.define("CargoItem", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cargoId: { type: DataTypes.INTEGER, allowNull: false },
  itemName: { type: DataTypes.STRING },
  quantity: { type: DataTypes.INTEGER },
  weight: { type: DataTypes.FLOAT },
  volume: { type: DataTypes.FLOAT, defaultValue: 0 },
  isLoaded: { type: DataTypes.BOOLEAN, defaultValue: false },
  holdId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: "CargoItem", timestamps: false });

module.exports = CargoItem;