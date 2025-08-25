import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Thread } from "@/models/Message";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get conversations for the user
    const conversations = await Thread.getConversationsForUser(currentUser._id.toString(), {
      limit,
      offset,
    });

    // Format conversations for response
    const formattedConversations = conversations.map((thread: any) => {
      // Get the other participant (not the current user)
      const otherParticipant = thread.participants.find(
        (p: any) => p._id.toString() !== currentUser._id.toString()
      );

      const unreadCount = thread.unreadCount?.get(currentUser._id.toString()) || 0;

      return {
        id: thread._id,
        threadId: thread.threadId,
        participant: otherParticipant ? {
          id: otherParticipant._id,
          username: otherParticipant.username,
          profilePicture: otherParticipant.profilePicture,
          lastSeen: otherParticipant.lastSeen,
          isOnline: new Date().getTime() - new Date(otherParticipant.lastSeen).getTime() < 5 * 60 * 1000,
        } : null,
        lastMessage: thread.lastMessage ? {
          id: thread.lastMessage._id,
          text: thread.lastMessage.text,
          messageType: thread.lastMessage.messageType,
          senderId: thread.lastMessage.senderId,
          createdAt: thread.lastMessage.createdAt,
        } : null,
        lastMessageAt: thread.lastMessageAt,
        unreadCount,
        isGroup: thread.isGroup,
        groupName: thread.groupName,
        groupImage: thread.groupImage,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      };
    });

    return NextResponse.json({
      data: formattedConversations,
      pagination: {
        limit,
        offset,
        hasMore: formattedConversations.length === limit,
      },
    });

  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}