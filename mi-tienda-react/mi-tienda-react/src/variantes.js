export function tieneVariantes(producto) {
  return producto.opciones?.length > 0;
}

// "Color: Rojo · Talle: M", en el orden de las opciones del producto.
export function etiquetaVariante(producto, variante) {
  if (!variante) return "";
  return producto.opciones.map((opcion) => `${opcion.nombre}: ${variante.valores[opcion.nombre]}`).join(" · ");
}

export function precioDe(producto, variante) {
  return variante?.precio ?? producto.precio;
}

export function stockDe(producto, variante) {
  return variante ? variante.stock : producto.stock;
}

// Cada variante es un renglón distinto del carrito.
export function claveCarrito(productoId, variante) {
  return variante ? `${productoId}-${variante.id}` : String(productoId);
}

// Los precios a los que se vende: uno por variante (vacío usa el del producto) o el del producto.
export function preciosDe(producto) {
  if (!tieneVariantes(producto) || producto.variantes.length === 0) return [producto.precio];
  return producto.variantes.map((variante) => variante.precio ?? producto.precio);
}

export function rangoPrecios(producto) {
  const precios = preciosDe(producto);
  return { minimo: Math.min(...precios), maximo: Math.max(...precios) };
}

export function hayStock(producto) {
  if (producto.tipo === "digital") return true;
  if (!tieneVariantes(producto)) return producto.stock !== 0;
  return producto.variantes.some((variante) => variante.stock !== 0);
}

// "$1.500" o "Desde $1.200" si las variantes tienen precios distintos.
export function textoPrecio(producto) {
  const { minimo, maximo } = rangoPrecios(producto);
  const precio = `$${minimo.toLocaleString("es-AR")}`;
  return minimo === maximo ? precio : `Desde ${precio}`;
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
