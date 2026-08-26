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
 * `rotateDeg`: a variante diagonal do footer (#134) é a mesma faixa
 * rotacionada -- não é um componente separado, só um wrapper com
 * `transform: rotate(...)`.
 */
export function Marquee({
  items,
  laps = 6,
  durationSeconds = 30,
  reverse = false,
  rotateDeg = 0,
  separatorClassName = 'bg-highlight-lime',
  className = '',
}: {
  items: string[];
  laps?: number;
  durationSeconds?: number;
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

  return (
    // Purely decorative in every use of this component -- the tech names
    // repeat several times over and add nothing a screen reader user does
    // not already get from the actual content elsewhere on the page.
    <div
      aria-hidden="true"
      className={`overflow-hidden ${className}`}
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
            className="flex items-center gap-8 pr-8 font-mono text-4xl font-bold whitespace-nowrap uppercase sm:text-6xl"
          >
            {item}
            <span
              aria-hidden="true"
              className={`inline-block size-3 rotate-45 ${separatorClassName}`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
