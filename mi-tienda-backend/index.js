const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const pool = require("./db");
const jwt = require("jsonwebtoken");
const { verificarToken, verificarAdmin } = require("./auth");
const mercadoPago = require("./mercadopago");
const correos = require("./correos");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { Limite } = require("./limites");

const app = express();
// En Render las visitas llegan a través de un proxy: así req.ip es la IP de la persona y no la del proxy.
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

// Las fotos y los archivos digitales se guardan en la base: en Render, lo que se guarda en disco
// se borra cada vez que el servidor se reinicia. Estas carpetas quedan para lo que se subió antes.
const carpetaImagenes = path.join(__dirname, "uploads");
// Los archivos digitales no se publican: solo se bajan desde /api/descargas.
const carpetaArchivos = path.join(__dirname, "archivos");

app.use("/uploads", express.static(carpetaImagenes, {
  setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
}));

const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("TIPO_NO_PERMITIDO"));
    }
  },
});

// Solo las fotos viejas están en disco (/uploads/...); las nuevas se borran junto con su fila.
function borrarImagen(ruta) {
  if (!ruta?.startsWith("/uploads/")) return;
  fs.unlink(path.join(carpetaImagenes, path.basename(ruta)), () => {});
}

const tiposArchivo = {
  ".pdf": "application/pdf",
  ".zip": "application/zip",
};

const subidaArchivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  defParamCharset: "utf8",
  fileFilter: (req, file, cb) => {
    if (tiposArchivo[path.extname(file.originalname).toLowerCase()]) {
      cb(null, true);
    } else {
      cb(new Error("TIPO_NO_PERMITIDO"));
    }
  },
});

// Archivo digital que se subió cuando se guardaban en la carpeta archivos/.
function borrarArchivo(nombre) {
  if (!nombre) return;
  fs.unlink(path.join(carpetaArchivos, path.basename(nombre)), () => {});
}

const MAX_OPCIONES = 3;
const MAX_VARIANTES = 100;

function vacio(valor) {
  return valor === null || valor === undefined || valor === "";
}

// "Color: Rojo · Talle: M", en el orden de las opciones del producto.
function etiquetaVariante(valores, opciones) {
  return opciones.map((opcion) => `${opcion.nombre}: ${valores[opcion.nombre]}`).join(" · ");
}

// Revisa las opciones (Color, Talle...) y las combinaciones que se venden, con su precio y stock.
function validarVariantes(opcionesCrudas, variantesCrudas) {
  if (!Array.isArray(opcionesCrudas) || opcionesCrudas.length === 0) {
    return { opciones: [], variantes: [] };
  }

  if (opcionesCrudas.length > MAX_OPCIONES) {
    return { error: `Cada producto puede tener hasta ${MAX_OPCIONES} opciones (por ejemplo color y talle)` };
  }

  const opciones = [];

  for (const opcion of opcionesCrudas) {
    const nombre = texto(opcion?.nombre);
    const valores = Array.isArray(opcion?.valores) ? opcion.valores.map(texto).filter(Boolean) : [];

    if (!nombre || nombre.length > 30) {
      return { error: "Cada opción necesita un nombre de hasta 30 letras (por ejemplo Color)" };
    }

    if (opciones.some((o) => o.nombre.toLowerCase() === nombre.toLowerCase())) {
      return { error: `La opción "${nombre}" está repetida` };
    }

    if (valores.length === 0 || valores.some((valor) => valor.length > 30)) {
      return { error: `La opción "${nombre}" necesita valores de hasta 30 letras (por ejemplo Rojo, Azul)` };
    }

    if (new Set(valores.map((valor) => valor.toLowerCase())).size !== valores.length) {
      return { error: `La opción "${nombre}" tiene valores repetidos` };
    }

    opciones.push({ nombre, valores });
  }

  if (!Array.isArray(variantesCrudas) || variantesCrudas.length === 0) {
    return { error: "Elegí al menos una combinación para vender" };
  }

  if (variantesCrudas.length > MAX_VARIANTES) {
    return { error: `Un producto puede tener hasta ${MAX_VARIANTES} combinaciones` };
  }

  const variantes = [];
  const vistas = new Set();

  for (const variante of variantesCrudas) {
    const valores = {};

    for (const opcion of opciones) {
      const valor = variante?.valores?.[opcion.nombre];

      if (!opcion.valores.includes(valor)) {
        return { error: `A una combinación le falta elegir ${opcion.nombre}` };
      }

      valores[opcion.nombre] = valor;
    }

    const etiqueta = etiquetaVariante(valores, opciones);

    if (vistas.has(etiqueta)) {
      return { error: `La combinación ${etiqueta} está repetida` };
    }

    vistas.add(etiqueta);

    const precio = vacio(variante.precio) ? null : Number(variante.precio);
    const stock = vacio(variante.stock) ? null : Number(variante.stock);

    if (precio !== null && (!Number.isInteger(precio) || precio < 1)) {
      return { error: `El precio de ${etiqueta} tiene que ser un número entero mayor a 0` };
    }

    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      return { error: `El stock de ${etiqueta} tiene que ser un número entero, de 0 para arriba` };
    }

    variantes.push({ valores, precio, stock });
  }

  return { opciones, variantes };
}

const OFERTA_MAXIMA = 90;

// Precio con la oferta del producto (porcentaje), redondeado a pesos y nunca menor a $1.
// La tienda hace la misma cuenta para mostrarlo (precioConOferta en src/variantes.js).
function precioConOferta(precio, oferta) {
  if (!oferta) return precio;
  return Math.max(1, Math.round((precio * (100 - oferta)) / 100));
}

function validarProducto(datos = {}) {
  const { nombre, precio, tipo, descripcion, stock = null, categoriaId = null } = datos;
  const oferta = vacio(datos.oferta) ? 0 : Number(datos.oferta);

  if (!nombre || !precio || !tipo) {
    return { error: "Faltan datos" };
  }

  if (!Number.isInteger(Number(precio)) || Number(precio) < 1) {
    return { error: "El precio tiene que ser un número entero mayor a 0" };
  }

  if (tipo !== "fisico" && tipo !== "digital") {
    return { error: "El tipo tiene que ser físico o digital" };
  }

  if (!Number.isInteger(oferta) || oferta < 0 || oferta > OFERTA_MAXIMA) {
    return { error: `El descuento tiene que ser un porcentaje entero, de 0 a ${OFERTA_MAXIMA}` };
  }

  const categoria = vacio(categoriaId) ? null : Number(categoriaId);

  if (categoria !== null && !Number.isInteger(categoria)) {
    return { error: "La categoría no es válida" };
  }

  // Las variantes son solo para productos físicos.
  const revision = tipo === "fisico" ? validarVariantes(datos.opciones, datos.variantes) : { opciones: [], variantes: [] };

  if (revision.error) {
    return { error: revision.error };
  }

  // Con variantes, el stock se lleva en cada combinación.
  const llevaStock = tipo === "fisico" && revision.variantes.length === 0 && !vacio(stock);

  if (llevaStock && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
    return { error: "El stock tiene que ser un número entero, de 0 para arriba" };
  }

  return {
    producto: {
      nombre,
      precio: Number(precio),
      oferta,
      tipo,
      descripcion: descripcion || "",
      stock: llevaStock ? Number(stock) : null,
      categoriaId: categoria,
      opciones: revision.opciones,
      variantes: revision.variantes,
    },
  };
}

const SELECT_PRODUCTOS = `
  SELECT p.id, p.nombre, p.precio, p.oferta, p.tipo, p.descripcion, p.stock, p.opciones,
    p.categoria_id AS "categoriaId", c.nombre AS categoria,
    c.padre_id AS "categoriaPadreId", cp.nombre AS "categoriaPadre",
    p.archivo_nombre AS "archivoNombre",
    COALESCE((
      SELECT json_agg(json_build_object('id', i.id, 'ruta', i.ruta) ORDER BY i.orden, i.id)
      FROM producto_imagenes i WHERE i.producto_id = p.id
    ), '[]'::json) AS imagenes,
    COALESCE((
      SELECT json_agg(json_build_object('id', v.id, 'valores', v.valores, 'precio', v.precio, 'stock', v.stock)
        ORDER BY v.orden, v.id)
      FROM producto_variantes v WHERE v.producto_id = p.id
    ), '[]'::json) AS variantes
  FROM productos p
  LEFT JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN categorias cp ON cp.id = c.padre_id
`;

async function obtenerProducto(id) {
  const resultado = await pool.query(`${SELECT_PRODUCTOS} WHERE p.id = $1`, [id]);
  return resultado.rows[0];
}

// Guarda las combinaciones del producto: actualiza las que ya existían (así los pedidos
// siguen apuntando a ellas), agrega las nuevas y borra las que ya no se venden.
async function guardarVariantes(cliente, productoId, variantes) {
  const conservadas = [];

  for (const [orden, variante] of variantes.entries()) {
    const resultado = await cliente.query(
      `INSERT INTO producto_variantes (producto_id, valores, precio, stock, orden)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (producto_id, valores)
         DO UPDATE SET precio = EXCLUDED.precio, stock = EXCLUDED.stock, orden = EXCLUDED.orden
       RETURNING id`,
      [productoId, JSON.stringify(variante.valores), variante.precio, variante.stock, orden],
    );
    conservadas.push(resultado.rows[0].id);
  }

  await cliente.query(
    "DELETE FROM producto_variantes WHERE producto_id = $1 AND id <> ALL($2::int[])",
    [productoId, conservadas],
  );
}

app.get("/api/productos", async (req, res) => {
  try {
    const resultado = await pool.query(`${SELECT_PRODUCTOS} ORDER BY p.id`);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

app.post("/api/productos", verificarToken, verificarAdmin, async (req, res) => {
  const validacion = validarProducto(req.body);

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  const { nombre, precio, oferta, tipo, descripcion, stock, categoriaId, opciones, variantes } = validacion.producto;
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");
    const resultado = await cliente.query(
      `INSERT INTO productos (nombre, precio, tipo, descripcion, stock, categoria_id, opciones, oferta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [nombre, precio, tipo, descripcion, stock, categoriaId, JSON.stringify(opciones), oferta]
    );
    await guardarVariantes(cliente, resultado.rows[0].id, variantes);
    await cliente.query("COMMIT");
    res.status(201).json(await obtenerProducto(resultado.rows[0].id));
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error.code === "23503") {
      return res.status(400).json({ error: "La categoría elegida ya no existe" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear producto" });
  } finally {
    cliente.release();
  }
});

app.put("/api/productos/:id", verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const validacion = validarProducto(req.body);

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  const { nombre, precio, oferta, tipo, descripcion, stock, categoriaId, opciones, variantes } = validacion.producto;
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");
    const resultado = await cliente.query(
      `UPDATE productos SET nombre = $1, precio = $2, tipo = $3, descripcion = $4, stock = $5,
         categoria_id = $6, opciones = $7, oferta = $8
       WHERE id = $9 RETURNING id`,
      [nombre, precio, tipo, descripcion, stock, categoriaId, JSON.stringify(opciones), oferta, id]
    );

    if (resultado.rows.length === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await guardarVariantes(cliente, id, variantes);
    await cliente.query("COMMIT");
    res.json(await obtenerProducto(id));
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error.code === "23503") {
      return res.status(400).json({ error: "La categoría elegida ya no existe" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al editar producto" });
  } finally {
    cliente.release();
  }
});

function leerStock(cuerpo) {
  const { stock = null } = cuerpo ?? {};

  if (vacio(stock)) return { stock: null };

  if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return { error: "El stock tiene que ser un número entero, de 0 para arriba" };
  }

  return { stock: Number(stock) };
}

// Cambia solo el stock, sin tocar el resto del producto (lo usa la sección Stock del panel).
app.put("/api/productos/:id/stock", verificarToken, verificarAdmin, async (req, res) => {
  const lectura = leerStock(req.body);

  if (lectura.error) {
    return res.status(400).json({ error: lectura.error });
  }

  try {
    const resultado = await pool.query(
      `UPDATE productos SET stock = $1
       WHERE id = $2 AND tipo = 'fisico' AND jsonb_array_length(opciones) = 0 RETURNING id`,
      [lectura.stock, req.params.id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Ese producto no existe, es digital o lleva el stock por variante" });
    }

    res.json(await obtenerProducto(req.params.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cambiar el stock" });
  }
});

app.put("/api/variantes/:id/stock", verificarToken, verificarAdmin, async (req, res) => {
  const lectura = leerStock(req.body);

  if (lectura.error) {
    return res.status(400).json({ error: lectura.error });
  }

  try {
    const resultado = await pool.query(
      "UPDATE producto_variantes SET stock = $1 WHERE id = $2 RETURNING producto_id",
      [lectura.stock, req.params.id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Esa variante no existe" });
    }

    res.json(await obtenerProducto(resultado.rows[0].producto_id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cambiar el stock" });
  }
});

app.delete("/api/productos/:id", verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const imagenes = await pool.query("SELECT ruta FROM producto_imagenes WHERE producto_id = $1", [id]);
    const resultado = await pool.query("DELETE FROM productos WHERE id = $1 RETURNING id, archivo", [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    imagenes.rows.forEach((fila) => borrarImagen(fila.ruta));
    borrarArchivo(resultado.rows[0].archivo);
    res.json({ mensaje: "Producto eliminado" });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({ error: "Este producto ya tiene pedidos, así que no se puede eliminar." });
    }
    console.error(error);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

const MAX_IMAGENES = 8;

app.post("/api/productos/:id/imagenes", verificarToken, verificarAdmin, (req, res) => {
  subida.array("imagenes", MAX_IMAGENES)(req, res, async (error) => {
    if (error) {
      let mensaje = "Formato no permitido. Usá JPG, PNG o WEBP";
      if (error.code === "LIMIT_FILE_SIZE") mensaje = "Alguna imagen supera los 5 MB";
      if (error.code === "LIMIT_UNEXPECTED_FILE") mensaje = `Podés subir hasta ${MAX_IMAGENES} fotos a la vez`;
      return res.status(400).json({ error: mensaje });
    }

    const archivos = req.files || [];

    if (archivos.length === 0) {
      return res.status(400).json({ error: "No llegó ninguna imagen" });
    }

    const cliente = await pool.connect();

    try {
      await cliente.query("BEGIN");
      // Bloquea el producto: dos subidas a la vez no pueden pasarse del máximo de fotos.
      const producto = await cliente.query("SELECT id FROM productos WHERE id = $1 FOR UPDATE", [req.params.id]);

      if (producto.rows.length === 0) {
        await cliente.query("ROLLBACK");
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const conteo = await cliente.query(
        "SELECT COUNT(*)::int AS total, COALESCE(MAX(orden), -1) AS ultimo FROM producto_imagenes WHERE producto_id = $1",
        [req.params.id]
      );
      const { total, ultimo } = conteo.rows[0];

      if (total + archivos.length > MAX_IMAGENES) {
        await cliente.query("ROLLBACK");
        return res.status(400).json({
          error: `Cada producto puede tener hasta ${MAX_IMAGENES} fotos. Ya tiene ${total}.`,
        });
      }

      for (const [i, archivo] of archivos.entries()) {
        // La ruta apunta a /api/fotos/:id, que devuelve la foto guardada en la base.
        await cliente.query(
          `WITH nueva AS (SELECT nextval(pg_get_serial_sequence('producto_imagenes', 'id')) AS id)
           INSERT INTO producto_imagenes (id, producto_id, ruta, orden, datos, tipo)
           SELECT id, $1::int, '/api/fotos/' || id, $2::int, $3::bytea, $4::varchar FROM nueva`,
          [req.params.id, ultimo + 1 + i, archivo.buffer, archivo.mimetype]
        );
      }

      await cliente.query("COMMIT");
      res.status(201).json(await obtenerProducto(req.params.id));
    } catch (err) {
      await cliente.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "Error al guardar las imágenes" });
    } finally {
      cliente.release();
    }
  });
});

// Fotos guardadas en la base. Una foto nueva siempre tiene otro id, así que el navegador puede guardarlas.
app.get("/api/fotos/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ error: "Foto no encontrada" });
  }

  try {
    const resultado = await pool.query(
      "SELECT datos, tipo FROM producto_imagenes WHERE id = $1 AND datos IS NOT NULL",
      [req.params.id]
    );
    const foto = resultado.rows[0];

    if (!foto) {
      return res.status(404).json({ error: "Foto no encontrada" });
    }

    res.set({
      "Content-Type": foto.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(foto.datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al traer la foto" });
  }
});

app.delete("/api/imagenes/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      "DELETE FROM producto_imagenes WHERE id = $1 RETURNING producto_id, ruta",
      [req.params.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Foto no encontrada" });
    }

    borrarImagen(resultado.rows[0].ruta);
    res.json(await obtenerProducto(resultado.rows[0].producto_id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar la foto" });
  }
});

app.put("/api/imagenes/:id/portada", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `UPDATE producto_imagenes AS pi
       SET orden = (SELECT MIN(orden) - 1 FROM producto_imagenes WHERE producto_id = pi.producto_id)
       WHERE pi.id = $1
       RETURNING pi.producto_id`,
      [req.params.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Foto no encontrada" });
    }

    res.json(await obtenerProducto(resultado.rows[0].producto_id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cambiar la portada" });
  }
});

app.post("/api/productos/:id/archivo", verificarToken, verificarAdmin, (req, res) => {
  subidaArchivo.single("archivo")(req, res, async (error) => {
    if (error) {
      let mensaje = "Formato no permitido. Usá PDF o ZIP";
      if (error.code === "LIMIT_FILE_SIZE") mensaje = "El archivo supera los 25 MB";
      return res.status(400).json({ error: mensaje });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No llegó ningún archivo" });
    }

    const cliente = await pool.connect();

    try {
      await cliente.query("BEGIN");
      const resultado = await cliente.query("SELECT tipo, archivo FROM productos WHERE id = $1 FOR UPDATE", [req.params.id]);
      const producto = resultado.rows[0];

      if (!producto) {
        await cliente.query("ROLLBACK");
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      if (producto.tipo !== "digital") {
        await cliente.query("ROLLBACK");
        return res.status(400).json({ error: "Solo los productos digitales llevan archivo" });
      }

      await cliente.query(
        `INSERT INTO producto_archivos (producto_id, tipo, datos) VALUES ($1, $2, $3::bytea)
         ON CONFLICT (producto_id) DO UPDATE SET tipo = EXCLUDED.tipo, datos = EXCLUDED.datos, creado_en = now()`,
        [req.params.id, tiposArchivo[path.extname(req.file.originalname).toLowerCase()], req.file.buffer]
      );
      // "archivo" era el nombre en disco del archivo anterior; el nuevo queda en la base.
      await cliente.query(
        "UPDATE productos SET archivo = NULL, archivo_nombre = $1 WHERE id = $2",
        [req.file.originalname, req.params.id]
      );
      await cliente.query("COMMIT");

      borrarArchivo(producto.archivo);
      res.status(201).json(await obtenerProducto(req.params.id));
    } catch (err) {
      await cliente.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "Error al guardar el archivo" });
    } finally {
      cliente.release();
    }
  });
});

app.delete("/api/productos/:id/archivo", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query("SELECT archivo FROM productos WHERE id = $1", [req.params.id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await pool.query("DELETE FROM producto_archivos WHERE producto_id = $1", [req.params.id]);
    await pool.query("UPDATE productos SET archivo = NULL, archivo_nombre = NULL WHERE id = $1", [req.params.id]);
    borrarArchivo(resultado.rows[0].archivo);
    res.json(await obtenerProducto(req.params.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al quitar el archivo" });
  }
});

app.post("/api/registro", async (req, res) => {
  const { nombre, email, contrasena } = req.body;

  if (!nombre || !email || !contrasena) {
    return res.status(400).json({ error: "Faltan datos" });
  }
  try {
    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);

    const resultado = await pool.query(
      "INSERT INTO usuarios (nombre, email, contrasena) VALUES ($1, $2, $3) RETURNING id, nombre, email",
      [nombre, email, contrasenaHasheada],
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Ese email ya esta registrado" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Contraseñas equivocadas: hasta 5 por email cada 15 minutos (protege cada cuenta) y 30 por conexión
// (frena a quien prueba muchas cuentas). Los correos para cambiar la contraseña también tienen tope.
const fallosPorEmail = new Limite({ maximo: 5, minutos: 15 });
const fallosPorIp = new Limite({ maximo: 30, minutos: 15 });
const recuperacionesPorEmail = new Limite({ maximo: 3, minutos: 60 });
const recuperacionesPorIp = new Limite({ maximo: 10, minutos: 60 });

function claveEmail(email) {
  return String(email).trim().toLowerCase();
}

function demasiadosIntentos(res, espera, mensaje) {
  const minutos = Math.ceil(espera / 60000);
  res.set("Retry-After", String(Math.ceil(espera / 1000)));
  return res.status(429).json({ error: mensaje(minutos === 1 ? "1 minuto" : `${minutos} minutos`) });
}

app.post("/api/login", async (req, res) => {
  const { email, contrasena } = req.body ?? {};

  if (!email || !contrasena) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const cuenta = claveEmail(email);
  const espera = Math.max(fallosPorEmail.espera(cuenta), fallosPorIp.espera(req.ip));

  if (espera > 0) {
    return demasiadosIntentos(
      res,
      espera,
      (tiempo) => `Hubo muchos intentos con una contraseña equivocada. Probá de nuevo en ${tiempo} o recuperá tu contraseña.`,
    );
  }

  try {
    const resultado = await pool.query(
      "SELECT * FROM usuarios where email = $1",
      [email],
    );

    const usuario = resultado.rows[0];
    const coincide = usuario ? await bcrypt.compare(contrasena, usuario.contrasena) : false;

    if (!coincide) {
      fallosPorEmail.sumar(cuenta);
      fallosPorIp.sumar(req.ip);
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    fallosPorEmail.olvidar(cuenta);

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, esAdmin: usuario.es_admin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      nombre: usuario.nombre,
      email: usuario.email,
      esAdmin: usuario.es_admin,
      expira: jwt.decode(token).exp * 1000,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesion" });
  }
});

const LARGO_MINIMO_CONTRASENA = 8;

// En la base se guarda el hash del código del link, nunca el código.
function hashDe(codigo) {
  return crypto.createHash("sha256").update(codigo).digest("hex");
}

// "¿Olvidaste tu contraseña?": manda por correo un link que vence en 1 hora y sirve una sola vez.
app.post("/api/recuperar", (req, res) => {
  const email = texto(req.body?.email);

  if (!EMAIL_VALIDO.test(email)) {
    return res.status(400).json({ error: "Escribí un email válido" });
  }

  const cuenta = claveEmail(email);
  const espera = Math.max(recuperacionesPorEmail.espera(cuenta), recuperacionesPorIp.espera(req.ip));

  if (espera > 0) {
    return demasiadosIntentos(res, espera, (tiempo) => `Ya pediste varios correos. Probá de nuevo en ${tiempo}.`);
  }

  recuperacionesPorEmail.sumar(cuenta);
  recuperacionesPorIp.sumar(req.ip);

  // La respuesta es la misma exista o no la cuenta, y el correo se prepara después de responder:
  // así nadie puede averiguar qué emails están registrados.
  res.json({ mensaje: "Si hay una cuenta con ese email, te mandamos un link para crear una contraseña nueva." });
  mandarLinkDeRecuperacion(email);
});

async function mandarLinkDeRecuperacion(email) {
  try {
    if (!correos.configurado()) {
      console.error("No se puede mandar el link para cambiar la contraseña: falta RESEND_API_KEY.");
      return;
    }

    // Sin distinguir mayúsculas, pero si hay una cuenta escrita igual, va primero.
    const usuario = (await pool.query(
      "SELECT id, nombre, email FROM usuarios WHERE lower(email) = lower($1) ORDER BY (email = $1) DESC LIMIT 1",
      [email],
    )).rows[0];

    if (!usuario) return;

    const codigo = crypto.randomBytes(32).toString("hex");
    const guardado = (await pool.query(
      `INSERT INTO recuperaciones (usuario_id, codigo_hash, expira)
       VALUES ($1, $2, LOCALTIMESTAMP + interval '1 hour') RETURNING id, creado_en AS "creadoEn"`,
      [usuario.id, hashDe(codigo)],
    )).rows[0];

    await correos.recuperarContrasena({ ...guardado, nombre: usuario.nombre, email: usuario.email, codigo });
  } catch (error) {
    console.error("No se pudo preparar el link para cambiar la contraseña:", error.message);
  }
}

app.post("/api/restablecer", async (req, res) => {
  const codigo = texto(req.body?.codigo);
  const contrasena = typeof req.body?.contrasena === "string" ? req.body.contrasena : "";

  if (!/^[0-9a-f]{64}$/.test(codigo)) {
    return res.status(400).json({ error: "El link no es válido. Pedí uno nuevo desde Iniciar sesión." });
  }

  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return res.status(400).json({ error: `La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres` });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");
    const recuperacion = (await cliente.query(
      `SELECT r.usuario_id, u.email
       FROM recuperaciones r JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.codigo_hash = $1 AND r.usado_en IS NULL AND r.expira > LOCALTIMESTAMP
       FOR UPDATE OF r`,
      [hashDe(codigo)],
    )).rows[0];

    if (!recuperacion) {
      await cliente.query("ROLLBACK");
      return res.status(400).json({ error: "El link ya se usó o venció. Pedí uno nuevo desde Iniciar sesión." });
    }

    await cliente.query("UPDATE usuarios SET contrasena = $1 WHERE id = $2", [
      await bcrypt.hash(contrasena, 10),
      recuperacion.usuario_id,
    ]);
    // Se anulan también los otros links que haya pedido esa cuenta.
    await cliente.query(
      "UPDATE recuperaciones SET usado_en = LOCALTIMESTAMP WHERE usuario_id = $1 AND usado_en IS NULL",
      [recuperacion.usuario_id],
    );
    await cliente.query("COMMIT");

    // Con la contraseña nueva puede entrar enseguida, aunque antes se haya pasado de intentos.
    fallosPorEmail.olvidar(claveEmail(recuperacion.email));
    res.json({ mensaje: "Listo: ya podés iniciar sesión con tu contraseña nueva." });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al cambiar la contraseña" });
  } finally {
    cliente.release();
  }
});

app.get("/api/me", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT nombre, email, es_admin FROM usuarios WHERE id = $1",
      [req.usuario.id],
    );
    const usuario = resultado.rows[0];

    if (!usuario) {
      return res.status(401).json({ error: "La cuenta ya no existe" });
    }

    res.json({
      nombre: usuario.nombre,
      email: usuario.email,
      esAdmin: usuario.es_admin,
      expira: req.usuario.exp * 1000,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al revisar la sesión" });
  }
});

const ESTADOS_PEDIDO = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];

function datosTransferencia() {
  const { TRANSFERENCIA_TITULAR, TRANSFERENCIA_ALIAS, TRANSFERENCIA_CBU } = process.env;

  if (!TRANSFERENCIA_ALIAS && !TRANSFERENCIA_CBU) return null;

  return {
    titular: TRANSFERENCIA_TITULAR || "",
    alias: TRANSFERENCIA_ALIAS || "",
    cbu: TRANSFERENCIA_CBU || "",
  };
}

function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function validarEntrega(datos, hayFisicos) {
  const entrega = {
    tipo: null,
    destinatario: null,
    telefono: null,
    direccion: null,
    ciudad: null,
    provincia: null,
    codigoPostal: null,
  };

  if (!hayFisicos) return { entrega };

  if (datos.entrega !== "envio" && datos.entrega !== "retiro") {
    return { error: "Elegí si querés envío a domicilio o retiro en persona" };
  }

  entrega.tipo = datos.entrega;
  entrega.destinatario = texto(datos.destinatario);
  entrega.telefono = texto(datos.telefono);

  if (!entrega.destinatario || !entrega.telefono) {
    return { error: "Completá el nombre y el teléfono de contacto" };
  }

  if (entrega.tipo === "envio") {
    entrega.direccion = texto(datos.direccion);
    entrega.ciudad = texto(datos.ciudad);
    entrega.provincia = texto(datos.provincia);
    entrega.codigoPostal = texto(datos.codigoPostal);

    if (!entrega.direccion || !entrega.ciudad || !entrega.provincia || !entrega.codigoPostal) {
      return { error: "Completá la dirección de envío" };
    }
  }

  return { entrega };
}

const SELECT_PEDIDOS = `
  SELECT pe.id, pe.usuario_id AS "usuarioId", pe.total, pe.estado,
    pe.metodo_pago AS "metodoPago", pe.creado_en AS "creadoEn",
    pe.entrega, pe.destinatario, pe.telefono, pe.direccion, pe.ciudad, pe.provincia,
    pe.codigo_postal AS "codigoPostal", pe.cupon, pe.descuento, u.nombre AS cliente, u.email,
    json_agg(json_build_object(
      'id', pi.id,
      'productoId', pi.producto_id,
      'nombre', pr.nombre,
      'tipo', pr.tipo,
      'cantidad', pi.cantidad,
      'precioUnitario', pi.precio_unitario,
      'archivoNombre', pr.archivo_nombre,
      'varianteId', pi.variante_id,
      'variante', pi.variante
    ) ORDER BY pi.id) AS items
  FROM pedidos pe
  JOIN usuarios u ON u.id = pe.usuario_id
  JOIN pedido_items pi ON pi.pedido_id = pe.id
  JOIN productos pr ON pr.id = pi.producto_id
`;

async function obtenerPedido(id) {
  const resultado = await pool.query(`${SELECT_PEDIDOS} WHERE pe.id = $1 GROUP BY pe.id, u.id`, [id]);
  return resultado.rows[0];
}

// Los correos salen después de responder: si fallan, el pedido sigue igual y queda anotado en el log.
function avisarPorCorreo(pedidoId, aviso) {
  if (!correos.configurado()) return;

  obtenerPedido(pedidoId)
    .then((pedido) => pedido && aviso(pedido))
    .catch((error) => console.error(`No se pudo leer el pedido #${pedidoId} para el correo:`, error.message));
}

async function marcarPagado(pedidoId, pago) {
  if (pago.status !== "approved") return;

  // Solo se marca si el monto pagado cubre el total del pedido.
  const resultado = await pool.query(
    `UPDATE pedidos SET estado = 'pagado', mp_pago_id = $1
     WHERE id = $2 AND estado = 'pendiente' AND metodo_pago = 'mercadopago' AND total <= $3::numeric`,
    [String(pago.id), pedidoId, pago.transaction_amount],
  );

  // Mercado Pago puede avisar el mismo pago varias veces: el correo sale solo la primera.
  if (resultado.rowCount > 0) avisarPorCorreo(pedidoId, correos.cambioDeEstado);
}

function medioDisponible(metodo) {
  return (
    (metodo === "transferencia" && datosTransferencia() !== null) ||
    (metodo === "mercadopago" && mercadoPago.configurado())
  );
}

function normalizarCodigo(valor) {
  return typeof valor === "string" ? valor.trim().toUpperCase() : "";
}

async function revisarCupon(codigo) {
  const resultado = await pool.query(
    `SELECT codigo, porcentaje,
       (vence IS NOT NULL AND vence < CURRENT_DATE) AS vencido,
       (usos_maximos IS NOT NULL AND usos >= usos_maximos) AS agotado
     FROM cupones WHERE codigo = $1`,
    [codigo],
  );
  const cupon = resultado.rows[0];

  if (!cupon) return { error: "Ese cupón no existe" };
  if (cupon.vencido) return { error: "Ese cupón ya venció" };
  if (cupon.agotado) return { error: "Ese cupón ya no tiene usos disponibles" };

  return { cupon: { codigo: cupon.codigo, porcentaje: cupon.porcentaje } };
}

app.get("/api/pagos", (req, res) => {
  res.json({
    transferencia: datosTransferencia(),
    mercadoPago: mercadoPago.configurado(),
    clavePublicaMercadoPago: mercadoPago.configurado() ? mercadoPago.clavePublica() : null,
  });
});

app.post("/api/pedidos", verificarToken, async (req, res) => {
  const { items, metodoPago } = req.body;
  const codigoCupon = normalizarCodigo(req.body.cupon);

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "El carrito está vacío" });
  }

  const ids = [...new Set(items.map((item) => item.id))];
  const cliente = await pool.connect();

  try {
    const resultadoProductos = await cliente.query(
      "SELECT id, nombre, precio, oferta, tipo, stock, opciones FROM productos WHERE id = ANY($1)",
      [ids],
    );
    const productosDB = resultadoProductos.rows;
    const resultadoVariantes = await cliente.query(
      "SELECT id, producto_id, valores, precio, stock FROM producto_variantes WHERE producto_id = ANY($1)",
      [ids],
    );

    const itemsValidados = [];
    const vistos = new Set();

    for (const item of items) {
      const producto = productosDB.find((p) => p.id === Number(item.id));

      if (!producto) {
        return res
          .status(400)
          .json({ error: "Uno de los productos ya no está disponible" });
      }

      const cantidad = producto.tipo === "digital" ? 1 : Number(item.cantidad);

      if (!Number.isInteger(cantidad) || cantidad < 1) {
        return res.status(400).json({ error: "Cantidad inválida" });
      }

      let variante = null;

      if (producto.opciones.length > 0) {
        variante = resultadoVariantes.rows.find(
          (v) => v.id === Number(item.varianteId) && v.producto_id === producto.id,
        );

        if (!variante) {
          return res.status(400).json({ error: `Elegí una variante disponible de "${producto.nombre}"` });
        }
      }

      // Un renglón por producto y variante (dos talles del mismo producto son renglones distintos).
      // Se compara lo ya encontrado en la base, no lo que mandó el navegador.
      const clave = `${producto.id}-${variante ? variante.id : ""}`;

      if (vistos.has(clave)) {
        return res.status(400).json({ error: "Hay productos repetidos en el pedido" });
      }

      vistos.add(clave);

      const etiqueta = variante ? etiquetaVariante(variante.valores, producto.opciones) : null;
      const nombre = etiqueta ? `${producto.nombre} (${etiqueta})` : producto.nombre;
      const stock = variante ? variante.stock : producto.stock;
      const descontarStock = producto.tipo !== "digital" && stock !== null;

      if (descontarStock && cantidad > stock) {
        const quedan = stock === 1 ? "queda 1 unidad" : `quedan ${stock} unidades`;
        return res.status(409).json({
          error: stock === 0
            ? `"${nombre}" se quedó sin stock.`
            : `De "${nombre}" solo ${quedan}.`,
        });
      }

      itemsValidados.push({
        id: producto.id,
        varianteId: variante ? variante.id : null,
        etiqueta,
        nombre,
        cantidad,
        // Se cobra el precio con la oferta del producto (también en las variantes con precio propio).
        precio: precioConOferta(variante?.precio ?? producto.precio, producto.oferta),
        descontarStock,
      });
    }

    const hayFisicos = productosDB.some((producto) => producto.tipo !== "digital");
    const validacionEntrega = validarEntrega(req.body, hayFisicos);

    if (validacionEntrega.error) {
      return res.status(400).json({ error: validacionEntrega.error });
    }

    const { entrega } = validacionEntrega;

    const subtotal = itemsValidados.reduce(
      (suma, item) => suma + item.precio * item.cantidad,
      0,
    );

    let cupon = null;

    if (codigoCupon) {
      const revision = await revisarCupon(codigoCupon);

      if (revision.error) {
        return res.status(400).json({ error: revision.error });
      }

      cupon = revision.cupon;
    }

    const descuento = cupon ? Math.round((subtotal * cupon.porcentaje) / 100) : 0;
    const total = subtotal - descuento;
    // Si el cupón cubre todo, no hay nada que cobrar: el pedido nace pagado.
    const gratis = total === 0;

    if (!gratis && !medioDisponible(metodoPago)) {
      return res.status(400).json({ error: "Elegí un medio de pago disponible" });
    }

    await cliente.query("BEGIN");

    const resultadoPedido = await cliente.query(
      `INSERT INTO pedidos (usuario_id, total, estado, metodo_pago, cupon, descuento, entrega, destinatario, telefono, direccion, ciudad, provincia, codigo_postal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        req.usuario.id,
        total,
        gratis ? "pagado" : "pendiente",
        gratis ? null : metodoPago,
        cupon ? cupon.codigo : null,
        descuento,
        entrega.tipo,
        entrega.destinatario,
        entrega.telefono,
        entrega.direccion,
        entrega.ciudad,
        entrega.provincia,
        entrega.codigoPostal,
      ],
    );

    const pedidoId = resultadoPedido.rows[0].id;

    if (cupon) {
      // Las condiciones evitan pasarse de los usos máximos si dos personas lo usan a la vez.
      const uso = await cliente.query(
        `UPDATE cupones SET usos = usos + 1
         WHERE codigo = $1 AND (vence IS NULL OR vence >= CURRENT_DATE)
           AND (usos_maximos IS NULL OR usos < usos_maximos)`,
        [cupon.codigo],
      );

      if (uso.rowCount === 0) {
        await cliente.query("ROLLBACK");
        return res.status(409).json({ error: "El cupón se agotó mientras comprabas. Probá sin el cupón." });
      }
    }

    for (const item of itemsValidados) {
      if (item.descontarStock) {
        // La condición evita vender de más si dos personas compran a la vez.
        const descuento = item.varianteId
          ? await cliente.query(
            "UPDATE producto_variantes SET stock = stock - $1 WHERE id = $2 AND stock >= $1",
            [item.cantidad, item.varianteId],
          )
          : await cliente.query(
            "UPDATE productos SET stock = stock - $1 WHERE id = $2 AND stock >= $1",
            [item.cantidad, item.id],
          );

        if (descuento.rowCount === 0) {
          await cliente.query("ROLLBACK");
          return res.status(409).json({ error: `Se agotó "${item.nombre}" mientras comprabas. Revisá tu carrito.` });
        }
      }

      await cliente.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, variante_id, variante, cantidad, precio_unitario, stock_descontado)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [pedidoId, item.id, item.varianteId, item.etiqueta, item.cantidad, item.precio, item.descontarStock],
      );
    }

    await cliente.query("COMMIT");

    res.status(201).json({ id: pedidoId, total, estado: gratis ? "pagado" : "pendiente" });
    avisarPorCorreo(pedidoId, (pedido) => correos.pedidoCreado(pedido, datosTransferencia()));
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al crear el pedido" });
  } finally {
    cliente.release();
  }
});

app.get("/api/mis-pedidos", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `${SELECT_PEDIDOS} WHERE pe.usuario_id = $1 GROUP BY pe.id, u.id ORDER BY pe.id DESC`,
      [req.usuario.id],
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener tus pedidos" });
  }
});

app.get("/api/pedidos", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(`${SELECT_PEDIDOS} GROUP BY pe.id, u.id ORDER BY pe.id DESC`);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los pedidos" });
  }
});

app.put("/api/pedidos/:id/estado", verificarToken, verificarAdmin, async (req, res) => {
  const { estado } = req.body ?? {};

  if (!ESTADOS_PEDIDO.includes(estado)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const actual = await cliente.query("SELECT estado, cupon FROM pedidos WHERE id = $1 FOR UPDATE", [req.params.id]);

    if (actual.rows.length === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const estadoAnterior = actual.rows[0].estado;

    if (estadoAnterior === "cancelado") {
      await cliente.query("ROLLBACK");
      return res.status(409).json({ error: "El pedido está cancelado y ya no se puede cambiar" });
    }

    await cliente.query("UPDATE pedidos SET estado = $1 WHERE id = $2", [estado, req.params.id]);

    if (estado === "cancelado") {
      // Los renglones con variante (tienen el texto guardado) devuelven stock a su variante, nunca al producto.
      await cliente.query(
        `UPDATE productos p SET stock = p.stock + i.cantidad
         FROM pedido_items i
         WHERE i.pedido_id = $1 AND i.producto_id = p.id AND i.stock_descontado
           AND i.variante IS NULL AND p.stock IS NOT NULL`,
        [req.params.id],
      );
      await cliente.query(
        `UPDATE producto_variantes v SET stock = v.stock + i.cantidad
         FROM pedido_items i
         WHERE i.pedido_id = $1 AND i.variante_id = v.id AND i.stock_descontado AND v.stock IS NOT NULL`,
        [req.params.id],
      );

      if (actual.rows[0].cupon) {
        await cliente.query(
          "UPDATE cupones SET usos = usos - 1 WHERE codigo = $1 AND usos > 0",
          [actual.rows[0].cupon],
        );
      }
    }

    await cliente.query("COMMIT");
    const pedido = await obtenerPedido(req.params.id);
    res.json(pedido);

    // Solo si el estado cambió de verdad (elegir el mismo estado otra vez no vuelve a avisar).
    if (estado !== estadoAnterior && correos.configurado()) correos.cambioDeEstado(pedido);
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al cambiar el estado del pedido" });
  } finally {
    cliente.release();
  }
});

app.post("/api/pedidos/:id/mercadopago", verificarToken, async (req, res) => {
  try {
    const pedido = await obtenerPedido(req.params.id);

    if (!pedido || pedido.usuarioId !== req.usuario.id) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    if (pedido.metodoPago !== "mercadopago" || pedido.estado !== "pendiente") {
      return res.status(409).json({ error: "Este pedido no está esperando un pago con Mercado Pago" });
    }

    if (!mercadoPago.configurado()) {
      return res.status(503).json({ error: "Mercado Pago no está disponible en este momento" });
    }

    res.json({ url: await mercadoPago.crearLinkDePago(pedido) });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "No pudimos conectar con Mercado Pago. Probá de nuevo en un momento." });
  }
});

app.post("/api/pedidos/:id/pagar-con-tarjeta", verificarToken, async (req, res) => {
  const tarjeta = req.body ?? {};

  if (!tarjeta.token || !tarjeta.payment_method_id) {
    return res.status(400).json({ error: "Faltan los datos de la tarjeta" });
  }

  try {
    const pedido = await obtenerPedido(req.params.id);

    if (!pedido || pedido.usuarioId !== req.usuario.id) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    if (pedido.metodoPago !== "mercadopago" || pedido.estado !== "pendiente") {
      return res.status(409).json({ error: "Este pedido no está esperando un pago con Mercado Pago" });
    }

    if (!mercadoPago.configurado()) {
      return res.status(503).json({ error: "Mercado Pago no está disponible en este momento" });
    }

    // El monto sale del pedido guardado, nunca de lo que manda el navegador.
    const pago = await mercadoPago.pagarConTarjeta(pedido, tarjeta);
    await marcarPagado(pedido.id, pago);

    res.json({
      pedido: await obtenerPedido(pedido.id),
      estadoPago: pago.status,
      detalle: pago.status_detail,
    });
  } catch (error) {
    console.error(error);

    if ([400, 404, 422].includes(error.status)) {
      return res.status(400).json({ error: "Mercado Pago no aceptó los datos de la tarjeta. Revisalos y probá de nuevo." });
    }

    res.status(502).json({ error: "No pudimos conectar con Mercado Pago. Probá de nuevo en un momento." });
  }
});

app.post("/api/pedidos/:id/verificar-pago", verificarToken, async (req, res) => {
  try {
    let pedido = await obtenerPedido(req.params.id);

    if (!pedido || pedido.usuarioId !== req.usuario.id) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    let estadoPago = null;

    if (pedido.metodoPago === "mercadopago" && pedido.estado === "pendiente" && mercadoPago.configurado()) {
      const pago = await mercadoPago.buscarPago(pedido.id);

      if (pago) {
        estadoPago = pago.status;
        await marcarPagado(pedido.id, pago);
        pedido = await obtenerPedido(pedido.id);
      }
    }

    res.json({ pedido, estadoPago });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "No pudimos revisar el pago con Mercado Pago. Probá de nuevo en un momento." });
  }
});

app.post("/api/webhooks/mercadopago", async (req, res) => {
  const tipo = req.query.type || req.query.topic || req.body?.type;
  const pagoId = String(req.query["data.id"] || req.body?.data?.id || req.query.id || "");

  if (tipo !== "payment" || !/^\d+$/.test(pagoId) || !mercadoPago.configurado()) {
    return res.sendStatus(200);
  }

  try {
    // No confiamos en el aviso: le preguntamos el pago a Mercado Pago con nuestro token.
    const pago = await mercadoPago.obtenerPago(pagoId);
    const pedidoId = mercadoPago.pedidoDeReferencia(pago.external_reference);

    if (pedidoId) {
      await marcarPagado(pedidoId, pago);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/api/descargas/:productoId", verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT pr.archivo, pr.archivo_nombre, a.tipo, a.datos
       FROM productos pr
       LEFT JOIN producto_archivos a ON a.producto_id = pr.id
       WHERE pr.id = $1 AND pr.tipo = 'digital' AND EXISTS (
         SELECT 1 FROM pedido_items pi
         JOIN pedidos pe ON pe.id = pi.pedido_id
         WHERE pi.producto_id = pr.id AND pe.usuario_id = $2
           AND pe.estado IN ('pagado', 'enviado', 'entregado')
       )`,
      [req.params.productoId, req.usuario.id],
    );
    const producto = resultado.rows[0];

    if (!producto) {
      return res.status(403).json({ error: "La descarga se habilita cuando el pedido está pagado" });
    }

    if (producto.datos) {
      res.attachment(producto.archivo_nombre || "archivo");
      res.set("X-Content-Type-Options", "nosniff");
      return res.type(producto.tipo).send(producto.datos);
    }

    // Archivo subido antes de guardarlos en la base: está en la carpeta archivos/.
    if (!producto.archivo) {
      return res.status(404).json({ error: "El archivo todavía no está disponible" });
    }

    const ruta = path.join(carpetaArchivos, path.basename(producto.archivo));

    res.download(ruta, producto.archivo_nombre, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ error: "El archivo todavía no está disponible" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al descargar el archivo" });
  }
});

// Pedidos que cuentan como venta: los cobrados.
const ESTADOS_COBRADOS = "('pagado', 'enviado', 'entregado')";

app.get("/api/dashboard", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const [periodos, masVendidos] = await Promise.all([
      pool.query(`
        WITH periodos(clave, desde, dias) AS (
          VALUES ('hoy', CURRENT_DATE, 1), ('semana', CURRENT_DATE - 6, 7), ('mes', CURRENT_DATE - 29, 30)
        ),
        -- Cada pedido cae en el período actual o en el anterior de igual duración,
        -- cortado a la misma hora que ahora (por ejemplo, "ayer a esta hora").
        pedidos_periodo AS (
          SELECT pe.clave, p.id, p.total, p.estado,
            p.estado IN ${ESTADOS_COBRADOS} AS cobrado,
            p.creado_en >= pe.desde AS actual
          FROM periodos pe
          JOIN pedidos p ON p.creado_en >= pe.desde - pe.dias
            AND (p.creado_en >= pe.desde OR p.creado_en < LOCALTIMESTAMP - make_interval(days => pe.dias))
        )
        SELECT pe.clave,
          COALESCE(SUM(pp.total) FILTER (WHERE pp.actual AND pp.cobrado), 0)::int AS ventas,
          COUNT(pp.id) FILTER (WHERE pp.actual)::int AS pedidos,
          COUNT(pp.id) FILTER (WHERE pp.actual AND pp.cobrado)::int AS pagados,
          COUNT(pp.id) FILTER (WHERE pp.actual AND pp.estado = 'pendiente')::int AS pendientes,
          COUNT(pp.id) FILTER (WHERE pp.actual AND pp.estado = 'cancelado')::int AS cancelados,
          COALESCE(SUM(pp.total) FILTER (WHERE NOT pp.actual AND pp.cobrado), 0)::int AS "ventasAnterior",
          COUNT(pp.id) FILTER (WHERE NOT pp.actual)::int AS "pedidosAnterior"
        FROM periodos pe
        LEFT JOIN pedidos_periodo pp ON pp.clave = pe.clave
        GROUP BY pe.clave
      `),
      pool.query(`
        SELECT pr.id, pr.nombre, pr.tipo,
          SUM(pi.cantidad)::int AS unidades,
          SUM(pi.cantidad * pi.precio_unitario)::int AS ingresos
        FROM pedido_items pi
        JOIN pedidos p ON p.id = pi.pedido_id
        JOIN productos pr ON pr.id = pi.producto_id
        WHERE p.estado IN ${ESTADOS_COBRADOS} AND p.creado_en >= CURRENT_DATE - 29
        GROUP BY pr.id
        ORDER BY unidades DESC, ingresos DESC
        LIMIT 5
      `),
    ]);

    res.json({
      periodos: Object.fromEntries(periodos.rows.map(({ clave, ...datos }) => [clave, datos])),
      masVendidos: masVendidos.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al armar el resumen" });
  }
});

app.get("/api/clientes", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT u.id, u.nombre, u.email,
        COUNT(p.id)::int AS pedidos,
        COALESCE(SUM(p.total) FILTER (WHERE p.estado IN ${ESTADOS_COBRADOS}), 0)::int AS "totalGastado",
        MAX(p.creado_en) AS "ultimoPedido"
      FROM usuarios u
      LEFT JOIN pedidos p ON p.usuario_id = u.id
      WHERE NOT u.es_admin
      GROUP BY u.id
      ORDER BY MAX(p.creado_en) DESC NULLS LAST, u.id DESC
    `);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los clientes" });
  }
});

app.get("/api/clientes/:id/pedidos", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `${SELECT_PEDIDOS} WHERE pe.usuario_id = $1 GROUP BY pe.id, u.id ORDER BY pe.id DESC`,
      [req.params.id],
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el historial" });
  }
});

const SELECT_CUPONES = `
  SELECT id, codigo, porcentaje, usos, usos_maximos AS "usosMaximos",
    to_char(vence, 'YYYY-MM-DD') AS vence,
    (vence IS NOT NULL AND vence < CURRENT_DATE) AS vencido,
    (usos_maximos IS NOT NULL AND usos >= usos_maximos) AS agotado
  FROM cupones
`;

function validarCupon(datos = {}) {
  const codigo = normalizarCodigo(datos.codigo);
  const porcentaje = Number(datos.porcentaje);
  const usosMaximos = datos.usosMaximos === "" || datos.usosMaximos == null ? null : Number(datos.usosMaximos);
  const vence = datos.vence || null;
  // en-CA da la fecha local como AAAA-MM-DD, el mismo formato que manda el input de fecha.
  const hoy = new Date().toLocaleDateString("en-CA");

  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) {
    return { error: "El código tiene que tener entre 3 y 30 letras, números o guiones, sin espacios" };
  }

  if (!Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 100) {
    return { error: "El descuento tiene que ser un porcentaje entero entre 1 y 100" };
  }

  if (usosMaximos !== null && (!Number.isInteger(usosMaximos) || usosMaximos < 1)) {
    return { error: "Los usos máximos tienen que ser un número entero, de 1 para arriba" };
  }

  if (vence !== null && !/^\d{4}-\d{2}-\d{2}$/.test(vence)) {
    return { error: "La fecha de vencimiento no es válida" };
  }

  if (vence !== null && vence < hoy) {
    return { error: "La fecha de vencimiento ya pasó" };
  }

  return { cupon: { codigo, porcentaje, usosMaximos, vence } };
}

app.get("/api/cupones", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(`${SELECT_CUPONES} ORDER BY id DESC`);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los cupones" });
  }
});

app.post("/api/cupones", verificarToken, verificarAdmin, async (req, res) => {
  const validacion = validarCupon(req.body);

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  const { codigo, porcentaje, usosMaximos, vence } = validacion.cupon;

  try {
    const resultado = await pool.query(
      "INSERT INTO cupones (codigo, porcentaje, usos_maximos, vence) VALUES ($1, $2, $3, $4) RETURNING id",
      [codigo, porcentaje, usosMaximos, vence],
    );
    const creado = await pool.query(`${SELECT_CUPONES} WHERE id = $1`, [resultado.rows[0].id]);
    res.status(201).json(creado.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Ya existe un cupón con ese código" });
    }
    if (error.code === "22007" || error.code === "22008") {
      return res.status(400).json({ error: "La fecha de vencimiento no es válida" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear el cupón" });
  }
});

app.delete("/api/cupones/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query("DELETE FROM cupones WHERE id = $1 RETURNING id", [req.params.id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }

    res.json({ mensaje: "Cupón eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el cupón" });
  }
});

app.post("/api/cupones/validar", verificarToken, async (req, res) => {
  const codigo = normalizarCodigo(req.body?.codigo);

  if (!codigo) {
    return res.status(400).json({ error: "Escribí el código del cupón" });
  }

  try {
    const revision = await revisarCupon(codigo);

    if (revision.error) {
      return res.status(400).json({ error: revision.error });
    }

    res.json(revision.cupon);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al revisar el cupón" });
  }
});

function validarCategoria(datos) {
  const nombre = texto(datos?.nombre);
  const padreId = vacio(datos?.padreId) ? null : Number(datos.padreId);

  if (nombre.length < 2 || nombre.length > 60) {
    return { error: "El nombre de la categoría tiene que tener entre 2 y 60 letras" };
  }

  if (padreId !== null && !Number.isInteger(padreId)) {
    return { error: "La categoría elegida no es válida" };
  }

  return { nombre, padreId };
}

// Hay dos niveles: una subcategoría va dentro de una categoría principal y no puede tener otras adentro.
async function revisarUbicacion(padreId, id = null) {
  if (padreId === null) return null;
  if (padreId === id) return "Una categoría no puede ir dentro de sí misma";

  const padre = (await pool.query("SELECT padre_id FROM categorias WHERE id = $1", [padreId])).rows[0];

  if (!padre) return "La categoría elegida ya no existe";
  if (padre.padre_id !== null) return "Una subcategoría no puede tener otras subcategorías adentro";

  if (id !== null) {
    const subcategorias = await pool.query("SELECT 1 FROM categorias WHERE padre_id = $1 LIMIT 1", [id]);
    if (subcategorias.rows.length > 0) return "Esta categoría tiene subcategorías: no puede ir dentro de otra";
  }

  return null;
}

const NOMBRE_REPETIDO = "Ya existe una categoría con ese nombre en ese lugar";

app.get("/api/categorias", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT c.id, c.nombre, c.padre_id AS "padreId", COUNT(p.id)::int AS productos
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id
      GROUP BY c.id
      ORDER BY c.nombre
    `);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las categorías" });
  }
});

app.post("/api/categorias", verificarToken, verificarAdmin, async (req, res) => {
  const validacion = validarCategoria(req.body);

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  try {
    const problema = await revisarUbicacion(validacion.padreId);

    if (problema) {
      return res.status(400).json({ error: problema });
    }

    const resultado = await pool.query(
      `INSERT INTO categorias (nombre, padre_id) VALUES ($1, $2) RETURNING id, nombre, padre_id AS "padreId"`,
      [validacion.nombre, validacion.padreId],
    );
    res.status(201).json({ ...resultado.rows[0], productos: 0 });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: NOMBRE_REPETIDO });
    }
    if (error.code === "23503") {
      return res.status(400).json({ error: "La categoría elegida ya no existe" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear la categoría" });
  }
});

app.put("/api/categorias/:id", verificarToken, verificarAdmin, async (req, res) => {
  const validacion = validarCategoria(req.body);
  const id = Number(req.params.id);

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: "Categoría no encontrada" });
  }

  try {
    const problema = await revisarUbicacion(validacion.padreId, id);

    if (problema) {
      return res.status(400).json({ error: problema });
    }

    const resultado = await pool.query(
      `UPDATE categorias SET nombre = $1, padre_id = $2 WHERE id = $3 RETURNING id, nombre, padre_id AS "padreId"`,
      [validacion.nombre, validacion.padreId, id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: NOMBRE_REPETIDO });
    }
    if (error.code === "23503") {
      return res.status(400).json({ error: "La categoría elegida ya no existe" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al cambiar la categoría" });
  }
});

// Al borrar una categoría se borran sus subcategorías, y los productos quedan "sin categoría" (no se borran).
app.delete("/api/categorias/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query("DELETE FROM categorias WHERE id = $1 RETURNING id", [req.params.id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    res.json({ mensaje: "Categoría eliminada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar la categoría" });
  }
});

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulario de contacto y botón de arrepentimiento: no hace falta tener cuenta.
app.post("/api/mensajes", async (req, res) => {
  const datos = req.body ?? {};

  // Campo trampa: las personas no lo ven; si llega completo, lo mandó un bot.
  if (datos.sitioWeb) {
    return res.status(201).json({ id: 0 });
  }

  const tipo = datos.tipo === "arrepentimiento" ? "arrepentimiento" : "contacto";
  const nombre = texto(datos.nombre);
  const email = texto(datos.email);
  const telefono = texto(datos.telefono);
  const mensaje = texto(datos.mensaje);
  const pedido = vacio(datos.pedido) ? null : Number(datos.pedido);

  if (!nombre || nombre.length > 100) {
    return res.status(400).json({ error: "Escribí tu nombre (hasta 100 letras)" });
  }

  if (!EMAIL_VALIDO.test(email) || email.length > 150) {
    return res.status(400).json({ error: "Escribí un email válido" });
  }

  if (telefono.length > 30) {
    return res.status(400).json({ error: "El teléfono puede tener hasta 30 caracteres" });
  }

  if (mensaje.length > 2000) {
    return res.status(400).json({ error: "El mensaje puede tener hasta 2000 caracteres" });
  }

  if (tipo === "contacto" && !mensaje) {
    return res.status(400).json({ error: "Escribí tu mensaje" });
  }

  // La columna es un entero de PostgreSQL: hasta 2147483647.
  if (pedido !== null && (!Number.isInteger(pedido) || pedido < 1 || pedido > 2147483647)) {
    return res.status(400).json({ error: "El número de pedido no es válido" });
  }

  if (tipo === "arrepentimiento" && pedido === null) {
    return res.status(400).json({ error: "Escribí el número de pedido que querés cancelar" });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO mensajes (tipo, nombre, email, telefono, pedido, mensaje)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, creado_en AS "creadoEn"`,
      [tipo, nombre, email, telefono || null, pedido, mensaje],
    );
    const guardado = resultado.rows[0];
    res.status(201).json({ id: guardado.id });

    if (tipo === "arrepentimiento") avisarArrepentimiento({ ...guardado, nombre, email, pedido });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
});

// La confirmación solo sale si el pedido es de ese email: así el formulario no sirve para mandarle correos a cualquiera.
function avisarArrepentimiento(mensaje) {
  if (!correos.configurado()) return;

  pool
    .query(
      "SELECT 1 FROM pedidos pe JOIN usuarios u ON u.id = pe.usuario_id WHERE pe.id = $1 AND lower(u.email) = lower($2)",
      [mensaje.pedido, mensaje.email],
    )
    .then((resultado) => resultado.rows.length > 0 && correos.arrepentimiento(mensaje))
    .catch((error) => console.error("No se pudo revisar el pedido del arrepentimiento:", error.message));
}

const SELECT_MENSAJES = `
  SELECT id, tipo, nombre, email, telefono, pedido, mensaje, leido, creado_en AS "creadoEn"
  FROM mensajes
`;

app.get("/api/mensajes", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(`${SELECT_MENSAJES} ORDER BY id DESC`);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los mensajes" });
  }
});

app.put("/api/mensajes/:id/leido", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `UPDATE mensajes SET leido = $1 WHERE id = $2 RETURNING id`,
      [req.body?.leido !== false, req.params.id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    const mensaje = await pool.query(`${SELECT_MENSAJES} WHERE id = $1`, [req.params.id]);
    res.json(mensaje.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el mensaje" });
  }
});

app.delete("/api/mensajes/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query("DELETE FROM mensajes WHERE id = $1 RETURNING id", [req.params.id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    res.json({ mensaje: "Mensaje eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el mensaje" });
  }
});

// Tablas que crean las migraciones de la carpeta migraciones/: si falta alguna, se avisa al arrancar.
// Al agregar una migración que crea una tabla, sumala a esta lista.
const TABLAS_DE_MIGRACIONES = [
  "usuarios", "productos", "producto_imagenes", "pedidos", "pedido_items",
  "cupones", "categorias", "producto_variantes", "mensajes", "producto_archivos", "recuperaciones",
];

async function avisarMigracionesPendientes() {
  const resultado = await pool.query(
    "SELECT tabla FROM unnest($1::text[]) AS tabla WHERE to_regclass('public.' || tabla) IS NULL",
    [TABLAS_DE_MIGRACIONES],
  );

  if (resultado.rows.length > 0) {
    const faltan = resultado.rows.map((fila) => fila.tabla).join(", ");
    console.warn(`Faltan tablas en la base (${faltan}). Aplicá las migraciones con "npm run migrar" en mi-tienda-backend.`);
  }
}

// Render indica el puerto en PORT; en la compu, 3000.
const PUERTO = process.env.PORT || 3000;

app.listen(PUERTO, (error) => {
  // En Express 5, si el puerto no se puede abrir (por ejemplo, porque ya está en uso) el error llega acá.
  if (error) {
    console.error(`No se pudo abrir el puerto ${PUERTO} (${error.code || error.message}). ¿Quedó otro backend abierto?`);
    process.exit(1);
  }

  console.log(`Servidor corriendo en el puerto ${PUERTO}`);
  avisarMigracionesPendientes().catch((err) => console.error("No se pudo revisar la base:", err.message));
});
