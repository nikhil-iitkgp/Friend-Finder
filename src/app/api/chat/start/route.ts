import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Thread } from "@/models/Message";
import User from "@/models/User";
import { z } from "zod";

const StartConversationSchema = z.object({
  participantId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { participantId } = StartConversationSchema.parse(body);

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get participant user
    const participant = await User.findById(participantId);
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Check if users are friends (optional privacy check)
    if (!currentUser.friends.includes(participantId)) {
      return NextResponse.json({ 
        error: "You can only start conversations with friends" 
      }, { status: 403 });
    }

    // Find or create thread
    const thread = await Thread.findOrCreateThread(
      currentUser._id.toString(),
      participantId
    );

    // Populate participant info
    await thread.populate('participants', 'username profilePicture lastSeen');

    // Format response
    const otherParticipant = thread.participants.find(
      (p: any) => p._id.toString() !== currentUser._id.toString()
    );

    const response = {
      id: thread._id,
      threadId: thread.threadId,
      participant: otherParticipant ? {
        id: otherParticipant._id,
        username: otherParticipant.username,
        profilePicture: otherParticipant.profilePicture,
        lastSeen: otherParticipant.lastSeen,
        isOnline: new Date().getTime() - new Date(otherParticipant.lastSeen).getTime() < 5 * 60 * 1000,
      } : null,
      lastMessage: null,
      lastMessageAt: thread.lastMessageAt,
      unreadCount: thread.unreadCount?.get(currentUser._id.toString()) || 0,
      isGroup: thread.isGroup,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    };

    return NextResponse.json({
      message: "Conversation started",
      data: response,
    });

  } catch (error) {
    console.error("Start conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}