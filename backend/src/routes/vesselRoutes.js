const express = require('express');
const { Ship, ShipCapacity, Engine, EngineParameter, CargoHold, Equipment } = require('../models');

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
        CargoHold,
        Equipment
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
    const { basicInfo, capacity, mainEngine, generatorEngines, holds, equipment } = req.body;
    
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

    // 6. Tạo Equipment
    if (equipment && equipment.length > 0) {
      const eqData = equipment.map(e => ({ 
        shipId: newShip.id, 
        equipmentName: e.name, 
        equipmentType: e.type, 
        location: e.location,
        status: e.condition || 'Operational' 
      }));
      await Equipment.bulkCreate(eqData);
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
    const { basicInfo, capacity, mainEngine, generatorEngines, holds, equipment } = req.body;
    
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
          maxCrew: capacity.maxCrew || 25
        });
      } else {
        await ShipCapacity.create({
          shipId: vesselId,
          maxCargoWeight: capacity.maxWeight || 0,
          maxCargoVolume: capacity.maxVolume || 0,
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

    // 5. Sync Equipment
    if (equipment) {
      const existingEqs = await Equipment.findAll({ where: { shipId: vesselId } });
      const keepIds = equipment.filter(e => e.id).map(e => e.id);
      
      for (const ex of existingEqs) {
        if (!keepIds.includes(ex.id)) await ex.destroy();
      }

      for (const e of equipment) {
        if (e.id) {
          const eq = await Equipment.findByPk(e.id);
          if (eq) await eq.update({ equipmentName: e.name, equipmentType: e.type, location: e.location, status: e.condition });
        } else {
          await Equipment.create({ shipId: vesselId, equipmentName: e.name, equipmentType: e.type, location: e.location, status: e.condition || 'Operational' });
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
    await Equipment.destroy({ where: { shipId: vessel.id } });
    await vessel.destroy();

    res.json({ message: 'Xóa tàu thành công' });
  } catch (error) {
    console.error('Lỗi xoá tàu:', error);
    res.status(500).json({ message: 'Lỗi server khi xoá tàu', error: error.message });
  }
});

module.exports = router;
