import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  isProtectedAdminPath,
  loginPathForRequest,
} from './lib/admin-routes';

/**
 * Redirects `/` to the default locale and rejects unknown locale segments.
 *
 * Named `proxy.ts` exporting `proxy`, not `middleware.ts` exporting
 * `middleware`: Next.js 16 renamed the file convention (the behaviour is
 * unchanged). next-intl's own docs still show the old name, so following them
 * literally produces a file Next never loads -- and the failure is silent,
 * since a site with no locale routing still builds and serves `/pt` directly.
 */
const handleI18nRouting = createMiddleware(routing);

/**
 * RF-AUT1, user story 4: `/admin/*` must never be reachable by guessing the
 * URL.
 *
 * The check lives here rather than in a layout because this is the one place
 * that runs before the page and *can* read the cookie: it is `HttpOnly`, so
 * no client component will ever see it, and a layout-level check would have
 * to round-trip to the API on every navigation.
 *
 * What it proves is presence, not validity — the proxy has no access to the
 * JWT secret and deliberately does not get one. A forged or expired cookie
 * gets past this and is then rejected by the API on the first real call,
 * which is the check that actually matters. Treating this as authentication
 * rather than as a cheap first gate would be the mistake; it exists so an
 * anonymous visitor lands on the login screen instead of on a broken panel.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Qualquer um dos dois cookies deixa passar, e não só o de acesso.
  //
  // O access token dura 15 minutos e o refresh 30 dias, então o estado normal
  // de quem volta ao painel depois de um café é: sem access token, com
  // refresh válido. Exigir o de acesso aqui mandava essa pessoa para o login
  // sem nunca dar chance à renovação — era o "expulsa a cada 15 minutos".
  //
  // Não afrouxa a proteção: isto sempre foi presença, nunca validade (ver
  // abaixo), e continua sendo a API quem decide. Um refresh token forjado
  // passa por aqui, falha na renovação e cai no login do mesmo jeito.
  if (
    isProtectedAdminPath(pathname) &&
    !request.cookies.has(ACCESS_TOKEN_COOKIE) &&
    !request.cookies.has(REFRESH_TOKEN_COOKIE)
  ) {
    return NextResponse.redirect(
      new URL(loginPathForRequest(pathname), request.url),
    );
  }

  return handleI18nRouting(request);
}

export const config = {
  // Skips API routes, Next internals and anything with a file extension, so
  // static assets are not put through locale negotiation.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
