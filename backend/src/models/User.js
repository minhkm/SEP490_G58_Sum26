const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false }, // Master, ChiefOfficer, DeckOfficer, EngineOfficer, Sailor
  status: { type: DataTypes.STRING, defaultValue: "Active" },
}, {
  tableName: "User",
  timestamps: false,
});

module.exports = User;