const ACTUALIZADO = "29 de septiembre de 2026";

function PaginaLegal({ titulo, children }) {
  return (
    <main className="pagina pagina-legal">
      <h1>{titulo}</h1>
      <p className="nota">Última actualización: {ACTUALIZADO}</p>
      {/* Cuando un profesional revise los textos y completes los datos, borrá este aviso. */}
      {children}
    </main>
  );
}

export default PaginaLegal;
