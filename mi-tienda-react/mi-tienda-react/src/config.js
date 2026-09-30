// En Vercel la dirección del backend sale de .env.production; en la compu se usa el backend local.
export const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;
