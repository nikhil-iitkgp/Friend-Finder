import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export async function GET(request: NextRequest) {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    service: 'FriendFinder',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    // Check database connection
    await connectDB();
    
    // Check environment variables
    const requiredEnvVars = [
      'MONGODB_URI',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        {
          ...healthcheck,
          status: 'ERROR',
          message: 'Missing required environment variables',
          missing: missingEnvVars,
        },
        { status: 500 }
      );
    }

    // All checks passed
    return NextResponse.json({
      ...healthcheck,
      status: 'OK',
      database: 'connected',
      checks: {
        database: 'healthy',
        environment: 'configured',
      },
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        ...healthcheck,
        status: 'ERROR',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'disconnected',
      },
      { status: 503 }
    );
  }
}