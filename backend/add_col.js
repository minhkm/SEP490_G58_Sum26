const { sequelize } = require('./src/models');
sequelize.query("ALTER TABLE Voyage ADD COLUMN routeStatus VARCHAR(255) DEFAULT 'Draft'")
  .then(() => { console.log('Column added'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
