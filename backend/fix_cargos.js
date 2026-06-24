const { Cargo, CargoItem } = require('./src/models');

async function fix() {
  try {
    const cargos = await Cargo.findAll({
      include: [{ model: CargoItem }]
    });

    for (const cargo of cargos) {
      if (!cargo.CargoItems || cargo.CargoItems.length === 0) {
        console.log(`Creating item for cargo: ${cargo.cargoName}`);
        await CargoItem.create({
          cargoId: cargo.id,
          itemName: cargo.cargoName,
          quantity: 1,
          weight: cargo.totalWeight,
          volume: cargo.totalVolume,
          isLoaded: false
        });
      }
    }
    console.log('Fixed missing cargo items.');
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

fix();
