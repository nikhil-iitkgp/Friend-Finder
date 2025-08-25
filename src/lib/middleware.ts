import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  return function rateLimitMiddleware(
    identifier: string,
    request: NextRequest
  ): NextResponse | null {
    const now = Date.now();
    const key = `${identifier}:${request.nextUrl.pathname}`;
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime <= now) {
        rateLimitStore.delete(k);
      }
    }

    const record = rateLimitStore.get(key);
    
    if (!record) {
      // First request in window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return null; // Allow request
    }

    if (record.resetTime <= now) {
      // Window expired, reset
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return null; // Allow request
    }

    if (record.count >= options.maxRequests) {
      // Rate limit exceeded
      const resetTime = Math.ceil((record.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          error: options.message || 'Too many requests',
          retryAfter: resetTime
        },
        {
          status: 429,
          headers: {
            'Retry-After': resetTime.toString(),
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': record.resetTime.toString()
          }
        }
      );
    }

    // Increment counter
    record.count++;
    rateLimitStore.set(key, record);
    
    return null; // Allow request
  };
}

/**
 * Authentication middleware
 */
export async function requireAuth(request: NextRequest): Promise<{
  response?: NextResponse;
  session?: any;
  user?: any;
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return {
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    return { session, user: session.user };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}

/**
 * Input validation middleware
 */
export function validateInput<T>(
  schema: { parse: (data: any) => T },
  data: any
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}

/**
 * Security headers middleware
 */
export function securityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://maps.googleapis.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https: wss: ws:; " +
    "frame-src 'self' https://accounts.google.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );

  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), payment=()');

  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

/**
 * CORS middleware
 */
export function corsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://friendfinder.vercel.app'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );

  return response;
}

/**
 * Combine multiple middlewares
 */
export function withMiddleware<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  middlewares: Array<(request: NextRequest, ...args: any[]) => Promise<NextResponse | null>>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    
    // Apply middlewares
    for (const middleware of middlewares) {
      const result = await middleware(request, ...args.slice(1));
      if (result) {
        return result; // Middleware returned early response
      }
    }
    
    // All middlewares passed, call handler
    const response = await handler(...args);
    
    // Apply security headers to response
    return securityHeaders(response);
  };
}

// Common rate limits
export const rateLimits = {
  // Authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 min
    message: 'Too many authentication attempts'
  }),
  
  // Friend requests
  friendRequest: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'Too many friend requests'
  }),
  
  // Message sending
  message: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 messages per minute
    message: 'Too many messages'
  }),
  
  // File uploads
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute
    message: 'Too many file uploads'
  }),
  
  // Discovery endpoints
  discovery: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 discovery requests per minute
    message: 'Too many discovery requests'
  })
};