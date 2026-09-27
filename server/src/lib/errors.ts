export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly userMessage: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    httpStatus: number,
    userMessage: string,
    details?: unknown,
    isOperational = true
  ) {
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.userMessage = userMessage;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Invalid request parameters', details?: unknown) {
    return new AppError('BAD_REQUEST', 400, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError('UNAUTHORIZED', 401, message);
  }

  static forbidden(message = 'Access forbidden') {
    return new AppError('FORBIDDEN', 403, message);
  }

  static notFound(message = 'Requested resource not found') {
    return new AppError('NOT_FOUND', 404, message);
  }

  static conflict(message = 'Resource state conflict', details?: unknown) {
    return new AppError('CONFLICT', 409, message, details);
  }

  static unprocessable(message = 'Validation failed', details?: unknown) {
    return new AppError('VALIDATION_FAILED', 422, message, details);
  }

  static rateLimited(message = 'Too many requests, please slow down') {
    return new AppError('RATE_LIMITED', 429, message);
  }

  static internal(message = 'Something went wrong on our side. Nothing was changed.') {
    return new AppError('INTERNAL_ERROR', 500, message, undefined, false);
  }

  static upstream(message = 'Upstream service temporarily unavailable') {
    return new AppError('UPSTREAM_ERROR', 502, message);
  }
}
