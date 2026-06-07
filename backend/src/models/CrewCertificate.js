const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CrewCertificate = sequelize.define("CrewCertificate", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  crewId: { type: DataTypes.INTEGER, allowNull: false },
  certificateName: { type: DataTypes.STRING },
  issueDate: { type: DataTypes.DATEONLY },
  expiryDate: { type: DataTypes.DATEONLY },
  fileUrl: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: "Valid" },
}, {
  tableName: "CrewCertificate",
  timestamps: false,
});

module.exports = CrewCertificate;