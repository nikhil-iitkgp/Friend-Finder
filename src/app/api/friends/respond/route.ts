import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { RespondFriendRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { requestId, action } = RespondFriendRequestSchema.parse(body);

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the friend request
    const friendRequest = currentUser.friendRequests.find(
      (req) => req._id?.toString() === requestId
    );

    if (!friendRequest) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (friendRequest.status !== "pending") {
      return NextResponse.json({ error: "Friend request already processed" }, { status: 400 });
    }

    // Update request status
    friendRequest.status = action;

    if (action === "accepted") {
      // Get the sender user
      const senderUser = await User.findById(friendRequest.from);
      if (!senderUser) {
        return NextResponse.json({ error: "Sender user not found" }, { status: 404 });
      }

      // Add each other as friends
      if (!currentUser.friends.includes(friendRequest.from)) {
        currentUser.friends.push(friendRequest.from);
      }
      if (!senderUser.friends.includes(currentUser._id)) {
        senderUser.friends.push(currentUser._id);
      }

      await senderUser.save();

      // Emit real-time notification via Socket.io
      const io = (global as any).io;
      if (io) {
        io.to(`user_${senderUser._id}`).emit("friend_request_accepted", {
          by: {
            id: currentUser._id,
            username: currentUser.username,
            profilePicture: currentUser.profilePicture,
          },
          timestamp: new Date(),
        });
      }
    }

    await currentUser.save();

    return NextResponse.json({ 
      message: `Friend request ${action}`,
      data: {
        requestId,
        action,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error("Respond friend request error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}