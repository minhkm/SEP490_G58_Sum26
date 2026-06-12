const { sequelize, User } = require('./src/models');

async function addColumn() {
  try {
    await sequelize.authenticate();
    await sequelize.query('ALTER TABLE User ADD COLUMN requiresPasswordChange BOOLEAN DEFAULT false;');
    console.log('Đã thêm cột requiresPasswordChange');
    process.exit(0);
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
      console.log('Cột đã tồn tại, không cần thêm.');
    } else {
      console.error('Lỗi:', error);
    }
    process.exit(0);
  }
}

addColumn();
