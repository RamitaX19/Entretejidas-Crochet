// Diapositivas del banner del inicio (pasan solas cada 6 segundos).
// - imagen: una foto en public/banner/, por ejemplo "/banner/lanas.jpg". Sin foto se usa el color de "fondo".
// - fondo: "denim", "cinta" o "rojo" (solo cuando no hay foto).
// - boton y link: el texto del botón y a dónde lleva, por ejemplo "/productos", "/productos?q=lana"
//   o "/productos?categoria=3" (el número de una categoría es el que aparece en la dirección al elegirla).
export const DIAPOSITIVAS = [
  {
    boton: "Ver todos los productos",
    link: "/productos",
    imagen: "/entretejidas-banner.webp",
    alt: "Entretejidas: Hilos, telas, moldes y proyectos para tejer y coser, todo en un solo lugar.",
  },
  {
    titulo: "Nuestros hilos",
    texto: "Texto de ejemplo: lo cambiamos cuando tengas las fotos y las promociones.",
    boton: "Ver hilos",
    link: "/productos?q=hilo",
    fondo: "cinta",
  },
  {
    titulo: "Lanas de temporada",
    texto: "Texto de ejemplo: lo cambiamos cuando tengas las fotos y las promociones.",
    boton: "Ver lanas",
    link: "/productos?q=lana",
    fondo: "rojo",
  },
];
