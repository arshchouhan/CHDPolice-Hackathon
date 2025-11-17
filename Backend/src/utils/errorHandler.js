/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthenticatedError extends ApiError {
  constructor(message = 'Not authorized to access this route') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden Error
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Not authorized to perform this action') {
    super(message, 403);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * 409 Conflict Error
 */
export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * 422 Validation Error
 */
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Default error status and message
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error 💥', {
      status: err.status,
      message: err.message,
      stack: err.stack,
    });
  }

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    err = new UnauthenticatedError('Invalid token. Please log in again!');
  }
  if (err.name === 'TokenExpiredError') {
    err = new UnauthenticatedError('Your token has expired! Please log in again.');
  }
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    err = new ValidationError('Validation failed', errors);
  }
  if (err.code === 11000) {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    err = new ConflictError(`Duplicate field value: ${value}. Please use another value.`);
  }
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    err = new BadRequestError(message);
  }

  // Send error response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    errors: err.errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default {
  ApiError,
  BadRequestError,
  UnauthenticatedError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  errorHandler,
};
