/**
 * Fundo aurora fixo do site inteiro (direção "aurora futurista",
 * docs/design-aurora-futurista.md). Renderizado uma vez no layout raiz
 * (app/[locale]/layout.tsx) -- se aplica tanto ao site público quanto ao
 * painel admin. Puramente decorativo (`aria-hidden`) e animação inteira em
 * CSS (.aurora-blob em globals.css), então não precisa ser client
 * component.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden="true" className="aurora-background">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
    </div>
  );
}
