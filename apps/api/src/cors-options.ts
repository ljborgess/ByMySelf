import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Hosts que só existem na máquina de quem desenvolve. */
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Origem de loopback em http, de qualquer porta.
 *
 * Só a forma importa, não a porta: `next dev` escolhe a que estiver livre, e
 * fixar uma aqui quebraria no dia em que a 3101 estivesse ocupada.
 */
function isLoopbackOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  return url.protocol === 'http:' && LOOPBACK_HOSTNAMES.has(url.hostname);
}

/**
 * RNF-SEG7: uma origem, sem curinga.
 *
 * Em produção é exatamente `FRONTEND_URL` e nada mais -- é o site, e não há
 * segundo cliente legítimo.
 *
 * Em desenvolvimento, qualquer origem de loopback também passa. Não é
 * afrouxamento por conveniência: `localhost` e `127.0.0.1` são o mesmo
 * computador com duas grafias, e o browser as trata como origens distintas.
 * Com uma só liberada, abrir o site pela outra faz o `fetch` ser bloqueado
 * antes de sair -- e a tela reporta isso como "verifique sua conexão" num
 * login perfeitamente correto. Aceitar as duas é o que faz as duas grafias
 * significarem a mesma coisa, que é o que quem desenvolve já supõe.
 *
 * A porta fica livre pelo mesmo motivo. O que continua fechado é o que
 * importa: nada fora de loopback, nunca em https de terceiros, e nunca em
 * produção -- lá esta função devolve a origem única e pronto.
 */
export function corsOptions(nodeEnv: string, frontendUrl: string): CorsOptions {
  if (nodeEnv === 'production') {
    return { origin: frontendUrl };
  }

  return {
    origin: (origin, callback) => {
      // Sem `Origin` é requisição que não veio de browser -- curl, um health
      // check. CORS não se aplica, e recusar aqui não protegeria nada.
      if (!origin || origin === frontendUrl || isLoopbackOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}
