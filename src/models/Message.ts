import { Schema, model, models, Document } from "mongoose";

// Message interface
export interface IMessage extends Document {
  _id: string;
  senderId: Schema.Types.ObjectId;
  receiverId: Schema.Types.ObjectId;
  threadId: string; // Computed from sorted user IDs for consistency
  text: string;
  messageType: "text" | "image" | "file";
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    cloudinaryUrl?: string;
    width?: number;
    height?: number;
  };
  readAt?: Date;
  editedAt?: Date;
  deletedAt?: Date;
  replyTo?: Schema.Types.ObjectId; // Reference to another message for replies
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Thread/Conversation interface
export interface IThread extends Document {
  _id: string;
  threadId: string; // Unique identifier for the conversation
  participants: Schema.Types.ObjectId[]; // Array of user IDs
  lastMessage?: Schema.Types.ObjectId;
  lastMessageAt: Date;
  unreadCount: Map<string, number>; // userId -> unread count
  
  // Thread metadata
  isGroup: boolean;
  groupName?: string;
  groupImage?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  threadId: {
    type: String,
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  messageType: {
    type: String,
    enum: ["text", "image", "file"],
    default: "text",
  },
  metadata: {
    fileName: {
      type: String,
      maxlength: 255,
    },
    fileSize: {
      type: Number,
      min: 0,
    },
    mimeType: {
      type: String,
      maxlength: 100,
    },
    cloudinaryUrl: {
      type: String,
      maxlength: 500,
    },
    width: {
      type: Number,
      min: 0,
    },
    height: {
      type: Number,
      min: 0,
    },
  },
  readAt: {
    type: Date,
    default: null,
  },
  editedAt: {
    type: Date,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
}, {
  timestamps: true,
});

// Thread/Conversation Schema
const ThreadSchema = new Schema<IThread>({
  threadId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: "Message",
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map(),
  },
  isGroup: {
    type: Boolean,
    default: false,
  },
  groupName: {
    type: String,
    maxlength: 100,
  },
  groupImage: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

// Indexes for performance

// Message indexes
MessageSchema.index({ threadId: 1, createdAt: -1 }); // For message retrieval
MessageSchema.index({ senderId: 1, createdAt: -1 }); // For user's sent messages
MessageSchema.index({ receiverId: 1, readAt: 1 }); // For unread messages
MessageSchema.index({ threadId: 1, deletedAt: 1 }); // For active messages

// Thread indexes
ThreadSchema.index({ participants: 1 }); // For finding conversations
ThreadSchema.index({ lastMessageAt: -1 }); // For sorting conversations
ThreadSchema.index({ "participants": 1, "lastMessageAt": -1 }); // Compound index

// Pre-save middleware to generate threadId
MessageSchema.pre('save', function(next) {
  if (!this.threadId) {
    // Generate consistent threadId from sorted participant IDs
    const participants = [this.senderId.toString(), this.receiverId.toString()].sort();
    this.threadId = participants.join('_');
  }
  next();
});

// Static methods for Message
MessageSchema.statics.createThreadId = function(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
};

MessageSchema.statics.findByThread = function(threadId: string, options: {
  limit?: number;
  offset?: number;
  before?: string;
} = {}) {
  const { limit = 20, offset = 0, before } = options;
  
  let query = this.find({ 
    threadId,
    deletedAt: null 
  }).populate('senderId', 'username profilePicture')
    .populate('receiverId', 'username profilePicture');
  
  if (before) {
    query = query.where('createdAt').lt(new Date(before));
  }
  
  return query
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
};

// Static methods for Thread
ThreadSchema.statics.findOrCreateThread = async function(
  userId1: string, 
  userId2: string
): Promise<IThread> {
  const threadId = [userId1, userId2].sort().join('_');
  
  let thread = await this.findOne({ threadId });
  
  if (!thread) {
    thread = await this.create({
      threadId,
      participants: [userId1, userId2],
      lastMessageAt: new Date(),
      unreadCount: new Map([
        [userId1, 0],
        [userId2, 0]
      ]),
    });
  }
  
  return thread;
};

ThreadSchema.statics.getConversationsForUser = function(userId: string, options: {
  limit?: number;
  offset?: number;
} = {}) {
  const { limit = 20, offset = 0 } = options;
  
  return this.find({ 
    participants: userId 
  })
  .populate('participants', 'username profilePicture lastSeen')
  .populate('lastMessage')
  .sort({ lastMessageAt: -1 })
  .skip(offset)
  .limit(limit);
};

// Export models
const Message = models.Message || model<IMessage>("Message", MessageSchema);
const Thread = models.Thread || model<IThread>("Thread", ThreadSchema);

export { Message, Thread };
export default Message;