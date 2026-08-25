/**
 * Esfera decorativa do hero (direção dark terminal, docs/design-orb-ui-reference.md).
 * Puramente ambiente -- não reage a nada, então não precisa ser client
 * component. `aria-hidden`: não carrega informação, só a assinatura visual.
 */
export function OrbGlow({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`orb-glow size-40 shrink-0 rounded-full sm:size-56 ${className}`}
    />
  );
}
