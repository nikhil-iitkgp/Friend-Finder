import { Server as NetServer } from "http";
import { NextApiResponse } from "next";
import { Server as ServerIO } from "socket.io";
import { getSession } from "next-auth/react";
import { getToken } from "next-auth/jwt";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

export interface SocketUserData {
  userId: string;
  username: string;
  email: string;
}

// Socket.io event types
export interface ServerToClientEvents {
  // Friend system events
  friend_request_received: (data: {
    from: {
      id: string;
      username: string;
      profilePicture?: string;
    };
    createdAt: Date;
  }) => void;
  
  friend_request_accepted: (data: {
    by: {
      id: string;
      username: string;
      profilePicture?: string;
    };
    timestamp: Date;
  }) => void;
  
  friend_removed: (data: {
    by: {
      id: string;
      username: string;
    };
    timestamp: Date;
  }) => void;
  
  // Chat/messaging events
  message_received: (data: {
    message: {
      id: string;
      senderId: string;
      senderInfo: {
        username: string;
        profilePicture?: string;
      };
      threadId: string;
      text: string;
      messageType: string;
      metadata?: any;
      createdAt: Date;
    };
    threadInfo: {
      threadId: string;
      unreadCount: number;
    };
  }) => void;
  
  message_sent: (data: {
    tempId?: string;
    message: {
      id: string;
      senderId: string;
      threadId: string;
      text: string;
      messageType: string;
      metadata?: any;
      createdAt: Date;
    };
  }) => void;
  
  messages_read: (data: {
    threadId: string;
    readBy: string;
    readAt: Date;
    count: number;
  }) => void;
  
  typing_start: (data: {
    userId: string;
    threadId: string;
    username: string;
  }) => void;
  
  typing_stop: (data: {
    userId: string;
    threadId: string;
  }) => void;
  
  // WebRTC signaling events
  call_offer: (data: {
    from: string;
    to: string;
    offer: RTCSessionDescriptionInit;
    isVideo: boolean;
  }) => void;
  
  call_answer: (data: {
    from: string;
    to: string;
    answer: RTCSessionDescriptionInit;
  }) => void;
  
  call_ice_candidate: (data: {
    from: string;
    to: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  
  call_ended: (data: {
    from: string;
    to: string;
    reason?: string;
  }) => void;
  
  call_rejected: (data: {
    from: string;
    to: string;
  }) => void;
  
  // Presence events
  user_online: (data: { userId: string; timestamp: Date }) => void;
  user_offline: (data: { userId: string; timestamp: Date }) => void;
  
  // Notification events
  notification: (data: {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    timestamp: Date;
  }) => void;
}

export interface ClientToServerEvents {
  // Authentication
  authenticate: (token: string) => void;
  
  // Presence
  update_presence: () => void;
  
  // Friend events (acknowledgment)
  friend_request_seen: (requestId: string) => void;
  
  // Chat events
  join_thread: (threadId: string) => void;
  leave_thread: (threadId: string) => void;
  typing_start: (data: { threadId: string }) => void;
  typing_stop: (data: { threadId: string }) => void;
  
  // WebRTC signaling events
  call_initiate: (data: {
    to: string;
    isVideo: boolean;
  }) => void;
  
  call_offer: (data: {
    to: string;
    offer: RTCSessionDescriptionInit;
  }) => void;
  
  call_answer: (data: {
    to: string;
    answer: RTCSessionDescriptionInit;
  }) => void;
  
  call_ice_candidate: (data: {
    to: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  
  call_reject: (data: { to: string }) => void;
  call_end: (data: { to: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData extends SocketUserData {}

export const config = {
  api: {
    bodyParser: false,
  },
};

// Socket.io connection handler
export const initSocket = (server: NetServer): ServerIO => {
  if (!server.io) {
    console.log("Initializing Socket.io server...");
    
    const io = new ServerIO(server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify JWT token
        const decoded = await getToken({ 
          req: { headers: { authorization: `Bearer ${token}` } } as any,
          secret: process.env.NEXTAUTH_SECRET 
        });
        
        if (!decoded?.email) {
          return next(new Error("Invalid authentication token"));
        }

        // Attach user data to socket
        socket.data = {
          userId: decoded.sub as string,
          username: decoded.name as string,
          email: decoded.email,
        };

        next();
      } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });

    // Connection handler
    io.on("connection", (socket) => {
      const user = socket.data;
      console.log(`User connected: ${user.username} (${user.userId})`);

      // Join user-specific room for private notifications
      socket.join(`user_${user.userId}`);

      // Announce user is online
      socket.broadcast.emit("user_online", {
        userId: user.userId,
        timestamp: new Date(),
      });

      // Handle presence updates
      socket.on("update_presence", () => {
        // Update last seen in database if needed
        console.log(`Presence update for ${user.username}`);
      });

      // Handle friend request acknowledgments
      socket.on("friend_request_seen", (requestId: string) => {
        console.log(`Friend request ${requestId} seen by ${user.username}`);
        // Mark as read in database if needed
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(`User disconnected: ${user.username} (${reason})`);
        
        // Announce user is offline
        socket.broadcast.emit("user_offline", {
          userId: user.userId,
          timestamp: new Date(),
        });
      });
    });

    server.io = io;
    return io;
  }

  return server.io;
};