import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const GENERIC_ERROR_MESSAGE = 'Ha ocurrido un error interno';

/**
 * Pattern que indica si un mensaje contiene información sensible:
 * rutas de archivo, trazas de stack, o consultas SQL.
 */
const SENSITIVE_PATTERN =
  /(\/[\w.-]+)+\.[a-z]+|(\\\\[\w.-]+)+|(?:`[^`]+`|'[^']*')\s*(?:FROM|JOIN|INTO|UPDATE|DELETE|INSERT|DROP|ALTER|CREATE|EXEC|EXECUTE)\b|(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\s+.*?(?:FROM|INTO|TABLE|PROCEDURE|VIEW)|at\s+\S+:\d+:\d+|stack\s*:/i;

function isSensitiveMessage(message: string): boolean {
  return SENSITIVE_PATTERN.test(message);
}

function sanitizeMessage(message: string): string {
  if (isSensitiveMessage(message)) {
    return GENERIC_ERROR_MESSAGE;
  }
  return message;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = GENERIC_ERROR_MESSAGE;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      // Map status to code
      switch (status) {
        case 400:
          code = 'BAD_REQUEST';
          break;
        case 401:
          code = 'UNAUTHORIZED';
          break;
        case 403:
          code = 'FORBIDDEN';
          break;
        case 404:
          code = 'NOT_FOUND';
          break;
        case 409:
          code = 'CONFLICT';
          break;
        case 429:
          code = 'RATE_LIMIT';
          break;
        default:
          code = 'HTTP_ERROR';
      }

      // Extract message safely — avoid exposing internal details
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const exObj = exResponse as Record<string, unknown>;
        if (typeof exObj['message'] === 'string') {
          message = exObj['message'];
        } else if (Array.isArray(exObj['message'])) {
          // NestJS validation pipes return an array of error strings
          message = (exObj['message'] as string[]).join('; ');
        }
      }
    }

    // Sanitize message: never expose internals to the client
    message = sanitizeMessage(message);

    // Log full error details internally (never sent to client)
    this.logger.error(
      `[${request.method}] ${request.url} ${status} — ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : '',
    );

    // Return standardized error response
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }
}
