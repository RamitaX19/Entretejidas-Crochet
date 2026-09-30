const { Pool } = require("pg");
require("dotenv").config();

// Fechas en hora de Argentina, igual que la base (ver migraciones/004_zona_horaria.sql).
// Render corre en UTC: sin esto, "hoy" en el panel cambiaría a las 21 h.
process.env.TZ = process.env.TZ || "America/Argentina/Buenos_Aires";

// En la nube (Render, Neon...) la base llega en una sola dirección: DATABASE_URL.
// En la compu se sigue usando DB_USER, DB_PASSWORD, DB_HOST, DB_PORT y DB_NAME.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // Las bases en la nube piden conexión cifrada. Con la dirección interna de Render se puede apagar con DB_SSL=false.
      ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
    });

module.exports = pool;
