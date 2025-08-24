import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { NearbyUsersQuerySchema } from '@/lib/validations';
import { ZodError } from 'zod';

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      radius: searchParams.get('radius') || '5000',
    };
    
    const validatedQuery = NearbyUsersQuerySchema.parse(queryData);

    // Connect to database
    await connectDB();

    // Find the current user and get their location
    const currentUser = await User.findOne(
      { email: session.user.email },
      { location: 1, _id: 1, isDiscoverable: 1, friends: 1, friendRequests: 1 }
    );

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has location data
    if (!currentUser.location?.coordinates) {
      return NextResponse.json(
        { error: 'Location not available. Please update your location first.' },
        { status: 400 }
      );
    }

    // Find nearby users using MongoDB's geospatial query
    const nearbyUsers = await User.aggregate([
      {
        // Use $geoNear to find users within radius
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: currentUser.location.coordinates
          },
          distanceField: 'distance',
          maxDistance: validatedQuery.radius,
          spherical: true,
          query: {
            _id: { $ne: currentUser._id }, // Exclude current user
            isDiscoverable: true, // Only discoverable users
            isActive: true, // Only active users
            location: { $exists: true }, // Must have location
          }
        }
      },
      {
        // Add fields to determine relationship status
        $addFields: {
          isFriend: {
            $in: [currentUser._id, '$friends']
          },
          hasPendingRequest: {
            $or: [
              { $in: [currentUser._id, '$friendRequests.sent'] },
              { $in: [currentUser._id, '$friendRequests.received'] }
            ]
          }
        }
      },
      {
        // Project only needed fields
        $project: {
          _id: 1,
          username: 1,
          firstName: 1,
          lastName: 1,
          profilePicture: 1,
          bio: 1,
          interests: 1,
          lastSeen: 1,
          isOnline: 1,
          distance: 1,
          isFriend: 1,
          hasPendingRequest: 1,
          privacySettings: 1,
        }
      },
      {
        // Sort by distance (closest first)
        $sort: { distance: 1 }
      },
      {
        // Limit results to prevent overwhelming response
        $limit: 50
      }
    ]);

    // Format the response data
    const formattedUsers = nearbyUsers.map(user => ({
      id: user._id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      bio: user.bio,
      interests: user.interests || [],
      lastSeen: user.lastSeen,
      isOnline: user.isOnline || false,
      distance: Math.round(user.distance), // Round distance to nearest meter
      isFriend: user.isFriend || false,
      hasPendingRequest: user.hasPendingRequest || false,
      // Apply privacy settings
      showAge: user.privacySettings?.showAge ?? true,
      showLocation: user.privacySettings?.showLocation ?? true,
      showLastSeen: user.privacySettings?.showLastSeen ?? true,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      totalFound: formattedUsers.length,
      searchRadius: validatedQuery.radius,
      centerLocation: {
        latitude: currentUser.location.coordinates[1],
        longitude: currentUser.location.coordinates[0],
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('GPS Discovery API Error:', error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to discover nearby users' },
      { status: 500 }
    );
  }
}