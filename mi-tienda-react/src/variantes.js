export function tieneVariantes(producto) {
  return producto.opciones?.length > 0;
}

// "Color: Rojo · Talle: M", en el orden de las opciones del producto.
export function etiquetaVariante(producto, variante) {
  if (!variante) return "";
  return producto.opciones.map((opcion) => `${opcion.nombre}: ${variante.valores[opcion.nombre]}`).join(" · ");
}

export function pesos(monto) {
  return `$${monto.toLocaleString("es-AR")}`;
}

// Precio con la oferta del producto (porcentaje), redondeado a pesos y nunca menor a $1.
// El backend hace la misma cuenta al cobrar (precioConOferta en index.js).
export function precioConOferta(precio, oferta) {
  if (!oferta) return precio;
  return Math.max(1, Math.round((precio * (100 - oferta)) / 100));
}

// Precio de lista, sin la oferta.
export function precioOriginalDe(producto, variante) {
  return variante?.precio ?? producto.precio;
}

// Precio que se cobra: con la oferta, si el producto tiene.
export function precioDe(producto, variante) {
  return precioConOferta(precioOriginalDe(producto, variante), producto.oferta);
}

export function stockDe(producto, variante) {
  return variante ? variante.stock : producto.stock;
}

// Cada variante es un renglón distinto del carrito.
export function claveCarrito(productoId, variante) {
  return variante ? `${productoId}-${variante.id}` : String(productoId);
}

// Los precios de lista: uno por variante (vacío usa el del producto) o el del producto.
function preciosOriginalesDe(producto) {
  if (!tieneVariantes(producto) || producto.variantes.length === 0) return [producto.precio];
  return producto.variantes.map((variante) => variante.precio ?? producto.precio);
}

// Los precios que se cobran (con la oferta): con estos se filtra y se ordena.
export function preciosDe(producto) {
  return preciosOriginalesDe(producto).map((precio) => precioConOferta(precio, producto.oferta));
}

function rango(precios) {
  return { minimo: Math.min(...precios), maximo: Math.max(...precios) };
}

export function rangoPrecios(producto) {
  return rango(preciosDe(producto));
}

export function hayStock(producto) {
  if (producto.tipo === "digital") return true;
  if (!tieneVariantes(producto)) return producto.stock !== 0;
  return producto.variantes.some((variante) => variante.stock !== 0);
}

function textoDeRango({ minimo, maximo }) {
  return minimo === maximo ? pesos(minimo) : `Desde ${pesos(minimo)}`;
}

// "$1.500" o "Desde $1.200" si las variantes tienen precios distintos (ya con la oferta).
export function textoPrecio(producto) {
  return textoDeRango(rangoPrecios(producto));
}

// Lo mismo, pero con el precio de lista: es el que se muestra tachado.
export function textoPrecioOriginal(producto) {
  return textoDeRango(rango(preciosOriginalesDe(producto)));
}

// Datos de una combinación que el admin todavía no tocó: se vende, con el precio y el stock por defecto.
export const COMBINACION_NUEVA = { precio: "", stock: "", incluida: true };

// Una fila de opción del formulario del admin. El id es un contador y no crypto.randomUUID,
// que no existe si el panel se abre por http desde otra compu o el celular.
let ultimaOpcion = 0;

export function nuevaOpcion(nombre = "", valoresTexto = "") {
  ultimaOpcion += 1;
  return { id: `opcion-${ultimaOpcion}`, nombre, valoresTexto };
}

// Opciones como las escribe el admin ("Rojo, Azul") → [{ nombre, valores }], sin vacíos ni repetidos.
export function limpiarOpciones(opciones) {
  return opciones
    .map((opcion) => {
      const valores = [];
      for (const valor of opcion.valoresTexto.split(",").map((v) => v.trim()).filter(Boolean)) {
        if (!valores.some((v) => v.toLowerCase() === valor.toLowerCase())) valores.push(valor);
      }
      return { nombre: opcion.nombre.trim(), valores };
    })
    .filter((opcion) => opcion.nombre && opcion.valores.length > 0);
}

export function claveCombinacion(opciones, valores) {
  return JSON.stringify(opciones.map((opcion) => valores[opcion.nombre]));
}

// Todas las combinaciones de las opciones: [{ Color: "Rojo", Talle: "S" }, ...].
export function combinar(opciones) {
  return opciones.reduce(
    (combinaciones, opcion) =>
      combinaciones.flatMap((combinacion) => opcion.valores.map((valor) => ({ ...combinacion, [opcion.nombre]: valor }))),
    [{}],
  );
}
