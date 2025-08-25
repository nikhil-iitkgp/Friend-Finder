import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Message, Thread } from "@/models/Message";
import User from "@/models/User";
import { SendMessageSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const threadId = params.threadId;
    const body = await request.json();
    const { text, messageType, metadata } = SendMessageSchema.parse(body);

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find or create thread
    const thread = await Thread.findOne({ threadId });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Verify user is participant in this thread
    if (!thread.participants.some((p: any) => p.toString() === currentUser._id.toString())) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get the other participant
    const otherParticipant = thread.participants.find(
      (p: any) => p.toString() !== currentUser._id.toString()
    );

    if (!otherParticipant) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Create new message
    const message = await Message.create({
      senderId: currentUser._id,
      receiverId: otherParticipant,
      threadId,
      text,
      messageType,
      metadata,
    });

    // Update thread with last message info
    await Thread.findOneAndUpdate(
      { threadId },
      {
        lastMessage: message._id,
        lastMessageAt: message.createdAt,
        $inc: {
          [`unreadCount.${otherParticipant.toString()}`]: 1
        }
      }
    );

    // Populate sender info
    await message.populate('senderId', 'username profilePicture');

    // Emit real-time message via Socket.io
    const io = (global as any).io;
    if (io) {
      // Send to recipient
      io.to(`user_${otherParticipant.toString()}`).emit('message_received', {
        message: {
          id: message._id,
          senderId: message.senderId._id,
          senderInfo: {
            username: message.senderId.username,
            profilePicture: message.senderId.profilePicture,
          },
          threadId: message.threadId,
          text: message.text,
          messageType: message.messageType,
          metadata: message.metadata,
          createdAt: message.createdAt,
        },
        threadInfo: {
          threadId,
          unreadCount: thread.unreadCount?.get(otherParticipant.toString()) + 1 || 1,
        }
      });

      // Send confirmation to sender
      io.to(`user_${currentUser._id.toString()}`).emit('message_sent', {
        tempId: body.tempId, // If client provides temp ID for optimistic updates
        message: {
          id: message._id,
          senderId: message.senderId._id,
          threadId: message.threadId,
          text: message.text,
          messageType: message.messageType,
          metadata: message.metadata,
          createdAt: message.createdAt,
        }
      });
    }

    return NextResponse.json({
      message: "Message sent successfully",
      data: {
        id: message._id,
        senderId: message.senderId._id,
        senderInfo: {
          username: message.senderId.username,
          profilePicture: message.senderId.profilePicture,
        },
        threadId: message.threadId,
        text: message.text,
        messageType: message.messageType,
        metadata: message.metadata,
        createdAt: message.createdAt,
      }
    });

  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}