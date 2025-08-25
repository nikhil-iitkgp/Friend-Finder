import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Message, Thread } from "@/models/Message";
import User from "@/models/User";
import { MessagesQuerySchema } from "@/lib/validations";

export async function GET(
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
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryParams = {
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
      before: searchParams.get('before') || undefined,
    };

    const { limit, offset, before } = MessagesQuerySchema.parse(queryParams);

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

    // Get messages for the thread
    const messages = await Message.findByThread(threadId, {
      limit,
      offset,
      before,
    });

    // Format messages for response
    const formattedMessages = messages.map((message: any) => ({
      id: message._id,
      senderId: message.senderId._id,
      senderInfo: {
        username: message.senderId.username,
        profilePicture: message.senderId.profilePicture,
      },
      receiverId: message.receiverId._id,
      threadId: message.threadId,
      text: message.text,
      messageType: message.messageType,
      metadata: message.metadata,
      readAt: message.readAt,
      editedAt: message.editedAt,
      replyTo: message.replyTo,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    }));

    return NextResponse.json({
      data: formattedMessages,
      pagination: {
        limit,
        offset,
        hasMore: formattedMessages.length === limit,
        before: formattedMessages.length > 0 ? formattedMessages[formattedMessages.length - 1].createdAt : null,
      },
    });

  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}