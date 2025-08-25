import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
}

export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  code = 'FORBIDDEN';
  
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error handler for API routes
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  // Custom API errors
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode || 500 }
    );
  }

  // MongoDB duplicate key error
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    const field = Object.keys((error as any).keyPattern || {})[0] || 'field';
    return NextResponse.json(
      {
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        code: 'DUPLICATE_KEY',
      },
      { status: 409 }
    );
  }

  // MongoDB validation error
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
    const validationError = error as any;
    const errors = Object.values(validationError.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
    }));
    
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: errors,
      },
      { status: 400 }
    );
  }

  // Default server error
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// Async error wrapper for API routes
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

// Rate limiting utility
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, data] of rateLimitMap.entries()) {
    if (data.resetTime < windowStart) {
      rateLimitMap.delete(key);
    }
  }
  
  const current = rateLimitMap.get(identifier);
  
  if (!current) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }
  
  if (current.resetTime < windowStart) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime + windowMs };
  }
  
  current.count++;
  return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime + windowMs };
}

// Middleware for rate limiting
export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000,
  getIdentifier: (request: Request) => string = (req) => {
    // Use IP address as default identifier
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return ip;
  }
) {
  return function<T extends any[], R>(
    handler: (request: Request, ...args: T) => Promise<R>
  ) {
    return async (request: Request, ...args: T): Promise<R | NextResponse> => {
      const identifier = getIdentifier(request);
      const limit = rateLimit(identifier, maxRequests, windowMs);
      
      if (!limit.allowed) {
        throw new RateLimitError('Rate limit exceeded. Please try again later.');
      }
      
      const response = await handler(request, ...args);
      
      // Add rate limit headers if response is NextResponse
      if (response instanceof NextResponse) {
        response.headers.set('X-RateLimit-Limit', maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', limit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', Math.ceil(limit.resetTime / 1000).toString());
      }
      
      return response;
    };
  };
}