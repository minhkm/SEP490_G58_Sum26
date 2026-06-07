const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CrewProfile = sequelize.define("CrewProfile", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  fullName: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  cccd: { type: DataTypes.STRING },
  department: { type: DataTypes.STRING }, // Deck, Engine
  position: { type: DataTypes.STRING },
}, {
  tableName: "CrewProfile",
  timestamps: false,
});

module.exports = CrewProfile;