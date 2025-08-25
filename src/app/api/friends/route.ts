import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findOne({ email: session.user.email })
      .populate("friends", "username profilePicture bio lastSeen")
      .select("friends");

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Format friends data
    const friendsData = currentUser.friends.map((friend: any) => ({
      id: friend._id,
      username: friend.username,
      profilePicture: friend.profilePicture,
      bio: friend.bio,
      lastSeen: friend.lastSeen,
      isOnline: new Date().getTime() - new Date(friend.lastSeen).getTime() < 5 * 60 * 1000, // 5 minutes
    }));

    return NextResponse.json({ 
      data: friendsData,
      count: friendsData.length
    });

  } catch (error) {
    console.error("Get friends error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

// Remove a friend
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get("friendId");

    if (!friendId) {
      return NextResponse.json({ error: "Friend ID required" }, { status: 400 });
    }

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get friend user
    const friendUser = await User.findById(friendId);
    if (!friendUser) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    // Remove from both users' friends lists
    currentUser.friends = currentUser.friends.filter(
      (id) => id.toString() !== friendId
    );
    friendUser.friends = friendUser.friends.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    await Promise.all([currentUser.save(), friendUser.save()]);

    // Emit real-time notification via Socket.io
    const io = (global as any).io;
    if (io) {
      io.to(`user_${friendId}`).emit("friend_removed", {
        by: {
          id: currentUser._id,
          username: currentUser.username,
        },
        timestamp: new Date(),
      });
    }

    return NextResponse.json({ 
      message: "Friend removed successfully",
      data: {
        removedFriendId: friendId,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error("Remove friend error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}