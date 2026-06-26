const { CargoType } = require("../models");

exports.getAllCargoTypes = async (req, res) => {
  try {
    const cargoTypes = await CargoType.findAll({ order: [["name", "ASC"]] });
    res.json({ success: true, data: cargoTypes });
  } catch (error) {
    console.error("Error fetching cargo types:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách loại hàng" });
  }
};

exports.createCargoType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên loại hàng" });
    }

    const existing = await CargoType.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Loại hàng này đã tồn tại" });
    }

    const newType = await CargoType.create({ name: name.trim(), description });
    res.json({ success: true, message: "Thêm loại hàng thành công", data: newType });
  } catch (error) {
    console.error("Error creating cargo type:", error);
    res.status(500).json({ success: false, message: "Lỗi thêm loại hàng" });
  }
};

exports.updateCargoType = async (req, res) => {
  try {
    const { name, description } = req.body;
    const cargoType = await CargoType.findByPk(req.params.id);
    if (!cargoType) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại hàng" });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: "Tên loại hàng không được để trống" });
      }
      const existing = await CargoType.findOne({ where: { name: name.trim() } });
      if (existing && existing.id !== cargoType.id) {
        return res.status(409).json({ success: false, message: "Loại hàng này đã tồn tại" });
      }
    }

    await cargoType.update({
      name: name !== undefined ? name.trim() : cargoType.name,
      description: description !== undefined ? description : cargoType.description,
    });

    res.json({ success: true, message: "Cập nhật loại hàng thành công", data: cargoType });
  } catch (error) {
    console.error("Error updating cargo type:", error);
    res.status(500).json({ success: false, message: "Lỗi cập nhật loại hàng" });
  }
};

exports.deleteCargoType = async (req, res) => {
  try {
    const cargoType = await CargoType.findByPk(req.params.id);
    if (!cargoType) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại hàng" });
    }

    await cargoType.destroy();
    res.json({ success: true, message: "Xoá loại hàng thành công" });
  } catch (error) {
    console.error("Error deleting cargo type:", error);
    res.status(500).json({ success: false, message: "Lỗi xoá loại hàng" });
  }
};
