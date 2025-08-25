import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected' | 'error';
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  environment: string;
  version: string;
  checks: {
    database: boolean;
    memory: boolean;
    uptime: boolean;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Initialize health check results
  let databaseStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let databaseCheck = false;
  let memoryCheck = false;
  let uptimeCheck = false;

  // Check database connection
  try {
    await connectDB();
    databaseStatus = 'connected';
    databaseCheck = true;
  } catch (error) {
    console.error('Database health check failed:', error);
    databaseStatus = 'error';
    databaseCheck = false;
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryPercentage = (usedMemory / totalMemory) * 100;
  
  // Memory check passes if usage is below 90%
  memoryCheck = memoryPercentage < 90;

  // Check uptime (should be running for at least 5 seconds)
  const uptime = process.uptime();
  uptimeCheck = uptime > 5;

  // Determine overall health status
  const isHealthy = databaseCheck && memoryCheck && uptimeCheck;

  const healthResponse: HealthResponse = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    database: databaseStatus,
    memory: {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(memoryPercentage * 100) / 100
    },
    environment: process.env.NODE_ENV || 'unknown',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: databaseCheck,
      memory: memoryCheck,
      uptime: uptimeCheck
    }
  };

  // Set appropriate status code
  const statusCode = isHealthy ? 200 : 503;
  
  // Add response time header
  const responseTime = Date.now() - startTime;
  
  const response = NextResponse.json(healthResponse, { status: statusCode });
  
  // Add headers
  response.headers.set('X-Response-Time', `${responseTime}ms`);
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

// Reject non-GET methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' }, 
    { status: 405, headers: { 'Allow': 'GET' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' }, 
    { status: 405, headers: { 'Allow': 'GET' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' }, 
    { status: 405, headers: { 'Allow': 'GET' } }
  );
}