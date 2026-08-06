const { Engine } = require('./src/models');
const { Op } = require('sequelize');

async function fix() {
  try {
    const [updated] = await Engine.update(
      { status: 'Operational' },
      { 
        where: { 
          status: { [Op.in]: ['Active', 'Hoạt động'] } 
        } 
      }
    );
    console.log(`Updated ${updated} engines to 'Operational'.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
