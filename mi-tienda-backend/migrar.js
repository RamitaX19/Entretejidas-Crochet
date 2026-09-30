// Aplica las migraciones de la carpeta migraciones/ en orden: npm run migrar
// Todas solo agregan (IF NOT EXISTS), así que correrlas de nuevo no rompe nada.
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const carpeta = path.join(__dirname, "migraciones");

async function migrar() {
  const archivos = fs.readdirSync(carpeta).filter((archivo) => archivo.endsWith(".sql")).sort();
  const cliente = await pool.connect();

  try {
    // Si el backend está usando una tabla, espera hasta 10 segundos en vez de quedarse colgado.
    await cliente.query("SET lock_timeout = '10s'");

    for (const archivo of archivos) {
      try {
        await cliente.query(fs.readFileSync(path.join(carpeta, archivo), "utf8"));
      } catch (error) {
        // Cada archivo corre entre BEGIN y COMMIT: si algo falla, se deshace entero.
        await cliente.query("ROLLBACK").catch(() => {});
        throw new Error(`${archivo}: ${error.message}`);
      }
    }

    const base = (await cliente.query("SELECT current_database() AS nombre")).rows[0].nombre;
    console.log(`Base "${base}" al día. Migraciones: ${archivos.join(", ")}`);
  } finally {
    cliente.release();
  }
}

migrar()
  .catch((error) => {
    console.error("No se pudieron aplicar las migraciones:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
