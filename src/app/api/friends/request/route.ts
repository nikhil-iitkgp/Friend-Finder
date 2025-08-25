import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { SendFriendRequestSchema } from "@/lib/validations";
import { Server } from "socket.io";
import { createServer } from "http";

// Global Socket.io instance for this API route
let io: Server;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { toUserId } = SendFriendRequestSchema.parse(body);

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get target user
    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Check if already friends
    if (currentUser.friends.includes(toUserId)) {
      return NextResponse.json({ error: "Already friends" }, { status: 400 });
    }

    // Check if friend request already exists
    const existingRequest = targetUser.friendRequests.find(
      (req) => req.from.toString() === currentUser._id.toString()
    );

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json({ error: "Friend request already sent" }, { status: 400 });
      }
      if (existingRequest.status === "rejected") {
        // Allow re-sending after rejection
        existingRequest.status = "pending";
        existingRequest.createdAt = new Date();
      }
    } else {
      // Add new friend request
      targetUser.friendRequests.push({
        from: currentUser._id,
        status: "pending",
        createdAt: new Date(),
      });
    }

    await targetUser.save();

    // Emit real-time notification via Socket.io
    if (io) {
      io.to(`user_${toUserId}`).emit("friend_request_received", {
        from: {
          id: currentUser._id,
          username: currentUser.username,
          profilePicture: currentUser.profilePicture,
        },
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ 
      message: "Friend request sent",
      data: {
        to: {
          id: targetUser._id,
          username: targetUser.username,
        }
      }
    });

  } catch (error) {
    console.error("Friend request error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

// Get pending friend requests for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findOne({ email: session.user.email })
      .populate("friendRequests.from", "username profilePicture bio");

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Filter pending requests only
    const pendingRequests = currentUser.friendRequests
      .filter((req) => req.status === "pending")
      .map((req) => ({
        id: req._id,
        from: req.from,
        createdAt: req.createdAt,
      }));

    return NextResponse.json({ 
      data: pendingRequests,
      count: pendingRequests.length
    });

  } catch (error) {
    console.error("Get friend requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}