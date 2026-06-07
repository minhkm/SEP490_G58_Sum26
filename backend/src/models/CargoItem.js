const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CargoItem = sequelize.define("CargoItem", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cargoId: { type: DataTypes.INTEGER, allowNull: false },
  itemName: { type: DataTypes.STRING },
  quantity: { type: DataTypes.INTEGER },
  weight: { type: DataTypes.FLOAT },
}, { tableName: "CargoItem", timestamps: false });

module.exports = CargoItem;