import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Message, Thread } from "@/models/Message";
import User from "@/models/User";

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
    const { messageId } = body; // Optional: mark specific message, otherwise mark all as read

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user is participant in this thread
    const thread = await Thread.findOne({ 
      threadId,
      participants: currentUser._id 
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 });
    }

    if (messageId) {
      // Mark specific message as read
      const message = await Message.findOneAndUpdate(
        {
          _id: messageId,
          threadId,
          receiverId: currentUser._id,
          readAt: null
        },
        { readAt: new Date() },
        { new: true }
      );

      if (!message) {
        return NextResponse.json({ error: "Message not found or already read" }, { status: 404 });
      }

      // Update thread unread count
      const currentCount = thread.unreadCount?.get(currentUser._id.toString()) || 0;
      if (currentCount > 0) {
        thread.unreadCount?.set(currentUser._id.toString(), currentCount - 1);
        await thread.save();
      }

    } else {
      // Mark all unread messages as read
      const result = await Message.updateMany(
        {
          threadId,
          receiverId: currentUser._id,
          readAt: null
        },
        { readAt: new Date() }
      );

      // Reset unread count for this user
      thread.unreadCount?.set(currentUser._id.toString(), 0);
      await thread.save();

      // Emit read receipt via Socket.io
      const io = (global as any).io;
      if (io) {
        // Get the other participant
        const otherParticipant = thread.participants.find(
          (p: any) => p.toString() !== currentUser._id.toString()
        );

        if (otherParticipant) {
          io.to(`user_${otherParticipant.toString()}`).emit('messages_read', {
            threadId,
            readBy: currentUser._id,
            readAt: new Date(),
            count: result.modifiedCount,
          });
        }
      }

      return NextResponse.json({
        message: "Messages marked as read",
        data: {
          threadId,
          markedCount: result.modifiedCount,
          readAt: new Date(),
        }
      });
    }

    return NextResponse.json({
      message: "Message marked as read",
      data: {
        messageId,
        threadId,
        readAt: new Date(),
      }
    });

  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}