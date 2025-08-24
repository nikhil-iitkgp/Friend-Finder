import { Schema, model, models, Document } from \"mongoose\";

// Basic user interface for authentication
export interface IUser extends Document {
  _id: string;
  email: string;
  username: string;
  passwordHash?: string;
  googleId?: string;
  
  // Profile fields
  bio?: string;
  profilePicture?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

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
    default: \"\",
  },
  profilePicture: {
    type: String,
    default: \"\",
  },
}, {
  timestamps: true,
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ googleId: 1 });

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

// Pre-save middleware for username normalization
UserSchema.pre('save', function(next) {
  if (this.isModified('username')) {
    this.username = this.username.toLowerCase().trim();
  }
  next();
});

const User = models.User || model<IUser>('User', UserSchema);

export default User;