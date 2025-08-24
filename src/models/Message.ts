import { Schema, model, models, Document } from \"mongoose\";

export interface IMessage extends Document {
  _id: string;
  senderId: Schema.Types.ObjectId;
  receiverId: Schema.Types.ObjectId;
  text: string;
  messageType: \"text\" | \"image\" | \"file\";
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    cloudinaryUrl?: string;
  };
  createdAt: Date;
  readAt?: Date;
  editedAt?: Date;
}

const MessageSchema = new Schema<IMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: \"User\",
    required: true,
    index: true,
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: \"User\",
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true,
  },
  messageType: {
    type: String,
    enum: [\"text\", \"image\", \"file\"],
    default: \"text\",
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
  },
  readAt: {
    type: Date,
  },
  editedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient message queries
// Primary index for conversation queries (most common)
MessageSchema.index({ 
  senderId: 1, 
  receiverId: 1, 
  createdAt: -1 
});

// Reverse index for the other direction of conversation
MessageSchema.index({ 
  receiverId: 1, 
  senderId: 1, 
  createdAt: -1 
});

// Index for unread message queries
MessageSchema.index({ 
  receiverId: 1, 
  readAt: 1,
  createdAt: -1 
}, {
  partialFilterExpression: { readAt: { $exists: false } }
});

// Index for recent messages per user
MessageSchema.index({ 
  $or: [
    { senderId: 1 },
    { receiverId: 1 }
  ],
  createdAt: -1 
});

// Virtual for ID
MessageSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

MessageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Instance methods
MessageSchema.methods.markAsRead = function() {
  if (!this.readAt) {
    this.readAt = new Date();
  }
};

MessageSchema.methods.edit = function(newText: string) {
  this.text = newText;
  this.editedAt = new Date();
};

MessageSchema.methods.isFromUser = function(userId: string): boolean {
  return this.senderId.equals(userId);
};

MessageSchema.methods.isToUser = function(userId: string): boolean {
  return this.receiverId.equals(userId);
};

MessageSchema.methods.isInConversationWith = function(userId: string): boolean {
  return this.isFromUser(userId) || this.isToUser(userId);
};

// Static methods
MessageSchema.statics.getConversation = function(
  userId1: string, 
  userId2: string, 
  limit: number = 20, 
  offset: number = 0
) {
  return this.find({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(offset)
  .populate('senderId', 'username profilePicture')
  .populate('receiverId', 'username profilePicture');
};

MessageSchema.statics.getUnreadCount = function(
  userId: string, 
  fromUserId?: string
) {
  const query: any = {
    receiverId: userId,
    readAt: { $exists: false }
  };
  
  if (fromUserId) {
    query.senderId = fromUserId;
  }
  
  return this.countDocuments(query);
};

MessageSchema.statics.markConversationAsRead = function(
  userId: string, 
  otherUserId: string
) {
  return this.updateMany(
    {
      senderId: otherUserId,
      receiverId: userId,
      readAt: { $exists: false }
    },
    {
      readAt: new Date()
    }
  );
};

MessageSchema.statics.getRecentConversations = function(
  userId: string, 
  limit: number = 10
) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: [\"$senderId\", userId] },
            \"$receiverId\",
            \"$senderId\"
          ]
        },
        lastMessage: { $first: \"$$ROOT\" },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: [\"$receiverId\", userId] },
                  { $not: { $ifNull: [\"$readAt\", false] } }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { \"lastMessage.createdAt\": -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: \"users\",
        localField: \"_id\",
        foreignField: \"_id\",
        as: \"otherUser\",
        pipeline: [
          {
            $project: {
              username: 1,
              profilePicture: 1,
              lastSeen: 1
            }
          }
        ]
      }
    },
    {
      $unwind: \"$otherUser\"
    }
  ]);
};

const Message = models.Message || model<IMessage>('Message', MessageSchema);

export default Message;