const { CargoHold, Engine, EngineParameter, Equipment, Ship } = require('./src/models');
const {
  ENGINE_TYPE,
  isMainEngine,
  normalizeEngineName,
  normalizeEngineParameterName,
  normalizeEngineStatus,
} = require('./src/utils/engine');
const {
  normalizeCargoHoldName,
  normalizeEquipmentLocation,
  normalizeEquipmentName,
  normalizeEquipmentType,
  normalizeShipStatus,
} = require('./src/utils/vessel');

async function fix() {
  try {
    const engines = await Engine.findAll();
    let updated = 0;

    for (const engine of engines) {
      const values = {
        status: normalizeEngineStatus(engine.status),
        engineType: isMainEngine(engine) ? ENGINE_TYPE.MAIN : ENGINE_TYPE.AUXILIARY,
        engineName: normalizeEngineName(engine.engineName),
      };
      if (engine.status !== values.status || engine.engineType !== values.engineType || engine.engineName !== values.engineName) {
        await engine.update(values);
        updated += 1;
      }
    }

    const engineParameters = await EngineParameter.findAll();
    let updatedParameters = 0;
    for (const parameter of engineParameters) {
      const name = normalizeEngineParameterName(parameter.name);
      if (parameter.name !== name) {
        await parameter.update({ name });
        updatedParameters += 1;
      }
    }

    const ships = await Ship.findAll();
    let updatedShips = 0;
    for (const ship of ships) {
      const status = normalizeShipStatus(ship.status);
      if (ship.status !== status) {
        await ship.update({ status });
        updatedShips += 1;
      }
    }

    const cargoHolds = await CargoHold.findAll();
    let updatedHolds = 0;
    for (const hold of cargoHolds) {
      const holdName = normalizeCargoHoldName(hold.holdName);
      if (hold.holdName !== holdName) {
        await hold.update({ holdName });
        updatedHolds += 1;
      }
    }

    const equipments = await Equipment.findAll();
    let updatedEquipments = 0;
    for (const equipment of equipments) {
      const values = {
        equipmentName: normalizeEquipmentName(equipment.equipmentName),
        equipmentType: normalizeEquipmentType(equipment.equipmentType),
        location: normalizeEquipmentLocation(equipment.location),
      };
      if (equipment.equipmentName !== values.equipmentName
        || equipment.equipmentType !== values.equipmentType
        || equipment.location !== values.location) {
        await equipment.update(values);
        updatedEquipments += 1;
      }
    }

    console.log(`Đã chuẩn hóa ${updated} máy, ${updatedParameters} thông số máy, ${updatedShips} tàu, ${updatedHolds} khoang hàng và ${updatedEquipments} thiết bị sang tiếng Việt.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
