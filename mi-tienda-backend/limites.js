// Límite de intentos por clave (un email, una IP) dentro de una ventana de tiempo.
// Vive en memoria: alcanza para un solo servidor y se reinicia si el servidor se reinicia.
class Limite {
  constructor({ maximo, minutos }) {
    this.maximo = maximo;
    this.ventana = minutos * 60 * 1000;
    this.registros = new Map();
    // Cada tanto se borran los registros vencidos para que la memoria no crezca.
    setInterval(() => this.limpiarVencidos(), this.ventana).unref();
  }

  // Milisegundos que faltan para poder volver a intentar (0 si todavía puede).
  espera(clave) {
    const registro = this.registros.get(clave);
    if (!registro) return 0;

    const restante = registro.desde + this.ventana - Date.now();

    if (restante <= 0) {
      this.registros.delete(clave);
      return 0;
    }

    return registro.cantidad >= this.maximo ? restante : 0;
  }

  sumar(clave) {
    const registro = this.registros.get(clave);

    if (!registro || registro.desde + this.ventana <= Date.now()) {
      this.registros.set(clave, { cantidad: 1, desde: Date.now() });
    } else {
      registro.cantidad += 1;
    }
  }

  olvidar(clave) {
    this.registros.delete(clave);
  }

  limpiarVencidos() {
    const ahora = Date.now();
    for (const [clave, registro] of this.registros) {
      if (registro.desde + this.ventana <= ahora) this.registros.delete(clave);
    }
  }
}

module.exports = { Limite };
