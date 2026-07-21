const express = require('express');
const { Ship, ShipCapacity, Engine, EngineParameter, CargoHold, Equipment } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/vessels - Lấy danh sách toàn bộ tàu
router.get('/', async (req, res) => {
  try {
    const vessels = await Ship.findAll({
      include: [ShipCapacity],
      order: [['id', 'DESC']]
    });
    res.json(vessels);
  } catch (error) {
    console.error('Lỗi lấy danh sách tàu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// GET /api/vessels/:id - Lấy thông tin 1 tàu chi tiết kèm các bảng con
router.get('/:id', async (req, res) => {
  try {
    const vessel = await Ship.findByPk(req.params.id, {
      include: [
        ShipCapacity,
        { model: Engine, include: [EngineParameter] },
        CargoHold
      ]
    });
    if (!vessel) return res.status(404).json({ message: 'Không tìm thấy tàu' });
    res.json(vessel);
  } catch (error) {
    console.error('Lỗi lấy thông tin tàu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// POST /api/vessels - Tạo tàu mới và dữ liệu đi kèm
router.post('/', async (req, res) => {
  try {
    const { basicInfo, capacity, mainEngine, generatorEngines, holds } = req.body;
    
    // 1. Tạo bản ghi Ship
    const newShip = await Ship.create({
      shipName: basicInfo.shipName,
      imoNumber: basicInfo.imoNumber,
      flag: basicInfo.flag,
      status: basicInfo.status || 'Hoạt động'
    });

    // 2. Tạo bản ghi ShipCapacity
    if (capacity) {
      await ShipCapacity.create({
        shipId: newShip.id,
        maxCargoWeight: capacity.maxWeight || 0,
        maxCargoVolume: capacity.maxVolume || 0,
        minCrew: capacity.minCrew || 10,
        maxCrew: capacity.maxCrew || 25
      });
    }

    // 3. Tạo Máy chính
    if (mainEngine && mainEngine.engineName) {
      const me = await Engine.create({ 
        shipId: newShip.id, 
        engineName: mainEngine.engineName, 
        engineType: mainEngine.engineType || 'Diesel 2-kỳ', 
        status: mainEngine.status || 'Hoạt động' 
      });
      // Tạo parameters động
      if (mainEngine.parameters && mainEngine.parameters.length > 0) {
        await EngineParameter.bulkCreate(
          mainEngine.parameters.filter(p => p.name).map(p => ({
            engineId: me.id, name: p.name, minValue: p.minValue || null, maxValue: p.maxValue || null
          }))
        );
      }
    }

    // 4. Tạo Máy đèn
    if (generatorEngines && generatorEngines.length > 0) {
      for (const gen of generatorEngines) {
        if (!gen.engineName) continue;
        const ge = await Engine.create({ 
          shipId: newShip.id, 
          engineName: gen.engineName, 
          engineType: gen.engineType || 'Diesel 4-kỳ', 
          status: gen.status || 'Hoạt động' 
        });
        if (gen.parameters && gen.parameters.length > 0) {
          await EngineParameter.bulkCreate(
            gen.parameters.filter(p => p.name).map(p => ({
              engineId: ge.id, name: p.name, minValue: p.minValue || null, maxValue: p.maxValue || null
            }))
          );
        }
      }
    }

    // 5. Tạo CargoHolds
    if (holds && holds.length > 0) {
      const holdsData = holds.map(h => ({ 
        shipId: newShip.id, 
        holdName: h.name, 
        maxCapacity: h.capacity || 0,
        status: 'Available'
      }));
      await CargoHold.bulkCreate(holdsData);
    }



    res.status(201).json({ message: 'Tạo tàu thành công', ship: newShip });
  } catch (error) {
    console.error('Lỗi tạo tàu:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo tàu', error: error.message });
  }
});

// PUT /api/vessels/:id - Cập nhật thông tin tàu (SYNC)
router.put('/:id', async (req, res) => {
  try {
    const vesselId = req.params.id;
    const { basicInfo, capacity, mainEngine, generatorEngines, holds } = req.body;
    
    const vessel = await Ship.findByPk(vesselId);
    if (!vessel) return res.status(404).json({ message: 'Không tìm thấy tàu' });

    // 1. Update Ship & Capacity
    await vessel.update({
      shipName: basicInfo.shipName,
      imoNumber: basicInfo.imoNumber,
      flag: basicInfo.flag,
      status: basicInfo.status
    });

    if (capacity) {
      let shipCap = await ShipCapacity.findOne({ where: { shipId: vesselId } });
      if (shipCap) {
        await shipCap.update({
          maxCargoWeight: capacity.maxWeight || 0,
          maxCargoVolume: capacity.maxVolume || 0,
          minCrew: capacity.minCrew || 10,
          maxCrew: capacity.maxCrew || 25
        });
      } else {
        await ShipCapacity.create({
          shipId: vesselId,
          maxCargoWeight: capacity.maxWeight || 0,
          maxCargoVolume: capacity.maxVolume || 0,
          minCrew: capacity.minCrew || 10,
          maxCrew: capacity.maxCrew || 25
        });
      }
    }

    // Hàm tiện ích để Sync Params cho Engine
    const syncEngineParams = async (engineId, parameters) => {
      // Xóa params cũ và tạo lại
      await EngineParameter.destroy({ where: { engineId } });
      if (parameters && parameters.length > 0) {
        await EngineParameter.bulkCreate(
          parameters.filter(p => p.name).map(p => ({
            engineId, name: p.name, minValue: p.minValue || null, maxValue: p.maxValue || null
          }))
        );
      }
    };

    // 2. Sync Main Engine
    if (mainEngine) {
      if (mainEngine.id) {
        const me = await Engine.findByPk(mainEngine.id);
        if (me) {
          await me.update({ engineName: mainEngine.engineName, engineType: mainEngine.engineType, status: mainEngine.status });
          await syncEngineParams(me.id, mainEngine.parameters);
        }
      } else if (mainEngine.engineName) {
        const me = await Engine.create({ shipId: vesselId, engineName: mainEngine.engineName, engineType: mainEngine.engineType, status: mainEngine.status });
        await EngineParameter.bulkCreate(
          (mainEngine.parameters || []).filter(p => p.name).map(p => ({
            engineId: me.id, name: p.name, minValue: p.minValue || null, maxValue: p.maxValue || null
          }))
        );
      }
    }

    // 3. Sync Generator Engines
    if (generatorEngines) {
      const existingGens = await Engine.findAll({ where: { shipId: vesselId, engineType: ['Diesel 4-kỳ', 'Turbine'] } }); // Giả định
      const genIdsToKeep = generatorEngines.filter(g => g.id).map(g => g.id);
      
      // Delete missing
      for (const ex of existingGens) {
        if (!genIdsToKeep.includes(ex.id)) {
          await EngineParameter.destroy({ where: { engineId: ex.id } });
          await ex.destroy();
        }
      }

      // Update / Create
      for (const gen of generatorEngines) {
        if (!gen.engineName) continue;
        if (gen.id) {
          const ge = await Engine.findByPk(gen.id);
          if (ge) {
            await ge.update({ engineName: gen.engineName, engineType: gen.engineType, status: gen.status });
            await syncEngineParams(ge.id, gen.parameters);
          }
        } else {
          const ge = await Engine.create({ shipId: vesselId, engineName: gen.engineName, engineType: gen.engineType, status: gen.status });
          await EngineParameter.bulkCreate(
            (gen.parameters || []).filter(p => p.name).map(p => ({
              engineId: ge.id, name: p.name, minValue: p.minValue || null, maxValue: p.maxValue || null
            }))
          );
        }
      }
    }

    // 4. Sync Holds
    if (holds) {
      const existingHolds = await CargoHold.findAll({ where: { shipId: vesselId } });
      const keepIds = holds.filter(h => h.id).map(h => h.id);
      
      for (const ex of existingHolds) {
        if (!keepIds.includes(ex.id)) await ex.destroy();
      }

      for (const h of holds) {
        if (h.id) {
          const hold = await CargoHold.findByPk(h.id);
          if (hold) await hold.update({ holdName: h.name, maxCapacity: h.capacity });
        } else {
          await CargoHold.create({ shipId: vesselId, holdName: h.name, maxCapacity: h.capacity || 0, status: 'Available' });
        }
      }
    }



    res.json({ message: 'Cập nhật tàu thành công', ship: vessel });
  } catch (error) {
    console.error('Lỗi cập nhật tàu:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật tàu', error: error.message });
  }
});

// DELETE /api/vessels/:id - Xoá tàu
router.delete('/:id', async (req, res) => {
  try {
    const vessel = await Ship.findByPk(req.params.id);
    if (!vessel) return res.status(404).json({ message: 'Không tìm thấy tàu' });

    await ShipCapacity.destroy({ where: { shipId: vessel.id } });
    const engines = await Engine.findAll({ where: { shipId: vessel.id } });
    for (const e of engines) {
      await EngineParameter.destroy({ where: { engineId: e.id } });
      await e.destroy();
    }
    await CargoHold.destroy({ where: { shipId: vessel.id } });

    await vessel.destroy();

    res.json({ message: 'Xóa tàu thành công' });
  } catch (error) {
    console.error('Lỗi xoá tàu:', error);
    res.status(500).json({ message: 'Lỗi server khi xoá tàu', error: error.message });
  }
});

// PATCH /api/vessels/engines/:engineId/status — Cập nhật trạng thái máy (chỉ EngineOfficer)
router.patch('/engines/:engineId/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Không tìm thấy token' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'super_secret_key'); }
  catch { return res.status(403).json({ message: 'Token không hợp lệ' }); }
  if (decoded.role !== 'EngineOfficer') {
    return res.status(403).json({ message: 'Chỉ Sĩ quan máy mới được đổi trạng thái máy' });
  }

  const VALID_ENGINE_STATUSES = ['Operational', 'Standby', 'Under Maintenance'];
  const { status } = req.body;
  if (!VALID_ENGINE_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_ENGINE_STATUSES.join(', ')}` });
  }

  try {
    const engine = await Engine.findByPk(req.params.engineId);
    if (!engine) return res.status(404).json({ message: 'Không tìm thấy máy' });
    await engine.update({ status });
    res.json({ message: 'Cập nhật trạng thái máy thành công', engine });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái máy:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// ============================================================
// VESSEL EQUIPMENT (thiết bị của tàu — không phải hải trình)
// ============================================================

// GET /api/vessels/:id/equipments - Lấy thiết bị của tàu
router.get('/:id/equipments', async (req, res) => {
  try {
    const equipments = await Equipment.findAll({
      where: { shipId: req.params.id },
      order: [['equipmentType', 'ASC'], ['equipmentName', 'ASC']]
    });
    res.json(equipments);
  } catch (error) {
    console.error('Lỗi lấy thiết bị tàu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// POST /api/vessels/:id/equipments - Tạo thiết bị cho tàu (Admin/Agency)
router.post('/:id/equipments', authMiddleware, async (req, res) => {
  const { role } = req.user;
  if (role !== 'Admin' && role !== 'Agency') {
    return res.status(403).json({ message: 'Chỉ Admin/Agency mới được thêm thiết bị tàu' });
  }
  try {
    const ship = await Ship.findByPk(req.params.id);
    if (!ship) return res.status(404).json({ message: 'Không tìm thấy tàu' });

    const { equipmentList } = req.body;
    if (!equipmentList || equipmentList.length === 0) {
      return res.status(400).json({ message: 'Danh sách thiết bị không được để trống' });
    }

    const VESSEL_EQ_TYPES = ['Thiết bị cứu sinh', 'Thiết bị chữa cháy', 'Dụng cụ sửa chữa', 'Thiết bị hàng hải', 'Thiết bị liên lạc', 'Khác'];
    const invalid = equipmentList.filter(e => !e.equipmentName || !e.quantity || e.quantity < 1);
    if (invalid.length > 0) {
      return res.status(400).json({ message: 'Tên thiết bị và số lượng là bắt buộc' });
    }

    const eqData = equipmentList.map(e => ({
      shipId: ship.id,
      voyageId: null,
      equipmentName: e.equipmentName,
      equipmentType: e.equipmentType || 'Khác',
      location: e.location || '',
      quantity: Number(e.quantity) || 1,
      expiryNote: e.expiryNote || null,
      brokenCount: 0,
      status: 'Operational'
    }));

    const created = await Equipment.bulkCreate(eqData);
    res.json({ message: 'Tạo thiết bị tàu thành công', equipments: created });
  } catch (error) {
    console.error('Lỗi tạo thiết bị tàu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// PATCH /api/vessels/equipments/:equipmentId/broken-count - Cập nhật số lượng hỏng (EngineOfficer)
router.patch('/equipments/:equipmentId/broken-count', authMiddleware, async (req, res) => {
  if (req.user?.role !== 'EngineOfficer') {
    return res.status(403).json({ message: 'Chỉ Sĩ quan máy mới được cập nhật số thiết bị hỏng' });
  }
  const { brokenCount } = req.body;
  if (brokenCount === undefined || brokenCount === null || brokenCount < 0) {
    return res.status(400).json({ message: 'Số lượng hỏng phải là số ≥ 0' });
  }
  try {
    const equipment = await Equipment.findByPk(req.params.equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
    if (brokenCount > equipment.quantity) {
      return res.status(400).json({ message: `Số lượng hỏng (${brokenCount}) không được lớn hơn số lượng tổng (${equipment.quantity})` });
    }
    await equipment.update({ brokenCount });
    res.json({ message: 'Cập nhật số lượng hỏng thành công', equipment });
  } catch (error) {
    console.error('Lỗi cập nhật:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;
