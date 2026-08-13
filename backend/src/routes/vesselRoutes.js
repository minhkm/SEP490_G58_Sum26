const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Ship, ShipCapacity, Engine, EngineParameter, CargoHold, Equipment, Voyage, VoyageCrew } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const {
  ENGINE_STATUS,
  ENGINE_TYPE,
  parseEngineStatus,
  normalizeEngineName,
  normalizeEngineParameterName,
  normalizeEngineStatus,
  isMainEngine,
  findDuplicateEngine,
} = require('../utils/engine');
const {
  normalizeCargoHoldName,
  normalizeEquipmentLocation,
  normalizeEquipmentName,
  normalizeEquipmentType,
  normalizeShipStatus,
  equipmentIdentityKey,
  findDuplicateEquipment,
  normalizeEquipmentExpiryDate,
  isEquipmentExpired,
  isEquipmentExpiryAllowed,
} = require('../utils/vessel');
const {
  canonicalVoyageRole,
  isEngineOfficerRole,
  isSupplyManagerRole,
} = require('../utils/voyageRole');

const router = express.Router();

// GET /api/vessels - Lấy danh sách toàn bộ tàu
router.get('/', async (req, res) => {
  try {
    let vessels = await Ship.findAll({
      include: [ShipCapacity],
      order: [['id', 'DESC']]
    });

    const { Op } = require('sequelize');
    const activeVoyages = await Voyage.findAll({
      where: { status: { [Op.notIn]: ['Completed', 'Cancelled'] } }
    });
    const busyShipIds = activeVoyages.map(v => v.shipId);

    vessels = vessels.map(v => {
      const plain = v.toJSON();
      if (busyShipIds.includes(plain.id)) {
        plain.status = 'OnVoyage';
      }
      return plain;
    });

    res.json(vessels);
  } catch (error) {
    console.error('Lỗi lấy danh sách tàu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách tàu' });
  }
});

// GET /api/vessels/:id - Lấy thông tin 1 tàu chi tiết kèm các bảng con
router.get('/:id', async (req, res) => {
  try {
    const vessel = await Ship.findByPk(req.params.id, {
      include: [
        ShipCapacity,
        { model: Engine, include: [EngineParameter] },
        CargoHold,
        Equipment,
      ]
    });
    if (!vessel) return res.status(404).json({ message: 'Không tìm thấy tàu' });
    res.json(vessel);
  } catch (error) {
    console.error('Lỗi lấy thông tin tàu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy thông tin tàu' });
  }
});

// POST /api/vessels - Tạo tàu mới và dữ liệu đi kèm
router.post('/', authMiddleware, requireRole('Admin'), async (req, res) => {
  let transaction;
  try {
    const { basicInfo, capacity, mainEngine, generatorEngines, holds, equipmentList } = req.body;

    if (!basicInfo?.shipName?.trim() || !basicInfo?.imoNumber?.trim()) {
      return res.status(400).json({ message: 'Tên tàu và mã số IMO là bắt buộc.' });
    }

    const existingShip = await Ship.findOne({ where: { imoNumber: basicInfo.imoNumber.trim() } });
    if (existingShip) {
      return res.status(409).json({ message: 'Mã số IMO đã được sử dụng cho một tàu khác.' });
    }

    if (!Array.isArray(equipmentList) || equipmentList.length < 5) {
      return res.status(400).json({ message: 'Vui lòng thêm ít nhất 5 loại thiết bị cho tàu.' });
    }
    const invalidEquipment = equipmentList.some((equipment) => {
      const quantity = Number(equipment?.quantity);
      return !String(equipment?.equipmentName || '').trim()
        || !Number.isInteger(quantity)
        || quantity <= 0;
    });
    if (invalidEquipment) {
      return res.status(400).json({
        message: 'Tên thiết bị là bắt buộc và số lượng phải là số nguyên dương.',
      });
    }
    const duplicateEquipment = findDuplicateEquipment(equipmentList, true);
    if (duplicateEquipment) {
      return res.status(400).json({
        message: `Thiết bị "${String(duplicateEquipment.equipmentName || '').trim()}" bị trùng tên và loại thiết bị.`,
      });
    }
    const invalidExpiryEquipment = equipmentList.find(
      (equipment) => normalizeEquipmentExpiryDate(equipment?.expiryNote) === undefined,
    );
    if (invalidExpiryEquipment) {
      return res.status(400).json({
        message: `Hạn sử dụng của thiết bị "${String(invalidExpiryEquipment.equipmentName || '').trim()}" không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD hoặc chọn Không có hạn sử dụng.`,
      });
    }
    const nonFutureExpiryEquipment = equipmentList.find(
      (equipment) => !isEquipmentExpiryAllowed(equipment?.expiryNote),
    );
    if (nonFutureExpiryEquipment) {
      return res.status(400).json({
        message: `Hạn sử dụng của thiết bị "${String(nonFutureExpiryEquipment.equipmentName || '').trim()}" phải sau ngày hiện tại hoặc chọn Không có hạn sử dụng.`,
      });
    }

    if (!holds || holds.length === 0) {
      return res.status(400).json({ message: 'Tàu phải có ít nhất một khoang chứa hàng.' });
    }
    const totalHoldsCapacity = holds.reduce((sum, h) => sum + Number(h.capacity || 0), 0);
    const shipMaxVolume = Number(capacity?.maxVolume || 0);
    if (totalHoldsCapacity > shipMaxVolume) {
      return res.status(400).json({ message: `Tổng sức chứa của các khoang (${totalHoldsCapacity}) không được vượt quá thể tích của tàu (${shipMaxVolume}).` });
    }

    if (mainEngine?.engineName && parseEngineStatus(mainEngine.status) !== ENGINE_STATUS.OPERATIONAL) {
      return res.status(400).json({ message: 'Máy chính mới bắt buộc phải ở trạng thái Hoạt động.' });
    }
    const newAuxiliaryEngines = (generatorEngines || []).filter((engine) => engine?.engineName);
    const duplicateEngine = findDuplicateEngine([
      ...(mainEngine?.engineName ? [mainEngine] : []),
      ...newAuxiliaryEngines,
    ]);
    if (duplicateEngine) {
      return res.status(400).json({
        message: `Tên máy "${String(duplicateEngine.engineName || '').trim()}" bị trùng. Mỗi máy trên tàu phải có tên riêng.`,
      });
    }
    if (newAuxiliaryEngines.some((engine) => parseEngineStatus(engine.status) === ENGINE_STATUS.MAINTENANCE)) {
      return res.status(400).json({
        message: 'Máy phụ mới chỉ được khai báo ở trạng thái Hoạt động hoặc Dự phòng.',
      });
    }

    transaction = await sequelize.transaction();
    
    // 1. Tạo bản ghi Ship
    const newShip = await Ship.create({
      shipName: basicInfo.shipName,
      imoNumber: basicInfo.imoNumber,
      flag: basicInfo.flag,
      status: normalizeShipStatus(basicInfo.status)
    }, { transaction });

    // 2. Tạo bản ghi ShipCapacity
    if (capacity) {
      await ShipCapacity.create({
        shipId: newShip.id,
        maxCargoWeight: capacity.maxWeight || 0,
        maxCargoVolume: capacity.maxVolume || 0,
        minCrew: capacity.minCrew || 10,
        maxCrew: capacity.maxCrew || 25
      }, { transaction });
    }

    // 3. Tạo Máy chính
    if (mainEngine && mainEngine.engineName) {
      const me = await Engine.create({ 
        shipId: newShip.id, 
        engineName: normalizeEngineName(mainEngine.engineName),
        engineType: ENGINE_TYPE.MAIN,
        status: normalizeEngineStatus(mainEngine.status)
      }, { transaction });
      // Tạo parameters động
      if (mainEngine.parameters && mainEngine.parameters.length > 0) {
        await EngineParameter.bulkCreate(
          mainEngine.parameters.filter(p => p.name).map(p => ({
            engineId: me.id, name: normalizeEngineParameterName(p.name), minValue: p.minValue || null, maxValue: p.maxValue || null
          })),
          { transaction }
        );
      }
    }

    // 4. Tạo Máy phụ
    if (generatorEngines && generatorEngines.length > 0) {
      for (const gen of generatorEngines) {
        if (!gen.engineName) continue;
        const ge = await Engine.create({ 
          shipId: newShip.id, 
          engineName: normalizeEngineName(gen.engineName),
          engineType: ENGINE_TYPE.AUXILIARY,
          status: normalizeEngineStatus(gen.status)
        }, { transaction });
        if (gen.parameters && gen.parameters.length > 0) {
          await EngineParameter.bulkCreate(
            gen.parameters.filter(p => p.name).map(p => ({
              engineId: ge.id, name: normalizeEngineParameterName(p.name), minValue: p.minValue || null, maxValue: p.maxValue || null
            })),
            { transaction }
          );
        }
      }
    }

    // 5. Tạo CargoHolds
    if (holds && holds.length > 0) {
      const holdsData = holds.map(h => ({ 
        shipId: newShip.id, 
        holdName: normalizeCargoHoldName(h.name),
        maxCapacity: h.capacity || 0,
        status: 'Available'
      }));
      await CargoHold.bulkCreate(holdsData, { transaction });
    }

    const equipmentData = equipmentList.map((equipment) => ({
      shipId: newShip.id,
      voyageId: null,
      equipmentName: normalizeEquipmentName(equipment.equipmentName),
      equipmentType: normalizeEquipmentType(equipment.equipmentType),
      location: normalizeEquipmentLocation(equipment.location),
      quantity: Number(equipment.quantity),
      expiryNote: normalizeEquipmentExpiryDate(equipment.expiryNote),
      brokenCount: 0,
      status: 'Hoạt động',
    }));
    await Equipment.bulkCreate(equipmentData, { transaction });

    await transaction.commit();

    res.status(201).json({ message: 'Tạo tàu thành công', ship: newShip });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Lỗi tạo tàu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo tàu' });
  }
});

// PUT /api/vessels/:id - Cập nhật thông tin tàu (SYNC)
router.put('/:id', async (req, res) => {
  try {
    const vesselId = req.params.id;
    const { basicInfo, capacity, mainEngine, generatorEngines, holds, equipmentList } = req.body;

    if (Array.isArray(equipmentList)) {
      const invalidExpiryEquipment = equipmentList.find(
        (equipment) => normalizeEquipmentExpiryDate(equipment?.expiryNote) === undefined,
      );
      if (invalidExpiryEquipment) {
        return res.status(400).json({
          message: `Hạn sử dụng của thiết bị "${String(invalidExpiryEquipment.equipmentName || '').trim()}" không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD hoặc chọn Không có hạn sử dụng.`,
        });
      }
      const nonFutureExpiryEquipment = equipmentList.find(
        (equipment) => !isEquipmentExpiryAllowed(equipment?.expiryNote),
      );
      if (nonFutureExpiryEquipment) {
        return res.status(400).json({
          message: `Hạn sử dụng của thiết bị "${String(nonFutureExpiryEquipment.equipmentName || '').trim()}" phải sau ngày hiện tại hoặc chọn Không có hạn sử dụng.`,
        });
      }
    }

    if (!holds || holds.length === 0) {
      return res.status(400).json({ message: 'Tàu phải có ít nhất một khoang chứa hàng.' });
    }
    const totalHoldsCapacity = holds.reduce((sum, h) => sum + Number(h.capacity || 0), 0);
    const shipMaxVolume = Number(capacity?.maxVolume || 0);
    if (totalHoldsCapacity > shipMaxVolume) {
      return res.status(400).json({ message: `Tổng sức chứa của các khoang (${totalHoldsCapacity}) không được vượt quá thể tích của tàu (${shipMaxVolume}).` });
    }

    const newMainEngine = mainEngine && !mainEngine.id && mainEngine.engineName ? mainEngine : null;
    if (newMainEngine && parseEngineStatus(newMainEngine.status) !== ENGINE_STATUS.OPERATIONAL) {
      return res.status(400).json({ message: 'Máy chính mới bắt buộc phải ở trạng thái Hoạt động.' });
    }
    const newAuxiliaryEngines = (generatorEngines || [])
      .filter((engine) => !engine.id && engine.engineName);
    const duplicateEngine = findDuplicateEngine([
      ...(mainEngine?.engineName ? [mainEngine] : []),
      ...(generatorEngines || []).filter((engine) => engine?.engineName),
    ]);
    if (duplicateEngine) {
      return res.status(400).json({
        message: `Tên máy "${String(duplicateEngine.engineName || '').trim()}" bị trùng. Mỗi máy trên tàu phải có tên riêng.`,
      });
    }
    if (newAuxiliaryEngines.some((engine) => parseEngineStatus(engine.status) === ENGINE_STATUS.MAINTENANCE)) {
      return res.status(400).json({
        message: 'Máy phụ mới chỉ được khai báo ở trạng thái Hoạt động hoặc Dự phòng.',
      });
    }
    
    const vessel = await Ship.findByPk(vesselId);
    if (!vessel) return res.status(404).json({ message: 'Không tìm thấy tàu' });

    const { Op } = require('sequelize');
    const activeVoyage = await Voyage.findOne({
      where: { 
        shipId: vesselId,
        status: { [Op.notIn]: ['Completed', 'Cancelled'] }
      }
    });

    if (activeVoyage) {
      return res.status(400).json({ message: 'Không thể chỉnh sửa cấu hình tàu đang trong hải trình hoạt động.' });
    }

    // 1. Update Ship & Capacity
    await vessel.update({
      shipName: basicInfo.shipName,
      imoNumber: basicInfo.imoNumber,
      flag: basicInfo.flag,
      status: normalizeShipStatus(basicInfo.status)
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
            engineId, name: normalizeEngineParameterName(p.name), minValue: p.minValue || null, maxValue: p.maxValue || null
          }))
        );
      }
    };

    // 2. Sync Main Engine
    if (mainEngine) {
      if (mainEngine.id) {
        const me = await Engine.findByPk(mainEngine.id);
        if (me) {
          await me.update({ engineName: normalizeEngineName(mainEngine.engineName), engineType: ENGINE_TYPE.MAIN });
          await syncEngineParams(me.id, mainEngine.parameters);
        }
      } else if (mainEngine.engineName) {
        const me = await Engine.create({ shipId: vesselId, engineName: normalizeEngineName(mainEngine.engineName), engineType: ENGINE_TYPE.MAIN, status: normalizeEngineStatus(mainEngine.status) });
        await EngineParameter.bulkCreate(
          (mainEngine.parameters || []).filter(p => p.name).map(p => ({
            engineId: me.id, name: normalizeEngineParameterName(p.name), minValue: p.minValue || null, maxValue: p.maxValue || null
          }))
        );
      }
    }

    // 3. Đồng bộ máy phụ
    if (generatorEngines) {
      const shipEngines = await Engine.findAll({ where: { shipId: vesselId } });
      const existingGens = shipEngines.filter((engine) => !isMainEngine(engine));
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
            await ge.update({ engineName: normalizeEngineName(gen.engineName), engineType: ENGINE_TYPE.AUXILIARY });
            await syncEngineParams(ge.id, gen.parameters);
          }
        } else {
          const ge = await Engine.create({ shipId: vesselId, engineName: normalizeEngineName(gen.engineName), engineType: ENGINE_TYPE.AUXILIARY, status: normalizeEngineStatus(gen.status) });
          await EngineParameter.bulkCreate(
            (gen.parameters || []).filter(p => p.name).map(p => ({
              engineId: ge.id, name: normalizeEngineParameterName(p.name), minValue: p.minValue || null, maxValue: p.maxValue || null
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
          if (hold) await hold.update({ holdName: normalizeCargoHoldName(h.name), maxCapacity: h.capacity });
        } else {
          await CargoHold.create({ shipId: vesselId, holdName: normalizeCargoHoldName(h.name), maxCapacity: h.capacity || 0, status: 'Available' });
        }
      }
    }

    // 5. Sync Equipment
    if (equipmentList) {
      const existingEquipments = await Equipment.findAll({ where: { shipId: vesselId } });
      const keepIds = equipmentList.filter(e => e.id).map(e => e.id);
      
      for (const ex of existingEquipments) {
        if (!keepIds.includes(ex.id)) await ex.destroy();
      }

      for (const e of equipmentList) {
        if (e.id) {
          const eq = await Equipment.findByPk(e.id);
          if (eq) await eq.update({
            equipmentName: normalizeEquipmentName(e.equipmentName),
            equipmentType: normalizeEquipmentType(e.equipmentType),
            location: normalizeEquipmentLocation(e.location),
            quantity: Number(e.quantity),
            expiryNote: normalizeEquipmentExpiryDate(e.expiryNote),
          });
        } else {
          await Equipment.create({
            shipId: vesselId,
            voyageId: null,
            equipmentName: normalizeEquipmentName(e.equipmentName),
            equipmentType: normalizeEquipmentType(e.equipmentType),
            location: normalizeEquipmentLocation(e.location),
            quantity: Number(e.quantity),
            expiryNote: normalizeEquipmentExpiryDate(e.expiryNote),
            brokenCount: 0,
            status: 'Hoạt động'
          });
        }
      }
    }

    res.json({ message: 'Cập nhật tàu thành công', ship: vessel });
  } catch (error) {
    console.error('Lỗi cập nhật tàu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật tàu' });
  }
});

// DELETE /api/vessels/:id - Xoá tàu
router.delete('/:id', async (req, res) => {
  try {
    const vessel = await Ship.findByPk(req.params.id);
    if (!vessel) return res.status(404).json({ message: 'Không tìm thấy tàu' });

    const { Op } = require('sequelize');
    const activeVoyage = await Voyage.findOne({
      where: { 
        shipId: req.params.id,
        status: { [Op.notIn]: ['Completed', 'Cancelled'] }
      }
    });

    if (activeVoyage) {
      return res.status(400).json({ message: 'Không thể xóa tàu đang trong hải trình hoạt động' });
    }

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
    res.status(500).json({ message: 'Lỗi máy chủ khi xoá tàu' });
  }
});

// PATCH /api/vessels/engines/:engineId/status — Cập nhật trạng thái máy (chỉ EngineOfficer)
router.patch('/engines/:engineId/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Không tìm thấy thông tin xác thực' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'super_secret_key'); }
  catch { return res.status(403).json({ message: 'Thông tin xác thực không hợp lệ' }); }

  const { status, voyageId } = req.body;
  const normalizedStatus = parseEngineStatus(status);
  if (!normalizedStatus) {
    return res.status(400).json({ message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${Object.values(ENGINE_STATUS).join(', ')}` });
  }

  try {
    const engine = await Engine.findByPk(req.params.engineId);
    if (!engine) return res.status(404).json({ message: 'Không tìm thấy máy' });

    const voyage = voyageId
      ? await Voyage.findByPk(voyageId)
      : await Voyage.findOne({
        where: {
          shipId: engine.shipId,
          status: { [Op.in]: ['Underway', 'Anchored'] },
        },
      });
    if (voyage && voyage.shipId != null && Number(voyage.shipId) !== Number(engine.shipId)) {
      return res.status(400).json({ message: 'Hải trình không thuộc tàu đang quản lý máy.' });
    }
    if (!voyage) {
      return res.status(400).json({ message: 'Không tìm thấy hải trình đang hoạt động của tàu.' });
    }
    if (!['Underway', 'Anchored'].includes(voyage.status)) {
      return res.status(400).json({
        message: 'Chỉ được đổi trạng thái máy khi hải trình đang di chuyển hoặc đang neo đậu.',
      });
    }

    const assignment = voyage && decoded.profileId
      ? await VoyageCrew.findOne({ where: { voyageId: voyage.id, crewId: decoded.profileId } })
      : null;
    const effectiveRole = assignment ? canonicalVoyageRole(assignment.role) : '';
    if (!isEngineOfficerRole(effectiveRole)) {
      return res.status(403).json({ message: 'Chỉ Máy trưởng được phân công trong hải trình mới được đổi trạng thái máy' });
    }

    const mainEngine = isMainEngine(engine);
    if (mainEngine && normalizedStatus === ENGINE_STATUS.STANDBY) {
      return res.status(400).json({ message: 'Máy chính không có trạng thái Dự phòng. Chỉ được chọn Hoạt động hoặc Đang bảo dưỡng.' });
    }

    let voyageUpdated = false;
    let newVoyageStatus = null;
    await engine.update({ status: normalizedStatus });

    if (mainEngine && voyage && !['Completed', 'Cancelled'].includes(voyage.status)) {
      // Máy chính ngừng chạy: hải trình sang Anchored
      if (normalizedStatus !== ENGINE_STATUS.OPERATIONAL && voyage.status !== 'Anchored') {
        await voyage.update({ status: 'Anchored' });
        newVoyageStatus = 'Anchored';
        voyageUpdated = true;
      }
      // Máy chính → hoạt động trở lại: hải trình sang Underway
      if (normalizedStatus === ENGINE_STATUS.OPERATIONAL && voyage.status === 'Anchored') {
        await voyage.update({ status: 'Underway' });
        newVoyageStatus = 'Underway';
        voyageUpdated = true;
      }
    }

    res.json({ message: 'Cập nhật trạng thái máy thành công', engine, voyageUpdated, newVoyageStatus });

  } catch (error) {
    console.error('Lỗi cập nhật trạng thái máy:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật trạng thái máy' });
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
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy thiết bị tàu' });
  }
});

// POST /api/vessels/:id/equipments - Tạo thiết bị cho tàu (chỉ Admin)
router.post('/:id/equipments', authMiddleware, async (req, res) => {
  const { role } = req.user;
  if (role !== 'Admin') {
    return res.status(403).json({ message: 'Chỉ Quản trị viên mới được thêm thiết bị tàu' });
  }
  try {
    const ship = await Ship.findByPk(req.params.id);
    if (!ship) return res.status(404).json({ message: 'Không tìm thấy tàu' });

    const { equipmentList } = req.body;
    if (!Array.isArray(equipmentList) || equipmentList.length === 0) {
      return res.status(400).json({ message: 'Danh sách thiết bị không được để trống' });
    }

    const invalid = equipmentList.filter((equipment) => {
      const quantity = Number(equipment?.quantity);
      return !String(equipment?.equipmentName || '').trim()
        || !Number.isInteger(quantity)
        || quantity <= 0;
    });
    if (invalid.length > 0) {
      return res.status(400).json({
        message: 'Tên thiết bị là bắt buộc và số lượng phải là số nguyên dương',
      });
    }

    const duplicateEquipment = findDuplicateEquipment(equipmentList, true);
    if (duplicateEquipment) {
      return res.status(400).json({
        message: `Thiết bị "${String(duplicateEquipment.equipmentName || '').trim()}" bị trùng tên và loại thiết bị.`,
      });
    }
    const invalidExpiryEquipment = equipmentList.find(
      (equipment) => normalizeEquipmentExpiryDate(equipment?.expiryNote) === undefined,
    );
    if (invalidExpiryEquipment) {
      return res.status(400).json({
        message: `Hạn sử dụng của thiết bị "${String(invalidExpiryEquipment.equipmentName || '').trim()}" không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD hoặc chọn Không có hạn sử dụng.`,
      });
    }
    const nonFutureExpiryEquipment = equipmentList.find(
      (equipment) => !isEquipmentExpiryAllowed(equipment?.expiryNote),
    );
    if (nonFutureExpiryEquipment) {
      return res.status(400).json({
        message: `Hạn sử dụng của thiết bị "${String(nonFutureExpiryEquipment.equipmentName || '').trim()}" phải sau ngày hiện tại hoặc chọn Không có hạn sử dụng.`,
      });
    }

    const existingEquipments = await Equipment.findAll({ where: { shipId: ship.id } });
    const existingKeys = new Set(existingEquipments.map((equipment) => equipmentIdentityKey(equipment, true)));
    const existingDuplicate = equipmentList.find(
      (equipment) => existingKeys.has(equipmentIdentityKey(equipment, true)),
    );
    if (existingDuplicate) {
      return res.status(409).json({
        message: `Thiết bị "${String(existingDuplicate.equipmentName || '').trim()}" cùng loại đã tồn tại trên tàu.`,
      });
    }

    const eqData = equipmentList.map(e => ({
      shipId: ship.id,
      voyageId: null,
      equipmentName: normalizeEquipmentName(e.equipmentName),
      equipmentType: normalizeEquipmentType(e.equipmentType),
      location: normalizeEquipmentLocation(e.location),
      quantity: Number(e.quantity),
      expiryNote: normalizeEquipmentExpiryDate(e.expiryNote),
      brokenCount: 0,
      status: 'Hoạt động'
    }));

    const created = await Equipment.bulkCreate(eqData);
    res.json({ message: 'Tạo thiết bị tàu thành công', equipments: created });
  } catch (error) {
    console.error('Lỗi tạo thiết bị tàu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo thiết bị tàu' });
  }
});

// PATCH /api/vessels/equipments/:equipmentId/broken-count - Ghi nhận số lượng hỏng phát sinh
router.patch('/equipments/:equipmentId/broken-count', authMiddleware, async (req, res) => {
  const { brokenCount } = req.body;
  const additionalBrokenCount = Number(brokenCount);
  if (!Number.isInteger(additionalBrokenCount) || additionalBrokenCount <= 0) {
    return res.status(400).json({ message: 'Số lượng hỏng mới phải là số nguyên dương' });
  }
  try {
    const equipment = await Equipment.findByPk(req.params.equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Không tìm thấy thiết bị' });

    const voyage = await Voyage.findOne({
      where: { shipId: equipment.shipId, status: { [Op.notIn]: ['Completed', 'Cancelled'] } },
    });
    const assignment = voyage && req.user.profileId
      ? await VoyageCrew.findOne({ where: { voyageId: voyage.id, crewId: req.user.profileId } })
      : null;
    const effectiveRole = assignment
      ? canonicalVoyageRole(assignment.role)
      : (voyage ? '' : canonicalVoyageRole(req.user?.role));
    if (!isSupplyManagerRole(effectiveRole)) {
      return res.status(403).json({ message: 'Chỉ Thuyền trưởng hoặc Đại phó mới được cập nhật số thiết bị hỏng' });
    }
    if (!voyage) {
      return res.status(400).json({ message: 'Chỉ được cập nhật thiết bị khi tàu đang trong hải trình.' });
    }
    if (voyage.status !== 'Underway') {
      return res.status(400).json({ message: 'Chỉ được cập nhật thiết bị khi hải trình đang di chuyển.' });
    }

    const currentBrokenCount = Number(equipment.brokenCount) || 0;
    const remainingGood = Math.max(0, Number(equipment.quantity) - currentBrokenCount);
    if (remainingGood > 0 && isEquipmentExpired(equipment.expiryNote)) {
      return res.status(400).json({ message: `${equipment.equipmentName} đã hết hạn sử dụng.` });
    }
    const nextBrokenCount = currentBrokenCount + additionalBrokenCount;
    if (nextBrokenCount > equipment.quantity) {
      const remaining = Math.max(0, equipment.quantity - currentBrokenCount);
      return res.status(400).json({ message: `Chỉ còn ${remaining} thiết bị tốt có thể ghi nhận hỏng` });
    }
    await equipment.update({ brokenCount: nextBrokenCount });
    res.json({ message: 'Ghi nhận số lượng hỏng mới thành công', equipment });
  } catch (error) {
    console.error('Lỗi cập nhật:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật số thiết bị hỏng' });
  }
});

module.exports = router;
