const sequelize = require("./src/configs/database");
const { DataTypes } = require("sequelize");

async function run() {
  try {
    await sequelize.getQueryInterface().addColumn('CargoItem', 'holdId', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    console.log("Column holdId added to CargoItem successfully.");
  } catch (e) {
    if (e.message.includes("Duplicate column name")) {
      console.log("Column already exists.");
    } else {
      console.error(e);
    }
  }
  process.exit();
}
run();
