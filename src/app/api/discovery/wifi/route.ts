import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { PresenceUpdateSchema } from '@/lib/validations';
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
    const validatedData = PresenceUpdateSchema.parse(body);

    // Connect to database
    await connectDB();

    // Update user's WiFi presence
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        currentBSSID: validatedData.bssid,
        lastSeenWiFi: new Date(),
        updatedAt: new Date(),
      },
      { new: true, select: 'currentBSSID lastSeenWiFi isDiscoverable' }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'WiFi presence updated successfully',
      presence: {
        bssid: updatedUser.currentBSSID,
        lastUpdate: updatedUser.lastSeenWiFi,
        isDiscoverable: updatedUser.isDiscoverable,
      },
    });

  } catch (error) {
    console.error('WiFi Presence Update API Error:', error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid WiFi data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update WiFi presence' },
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

    // Find the current user and get their WiFi presence
    const currentUser = await User.findOne(
      { email: session.user.email },
      { currentBSSID: 1, lastSeenWiFi: 1, _id: 1, isDiscoverable: 1, friends: 1, friendRequests: 1 }
    );

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has WiFi presence data
    if (!currentUser.currentBSSID) {
      return NextResponse.json({
        success: true,
        users: [],
        totalFound: 0,
        networkId: null,
        message: 'No WiFi network detected. Please connect to a WiFi network.',
        timestamp: new Date().toISOString(),
      });
    }

    // Find nearby users on the same WiFi network
    const nearbyUsers = await User.aggregate([
      {
        $match: {
          _id: { $ne: currentUser._id }, // Exclude current user
          currentBSSID: currentUser.currentBSSID, // Same WiFi network
          isDiscoverable: true, // Only discoverable users
          isActive: true, // Only active users
          lastSeenWiFi: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Active within last 24 hours
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
          lastSeenWiFi: 1,
          isOnline: 1,
          isFriend: 1,
          hasPendingRequest: 1,
          privacySettings: 1,
        }
      },
      {
        // Sort by most recently seen on WiFi
        $sort: { lastSeenWiFi: -1 }
      },
      {
        // Limit results
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
      isFriend: user.isFriend || false,
      hasPendingRequest: user.hasPendingRequest || false,
      // Apply privacy settings
      showAge: user.privacySettings?.showAge ?? true,
      showLocation: user.privacySettings?.showLocation ?? true,
      showLastSeen: user.privacySettings?.showLastSeen ?? true,
      // WiFi specific data
      lastSeenWiFi: user.lastSeenWiFi,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      totalFound: formattedUsers.length,
      networkId: currentUser.currentBSSID,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('WiFi Discovery API Error:', error);
    return NextResponse.json(
      { error: 'Failed to discover nearby users via WiFi' },
      { status: 500 }
    );
  }
}