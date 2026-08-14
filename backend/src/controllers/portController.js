const { Port, Voyage } = require("../models");
const { Op } = require("sequelize");

exports.getAllPorts = async (req, res) => {
  try {
    const ports = await Port.findAll({ order: [["country", "ASC"], ["portName", "ASC"]] });
    res.json({ success: true, data: ports });
  } catch (error) {
    console.error("Error fetching ports:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách cảng" });
  }
};

exports.createPort = async (req, res) => {
  try {
    const { portName, country, lat, lng, status } = req.body;

    if (!portName || !portName.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên cảng" });
    }
    if (!country || !country.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập quốc gia" });
    }
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp tọa độ (lat/lng)" });
    }

    const existing = await Port.findOne({ where: { portName: portName.trim() } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Tên cảng này đã tồn tại" });
    }

    const newPort = await Port.create({
      portName: portName.trim(),
      country: country.trim(),
      lat: Number(lat),
      lng: Number(lng),
      status: status || "Active"
    });
    res.json({ success: true, message: "Thêm cảng thành công", data: newPort });
  } catch (error) {
    console.error("Error creating port:", error);
    res.status(500).json({ success: false, message: "Lỗi thêm cảng" });
  }
};

exports.updatePort = async (req, res) => {
  try {
    const { portName, country, lat, lng, status } = req.body;
    const port = await Port.findByPk(req.params.id);
    if (!port) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cảng" });
    }

    if (portName !== undefined) {
      if (!portName.trim()) {
        return res.status(400).json({ success: false, message: "Tên cảng không được để trống" });
      }
      const existing = await Port.findOne({ where: { portName: portName.trim() } });
      if (existing && existing.id !== port.id) {
        return res.status(409).json({ success: false, message: "Tên cảng này đã tồn tại" });
      }
    }

    // Nếu sửa tên cảng, ta có cập nhật lại các chuyến đi cũ không? 
    // Trong giới hạn này, chỉ sửa tên cảng trong DB Port, Voyage.departurePort là text nên sẽ giữ nguyên giá trị cũ
    // trừ khi viết trigger/hook.

    await port.update({
      portName: portName !== undefined ? portName.trim() : port.portName,
      country: country !== undefined ? country.trim() : port.country,
      lat: lat !== undefined ? Number(lat) : port.lat,
      lng: lng !== undefined ? Number(lng) : port.lng,
      status: status !== undefined ? status : port.status,
    });

    res.json({ success: true, message: "Cập nhật cảng thành công", data: port });
  } catch (error) {
    console.error("Error updating port:", error);
    res.status(500).json({ success: false, message: "Lỗi cập nhật cảng" });
  }
};

exports.deletePort = async (req, res) => {
  try {
    const port = await Port.findByPk(req.params.id);
    if (!port) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cảng" });
    }

    // Kiểm tra xem cảng có đang được sử dụng ở Voyage nào không
    // (Voyage lưu tên cảng theo dạng chuỗi)
    const inUse = await Voyage.findOne({
      where: {
        [Op.or]: [
          { departurePort: port.portName },
          { destinationPort: port.portName }
        ]
      }
    });

    if (inUse) {
      return res.status(400).json({ 
        success: false, 
        message: "Không thể xóa cảng đã được sử dụng trong các hải trình. Vui lòng chuyển trạng thái thành Inactive (Không hoạt động)." 
      });
    }

    await port.destroy();
    res.json({ success: true, message: "Xoá cảng thành công" });
  } catch (error) {
    console.error("Error deleting port:", error);
    res.status(500).json({ success: false, message: "Lỗi xoá cảng" });
  }
};
