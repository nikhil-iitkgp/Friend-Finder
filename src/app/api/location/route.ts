import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { LocationUpdateSchema } from '@/lib/validations';
import { ZodError } from 'zod';

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = LocationUpdateSchema.parse(body);

    // Connect to database
    await connectDB();

    // Create GeoJSON Point for MongoDB
    const location = {
      type: 'Point',
      coordinates: [validatedData.longitude, validatedData.latitude], // [lng, lat] order for GeoJSON
    };

    // Update user location
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        location,
        lastLocationUpdate: new Date(),
        updatedAt: new Date(),
      },
      { new: true, select: 'location lastLocationUpdate isDiscoverable discoveryRange' }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return success response with updated location data
    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        accuracy: validatedData.accuracy,
        lastUpdate: updatedUser.lastLocationUpdate,
      },
      discovery: {
        isDiscoverable: updatedUser.isDiscoverable,
        discoveryRange: updatedUser.discoveryRange,
      },
    });

  } catch (error) {
    console.error('Location Update API Error:', error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid location data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Get user's current location
    const user = await User.findOne(
      { email: session.user.email },
      { location: 1, lastLocationUpdate: 1, isDiscoverable: 1, discoveryRange: 1 }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has location data
    if (!user.location?.coordinates) {
      return NextResponse.json({
        hasLocation: false,
        message: 'No location data available',
      });
    }

    // Return current location
    return NextResponse.json({
      hasLocation: true,
      location: {
        latitude: user.location.coordinates[1], // lat is second in GeoJSON
        longitude: user.location.coordinates[0], // lng is first in GeoJSON
        lastUpdate: user.lastLocationUpdate,
      },
      discovery: {
        isDiscoverable: user.isDiscoverable,
        discoveryRange: user.discoveryRange,
      },
    });

  } catch (error) {
    console.error('Get Location API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get location' },
      { status: 500 }
    );
  }
}