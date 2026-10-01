const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es");

// Las categorías principales (sin padre) por nombre, cada una con sus subcategorías.
export function arbolDeCategorias(categorias) {
  return categorias
    .filter((categoria) => categoria.padreId === null)
    .sort(porNombre)
    .map((categoria) => ({
      ...categoria,
      subcategorias: categorias.filter((sub) => sub.padreId === categoria.id).sort(porNombre),
    }));
}

// Para los <select>: cada principal seguida de sus subcategorías ("Hilos › Gross").
export function opcionesDeCategorias(categorias) {
  return arbolDeCategorias(categorias).flatMap((categoria) => [
    { id: categoria.id, etiqueta: categoria.nombre },
    ...categoria.subcategorias.map((sub) => ({ id: sub.id, etiqueta: `${categoria.nombre} › ${sub.nombre}` })),
  ]);
}

// Una categoría incluye los productos de sus subcategorías.
export function estaEnCategoria(producto, categoriaId) {
  return producto.categoriaId === categoriaId || producto.categoriaPadreId === categoriaId;
}

// "Hilos › Gross" (o solo "Hilos" si el producto está en una categoría principal).
export function rutaDeCategoria(producto) {
  return [producto.categoriaPadre, producto.categoria].filter(Boolean).join(" › ");
}

export function linkDeCategoria(id) {
  return `/productos?categoria=${id}`;
}
