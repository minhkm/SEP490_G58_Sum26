const { Engine } = require('./src/models');
async function check() {
  const engines = await Engine.findAll();
  console.log(engines.map(e => ({ id: e.id, name: e.engineName, type: e.engineType, status: e.status })));
  process.exit(0);
}
check();
