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
      } else {
        let allDischarged = true;
        let anyDischarged = false;
        cargo.CargoItems.forEach(item => {
          if (!item.isDischarged) allDischarged = false;
          if (item.isDischarged) anyDischarged = true;
        });

        let newStatus = 'Đã lên tàu';
        if (allDischarged) newStatus = 'Đã giao thành công';
        else if (anyDischarged) newStatus = 'Đang dỡ hàng';

        if (cargo.status !== newStatus) {
           cargo.status = newStatus;
           await cargo.save();
           console.log(`Updated cargo ${cargo.cargoName} status to ${newStatus}`);
        }
      }
    }
    console.log('Fixed missing cargo items and cargo statuses.');
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

fix();
