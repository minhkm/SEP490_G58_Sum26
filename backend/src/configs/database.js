const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false, // bật true nếu muốn xem câu SQL Sequelize chạy
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
    pool: {
      afterConnect: (conn, done) => {
        conn.query("SET SESSION sql_mode=''", (err) => done(err, conn));
      },
    },
  }
);

module.exports = sequelize;