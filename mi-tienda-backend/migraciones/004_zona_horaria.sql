-- Fechas en hora de Argentina: "hoy" en el panel, vencimiento de cupones y fecha de los pedidos.
-- Las bases en la nube vienen en UTC. El backend usa la misma zona (ver db.js).
-- Vale para las conexiones nuevas. Cambiarla requiere ser dueño de la base: si no se puede, solo avisa.

DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Argentina/Buenos_Aires');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'No se pudo poner la zona horaria de Argentina en la base: el usuario no es el dueño.';
END
$$;
