import { NextResponse } from "next/server";
import connectDB from "./mongoose";

/**
 * Middleware wrapper for API routes that need database connection
 * @param handler - The API route handler function
 * @returns Wrapped handler with automatic DB connection
 */
export function withDB<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      await connectDB();
      return await handler(...args);
    } catch (error) {
      console.error("Database connection error:", error);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }
  };
}

/**
 * Error handler for API routes
 * @param error - The error object
 * @param context - Additional context for debugging
 * @returns NextResponse with error details
 */
export function handleAPIError(error: any, context?: string): NextResponse {
  console.error(`API Error${context ? ` (${context})` : ""}: `, error);
  
  if (error.name === "ValidationError") {
    return NextResponse.json(
      { error: "Validation failed", details: error.message },
      { status: 400 }
    );
  }
  
  if (error.name === "CastError") {
    return NextResponse.json(
      { error: "Invalid ID format" },
      { status: 400 }
    );
  }
  
  if (error.code === 11000) {
    return NextResponse.json(
      { error: "Duplicate entry", field: Object.keys(error.keyPattern)[0] },
      { status: 409 }
    );
  }
  
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

/**
 * Safely parse JSON from request body
 * @param request - Next.js request object
 * @returns Parsed JSON or null if invalid
 */
export async function parseRequestBody(request: Request): Promise<any> {
  try {
    const body = await request.text();
    return body ? JSON.parse(body) : null;
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}

/**
 * Rate limiting helper (basic implementation)
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests allowed in window
 * @returns Whether request is allowed
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 10
): boolean {
  const now = Date.now();
  const key = identifier;
  
  const existing = rateLimitMap.get(key);
  
  if (!existing || now > existing.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (existing.count >= maxRequests) {
    return false;
  }
  
  existing.count++;
  return true;
}