const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Report = sequelize.define("Report", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: false }, // crewId người tạo

  // Phân loại báo cáo
  reportCategory: { type: DataTypes.STRING, defaultValue: "Routine" }, // Routine (thường nhật), Incident (sự cố/khẩn cấp)
  reportType: { type: DataTypes.STRING }, // Leave, ShiftSwap, ShiftException (Routine) | Breakdown, ShipIssue, Other (Incident)
  department: { type: DataTypes.STRING }, // Deck, Engine — chọn thang bậc escalation
  priority: { type: DataTypes.STRING, defaultValue: "Normal" }, // Normal, High, Urgent

  // Ngữ cảnh để định tuyến tới officer đúng tàu
  shipId: { type: DataTypes.INTEGER, allowNull: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: true },

  title: { type: DataTypes.STRING },
  content: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: "Open" }, // Open, InProgress, Resolved, Closed, Rejected

  // Con trỏ "báo cáo đang ở cấp nào" (BR-22 + Escalate)
  currentHandlerRole: { type: DataTypes.STRING }, // role đang giữ lượt xử lý
  currentHandlerId: { type: DataTypes.INTEGER, allowNull: true }, // crewId người cụ thể được ghim

  resolvedAt: { type: DataTypes.DATE, allowNull: true },
  closedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "Report", timestamps: true }); // bật createdAt/updatedAt cho list/sort

module.exports = Report;
