import { API_URL } from "./config";

// fetch con el token de la sesión. Si el servidor lo rechaza, avisa a App para cerrar la sesión.
export async function pedirApi(ruta, opciones = {}) {
  const token = localStorage.getItem("token");
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: token
      ? { ...opciones.headers, Authorization: `Bearer ${token}` }
      : opciones.headers,
  });

  if (respuesta.status === 401 && token) {
    window.dispatchEvent(new Event("sesion-vencida"));
  }

  return respuesta;
}

// El JSON de la respuesta; si el servidor respondió con un error, lo lanza en vez de devolverlo como si fueran datos.
export async function leerJson(respuesta) {
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new Error(datos?.error || `El servidor respondió ${respuesta.status}`);
  return datos;
}
