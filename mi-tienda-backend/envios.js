// Envíos a domicilio por Correo Argentino: el precio depende de la provincia del cliente.
// Para cambiar un precio (en pesos), editalo en esta tabla y volvé a publicar el backend:
// el checkout de la tienda la lee de /api/envios y el pedido se cobra con estos mismos números.
const TIPOS_ENVIO = [
  { id: "clasico", nombre: "Clásico", plazo: "de 2 a 5 días hábiles" },
  { id: "express", nombre: "Express", plazo: "de 1 a 3 días hábiles" },
];

// "Buenos Aires" incluye el Gran Buenos Aires; la Ciudad de Buenos Aires tiene el mismo precio.
// El orden de esta tabla es el de la lista de provincias del checkout.
const PRECIOS_POR_PROVINCIA = {
  "Buenos Aires": { clasico: 10489, express: 14427 },
  "Ciudad Autónoma de Buenos Aires": { clasico: 10489, express: 14427 },
  Catamarca: { clasico: 10489, express: 14427 },
  Chaco: { clasico: 11831, express: 21689 },
  Chubut: { clasico: 12622, express: 28926 },
  Córdoba: { clasico: 9095, express: 10005 },
  Corrientes: { clasico: 11831, express: 21689 },
  "Entre Ríos": { clasico: 10489, express: 14427 },
  Formosa: { clasico: 11831, express: 21689 },
  Jujuy: { clasico: 11831, express: 21689 },
  "La Pampa": { clasico: 10489, express: 14427 },
  "La Rioja": { clasico: 10489, express: 14427 },
  Mendoza: { clasico: 10489, express: 14427 },
  Misiones: { clasico: 12622, express: 28926 },
  Neuquén: { clasico: 11831, express: 21689 },
  "Río Negro": { clasico: 11831, express: 21689 },
  Salta: { clasico: 11831, express: 21689 },
  "San Juan": { clasico: 10489, express: 14427 },
  "San Luis": { clasico: 10489, express: 14427 },
  "Santa Cruz": { clasico: 12622, express: 28926 },
  "Santa Fe": { clasico: 10489, express: 14427 },
  "Santiago del Estero": { clasico: 10489, express: 14427 },
  "Tierra del Fuego": { clasico: 12622, express: 28926 },
  Tucumán: { clasico: 10489, express: 14427 },
};

function esProvincia(provincia) {
  return Object.hasOwn(PRECIOS_POR_PROVINCIA, provincia);
}

// Lo que cuesta el envío, o null si la provincia o el tipo no existen.
function costoEnvio(provincia, tipo) {
  if (!esProvincia(provincia) || !TIPOS_ENVIO.some((t) => t.id === tipo)) return null;
  return PRECIOS_POR_PROVINCIA[provincia][tipo];
}

function tipoEnvio(id) {
  return TIPOS_ENVIO.find((tipo) => tipo.id === id) ?? null;
}

// Lo que necesita el checkout para mostrar las opciones y sus precios.
function opciones() {
  return {
    tipos: TIPOS_ENVIO,
    provincias: Object.entries(PRECIOS_POR_PROVINCIA).map(([nombre, precios]) => ({ nombre, precios })),
  };
}

module.exports = { esProvincia, costoEnvio, tipoEnvio, opciones };
