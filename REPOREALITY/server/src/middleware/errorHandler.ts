import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: string;

  constructor(statusCode: number, message: string, details?: string, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  const isProduction = process.env['NODE_ENV'] === 'production';

  let statusCode = 500;
  let message = 'Internal server error';
  let details: string | undefined = undefined;

  // Log error
  console.error(`[Error] [${timestamp}] ${req.method} ${req.originalUrl}:`, err);

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    const issues = err.issues.map((issue) => {
      const fieldPath = issue.path.join('.');
      return fieldPath ? `${fieldPath}: ${issue.message}` : issue.message;
    });
    details = issues.join('; ');
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    statusCode = 400;
    message = 'Invalid JSON payload received';
    details = err.message;
  } else if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>;

    // Network / timeout error handling
    if (errorObj['name'] === 'AbortError' || errorObj['code'] === 'ETIMEDOUT') {
      statusCode = 504;
      message = 'Request timed out while communicating with upstream service';
      details = isProduction ? undefined : String(errorObj['message'] || '');
    } else if (errorObj['code'] === 'ECONNREFUSED' || errorObj['code'] === 'ENOTFOUND') {
      statusCode = 502;
      message = 'Failed to connect to external service';
      details = isProduction ? undefined : String(errorObj['message'] || '');
    } else {
      if (typeof errorObj['statusCode'] === 'number') {
        statusCode = errorObj['statusCode'];
      } else if (typeof errorObj['status'] === 'number') {
        statusCode = errorObj['status'];
      }

      if (statusCode >= 500 && isProduction) {
        message = 'Internal server error';
        details = undefined;
      } else {
        message = typeof errorObj['message'] === 'string' ? errorObj['message'] : 'Internal server error';
        if (!isProduction && typeof errorObj['stack'] === 'string') {
          details = errorObj['stack'];
        }
      }
    }
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details ? { details } : {}),
  });
}
