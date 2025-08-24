import { Schema, model, models, Document } from "mongoose";

// Friend request interface
export interface IFriendRequest {
  from: Schema.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

// Expanded user interface with discovery and social features
export interface IUser extends Document {
  _id: string;
  email: string;
  username: string;
  passwordHash?: string;
  googleId?: string;
  
  // Profile fields
  bio?: string;
  profilePicture?: string;
  
  // Social fields
  friends: Schema.Types.ObjectId[];
  friendRequests: IFriendRequest[];
  
  // Discovery & Privacy
  isDiscoverable: boolean;
  discoveryRange: number; // meters
  lastSeen: Date;
  
  // Location (GPS) - GeoJSON Point
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  
  // Wi-Fi Presence
  currentBSSID?: string;
  lastSeenWiFi?: Date;
  
  // Bluetooth
  bluetoothId?: string;
  bluetoothIdUpdatedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>({
  from: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  passwordHash: {
    type: String,
    required: function(this: IUser) {
      return !this.googleId; // Required if not using Google OAuth
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  bio: {
    type: String,
    maxlength: 500,
    default: "",
  },
  profilePicture: {
    type: String,
    default: "",
  },
  
  // Social fields
  friends: [{
    type: Schema.Types.ObjectId,
    ref: "User",
  }],
  friendRequests: [FriendRequestSchema],
  
  // Discovery & Privacy
  isDiscoverable: {
    type: Boolean,
    default: true,
  },
  discoveryRange: {
    type: Number,
    default: 5000, // 5km default
    min: 100,      // 100m minimum
    max: 50000,    // 50km maximum
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  
  // Location (GPS) - GeoJSON Point for geospatial queries
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function(coords: number[]) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: "Invalid coordinates format [longitude, latitude]"
      }
    },
    index: "2dsphere", // Enable geospatial queries
  },
  
  // Wi-Fi Presence
  currentBSSID: {
    type: String,
    uppercase: true,
    match: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i, // MAC address format
  },
  lastSeenWiFi: {
    type: Date,
  },
  
  // Bluetooth
  bluetoothId: {
    type: String,
    uppercase: true,
    match: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i, // MAC address format
  },
  bluetoothIdUpdatedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for performance

// Basic indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { sparse: true });

// Geospatial index for location-based queries
UserSchema.index({ location: "2dsphere" });

// Compound indexes for discovery
UserSchema.index({ 
  currentBSSID: 1, 
  isDiscoverable: 1, 
  lastSeenWiFi: 1 
}, {
  partialFilterExpression: { 
    currentBSSID: { $exists: true },
    isDiscoverable: true 
  }
});

UserSchema.index({ 
  bluetoothId: 1, 
  isDiscoverable: 1, 
  bluetoothIdUpdatedAt: 1 
}, {
  partialFilterExpression: { 
    bluetoothId: { $exists: true },
    isDiscoverable: true 
  }
});

// Index for friend queries
UserSchema.index({ friends: 1 });
UserSchema.index({ "friendRequests.from": 1, "friendRequests.status": 1 });

// Index for last seen queries
UserSchema.index({ lastSeen: -1 });
UserSchema.index({ isDiscoverable: 1, lastSeen: -1 });

// Virtual for ID
UserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash; // Never send password hash to client
    return ret;
  }
});

// Pre-save middleware
UserSchema.pre('save', function(next) {
  if (this.isModified('username')) {
    this.username = this.username.toLowerCase().trim();
  }
  
  // Update lastSeen on any save
  this.lastSeen = new Date();
  
  // Update Bluetooth timestamp when Bluetooth ID changes
  if (this.isModified('bluetoothId') && this.bluetoothId) {
    this.bluetoothIdUpdatedAt = new Date();
  }
  
  // Update Wi-Fi timestamp when BSSID changes
  if (this.isModified('currentBSSID') && this.currentBSSID) {
    this.lastSeenWiFi = new Date();
  }
  
  next();
});

// Instance methods
UserSchema.methods.addFriend = function(friendId: string) {
  if (!this.friends.includes(friendId)) {
    this.friends.push(friendId);
  }
};

UserSchema.methods.removeFriend = function(friendId: string) {
  this.friends = this.friends.filter((id: any) => !id.equals(friendId));
};

UserSchema.methods.isFriendWith = function(userId: string): boolean {
  return this.friends.some((id: any) => id.equals(userId));
};

UserSchema.methods.hasPendingRequestFrom = function(userId: string): boolean {
  return this.friendRequests.some((req: IFriendRequest) => 
    req.from.equals(userId) && req.status === "pending"
  );
};

UserSchema.methods.updateLocation = function(longitude: number, latitude: number) {
  this.location = {
    type: "Point",
    coordinates: [longitude, latitude]
  };
  this.lastSeen = new Date();
};

UserSchema.methods.updateWiFiPresence = function(bssid?: string) {
  this.currentBSSID = bssid;
  this.lastSeenWiFi = new Date();
  this.lastSeen = new Date();
};

UserSchema.methods.updateBluetoothId = function(bluetoothId?: string) {
  this.bluetoothId = bluetoothId;
  this.bluetoothIdUpdatedAt = new Date();
  this.lastSeen = new Date();
};

const User = models.User || model<IUser>('User', UserSchema);

export default User;