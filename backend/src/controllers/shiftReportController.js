const { Voyage, VoyageCrew } = require("../models");
const { buildDeckReport, createDeckWorkbook } = require("../services/shiftReportService");

const normalizedRole = (req) => String(req.user.role || "").replace(/\s+/g, "").toLowerCase();

// Kiểm tra quyền + thuộc hải trình (giống operationReport)
async function authorizeVoyage(req, voyageId, allowedRoles) {
  const role = normalizedRole(req);
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, message: "Bạn không có quyền xuất báo cáo này." };
  }
  const voyage = await Voyage.findByPk(voyageId);
  if (!voyage) return { ok: false, status: 404, message: "Không tìm thấy hải trình." };

  if (!["admin", "agency"].includes(role)) {
    if (!req.user.profileId) return { ok: false, status: 403, message: "Tài khoản chưa có hồ sơ thuyền viên." };
    const assignment = await VoyageCrew.findOne({ where: { voyageId, crewId: req.user.profileId } });
    if (!assignment) return { ok: false, status: 403, message: "Bạn không được phân công vào hải trình này." };
  }
  return { ok: true, voyage };
}

// GET /api/shift-reports/:voyageId/export/deck — sĩ quan boong xuất Excel nhật ký trực boong
exports.exportDeck = async (req, res) => {
  try {
    const permit = await authorizeVoyage(req, req.params.voyageId, ["admin", "agency", "master", "chiefofficer", "deckofficer"]);
    if (!permit.ok) return res.status(permit.status).json({ message: permit.message });

    const data = await buildDeckReport(req.params.voyageId);
    if (!data) return res.status(404).json({ message: "Không tìm thấy hải trình." });

    const workbook = await createDeckWorkbook(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Nhat_Ky_Truc_Boong_Voyage-${req.params.voyageId}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch (error) {
    console.error("Error exporting deck shift report:", error);
    res.status(500).json({ message: "Lỗi xuất báo cáo Excel." });
  }
};
