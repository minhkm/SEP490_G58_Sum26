const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Notification = sequelize.define("Notification", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipientUserId: { type: DataTypes.INTEGER, allowNull: false },
  actorUserId: { type: DataTypes.INTEGER, allowNull: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  metadata: { type: DataTypes.JSON, allowNull: true },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "Notification",
  timestamps: true,
});

module.exports = Notification;
