/**
 * Ticker horizontal infinito (docs/design-clone-syahril.md). Server
 * component -- a animação inteira é CSS puro (`.marquee-track` em
 * globals.css), não precisa de JS.
 *
 * `items` é repetido `laps` vezes pra formar uma "volta" larga o
 * suficiente pra nunca deixar vão em branco mesmo com poucos itens ou
 * viewport muito largo, e essa volta inteira é duplicada uma vez -- é o
 * que faz a animação (`translateX(0)` até `translateX(-50%)`) fechar sem
 * costura, sempre, qualquer que seja `laps`.
 *
 * A velocidade vem de `secondsPerItem`, não de uma duração fixa da faixa
 * inteira: como a largura cresce junto com a quantidade de itens, uma
 * duração fixa fazia a faixa acelerar a cada skill nova em profile.ts
 * (18 skills × 6 voltas em 30s davam 0,28s por item -- rápido demais pra
 * ler). Derivando do número de itens, a velocidade aparente fica igual
 * qualquer que seja o conteúdo.
 *
 * `rotateDeg`: a variante diagonal do footer (#134) é a mesma faixa
 * rotacionada -- não é um componente separado, só um wrapper com
 * `transform: rotate(...)`.
 */
export function Marquee({
  items,
  laps = 6,
  secondsPerItem = 1.6,
  reverse = false,
  rotateDeg = 0,
  separatorClassName = 'bg-highlight-lime',
  className = '',
}: {
  items: string[];
  laps?: number;
  /** Segundos que cada item leva para atravessar. Maior = mais lento. */
  secondsPerItem?: number;
  reverse?: boolean;
  rotateDeg?: number;
  separatorClassName?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  const lap = Array.from({ length: laps }, () => items).flat();
  const doubled = [...lap, ...lap];

  // A animação percorre exatamente uma "volta" (translateX até -50%), então
  // é o tamanho da volta -- não o do array duplicado -- que define o tempo.
  const durationSeconds = lap.length * secondsPerItem;

  return (
    // Purely decorative in every use of this component -- the tech names
    // repeat several times over and add nothing a screen reader user does
    // not already get from the actual content elsewhere on the page.
    <div
      aria-hidden="true"
      // marquee-fade: dissolve nas duas pontas em vez de cortar a palavra
      // no meio contra a borda do viewport (globals.css).
      className={`marquee-fade overflow-hidden ${className}`}
      style={rotateDeg ? { transform: `rotate(${rotateDeg}deg)` } : undefined}
    >
      <div
        className="marquee-track flex w-max items-center"
        style={{
          animationDuration: `${durationSeconds}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {doubled.map((item, index) => (
          // index as key is fine here: this is a decorative, fixed-order
          // repeated sequence, not a list of distinct entities that can be
          // added/removed/reordered.
          <span
            key={index}
            className="flex items-center gap-8 pr-8 font-mono text-4xl font-bold whitespace-nowrap uppercase sm:text-5xl"
          >
            {/* alternado cheio/contornado: uma faixa toda em peso máximo
                vira um bloco maciço, e o contorno dá ritmo sem exigir
                outra cor */}
            <span className={index % 2 === 1 ? 'marquee-outline' : undefined}>
              {item}
            </span>
            <span
              aria-hidden="true"
              className={`inline-block size-3 shrink-0 rotate-45 ${separatorClassName}`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
