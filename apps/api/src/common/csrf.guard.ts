import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_HEADER = 'x-requested-with';
const CSRF_HEADER_VALUE = 'XMLHttpRequest';

/**
 * RNF-SEG3: on top of SameSite=Strict, every mutating request must also
 * carry this header. A classic cross-site <form> submission cannot set
 * custom headers at all, and a cross-origin fetch/XHR trying to set it
 * would already be blocked by CORS (RNF-SEG7) before reaching the server --
 * this is belt-and-suspenders for browsers with imperfect SameSite
 * enforcement. Registered globally (APP_GUARD in AppModule) so every future
 * mutating route -- including the Project admin CRUD that doesn't exist
 * yet -- inherits it automatically.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!MUTATING_METHODS.has(request.method)) {
      return true;
    }

    if (request.headers[CSRF_HEADER] !== CSRF_HEADER_VALUE) {
      throw new ForbiddenException('Missing CSRF protection header');
    }

    return true;
  }
}
