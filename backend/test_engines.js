const { Voyage, Ship, Engine, EngineParameter, VoyageCrew, CrewProfile } = require('./src/models');
const { Op } = require('sequelize');

async function check() {
  try {
    let voyages = await Voyage.findAll({
      include: [
        { model: Ship, include: [{ model: Engine, include: [EngineParameter] }] }
      ]
    });
    
    if (voyages.length === 0) {
      console.log('No voyages. Creating one...');
      const ship = await Ship.findOne();
      const crew = await CrewProfile.findOne();
      const newVoyage = await Voyage.create({
        shipId: ship.id,
        voyageCode: 'V-001',
        departurePort: 'Port A',
        destinationPort: 'Port B',
        departureDate: new Date(),
        status: 'Underway'
      });
      await VoyageCrew.create({
        voyageId: newVoyage.id,
        crewId: crew.id
      });
      voyages = await Voyage.findAll({
        include: [
          { model: Ship, include: [{ model: Engine, include: [EngineParameter] }] }
        ]
      });
    }
    
    console.log(JSON.stringify(voyages[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
