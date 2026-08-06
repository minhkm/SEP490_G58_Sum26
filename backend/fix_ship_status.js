const { Op } = require('sequelize');
const { Ship, Voyage } = require('./src/models');

async function fix() {
  try {
    const activeVoyages = await Voyage.findAll({
      where: { status: { [Op.notIn]: ['Completed', 'Cancelled'] } }
    });
    for (const v of activeVoyages) {
      if (v.shipId) {
        await Ship.update({ status: 'Ðang làm vi?c' }, { where: { id: v.shipId } });
        console.log(Updated ship \ to Ðang làm vi?c);
      }
    }
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
