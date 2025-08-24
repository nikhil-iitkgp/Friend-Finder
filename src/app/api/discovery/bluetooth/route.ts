import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { User } from '@/models/User';
import { BluetoothUpdateSchema, BluetoothScanSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// PUT endpoint for updating user's Bluetooth ID
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
    const validatedData = BluetoothUpdateSchema.parse(body);

    // Connect to database
    await connectDB();

    // Update user's Bluetooth ID
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        bluetoothId: validatedData.bluetoothId,
        bluetoothIdUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true, select: 'bluetoothId bluetoothIdUpdatedAt isDiscoverable' }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bluetooth ID updated successfully',
      bluetooth: {
        bluetoothId: updatedUser.bluetoothId,
        lastUpdate: updatedUser.bluetoothIdUpdatedAt,
        isDiscoverable: updatedUser.isDiscoverable,
      },
    });

  } catch (error) {
    console.error('Bluetooth Update API Error:', error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid Bluetooth data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update Bluetooth ID' },
      { status: 500 }
    );
  }
}

// POST endpoint for Bluetooth discovery based on scanned device IDs
export async function POST(request: NextRequest) {
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
    const validatedData = BluetoothScanSchema.parse(body);

    // Connect to database
    await connectDB();

    // Find the current user
    const currentUser = await User.findOne(
      { email: session.user.email },
      { _id: 1, bluetoothId: 1, isDiscoverable: 1, friends: 1, friendRequests: 1 }
    );

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (validatedData.nearbyDevices.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        totalFound: 0,
        scannedDevices: [],
        message: 'No Bluetooth devices detected in range.',
        timestamp: new Date().toISOString(),
      });
    }

    // Find users with matching Bluetooth IDs
    const nearbyUsers = await User.aggregate([
      {
        $match: {
          _id: { $ne: currentUser._id }, // Exclude current user
          bluetoothId: { $in: validatedData.nearbyDevices }, // Match scanned device IDs
          isDiscoverable: true, // Only discoverable users
          isActive: true, // Only active users
          bluetoothIdUpdatedAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Updated within last 7 days
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
          bluetoothId: 1,
          bluetoothIdUpdatedAt: 1,
          isFriend: 1,
          hasPendingRequest: 1,
          privacySettings: 1,
        }
      },
      {
        // Sort by most recently updated Bluetooth ID
        $sort: { bluetoothIdUpdatedAt: -1 }
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
      // Bluetooth specific data (anonymized)
      bluetoothLastUpdate: user.bluetoothIdUpdatedAt,
      // Don't expose actual Bluetooth ID for privacy
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      totalFound: formattedUsers.length,
      scannedDevices: validatedData.nearbyDevices,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Bluetooth Discovery API Error:', error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid scan data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to discover nearby users via Bluetooth' },
      { status: 500 }
    );
  }
}