const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

// Achica una foto antes de subirla (lado más largo de 1600 px, en WebP): las fotos se guardan en la base
// y las del celular pesan varios MB. Si no se puede o no conviene, devuelve la original.
export async function achicarImagen(archivo) {
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();

    const achicada = await new Promise((resolver) => lienzo.toBlob(resolver, "image/webp", CALIDAD));

    // Algunos navegadores no saben hacer WebP y devuelven PNG, que pesa más: en ese caso queda la original.
    if (!achicada || achicada.type !== "image/webp" || achicada.size >= archivo.size) return archivo;

    return new File([achicada], `${archivo.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return archivo;
  }
}
