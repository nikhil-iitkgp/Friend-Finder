import { z } from \"zod\";

// ============================================================================
// Authentication Schemas
// ============================================================================

export const LoginSchema = z.object({
  email: z
    .string()
    .email(\"Invalid email format\")
    .min(1, \"Email is required\")
    .toLowerCase(),
  password: z
    .string()
    .min(6, \"Password must be at least 6 characters\")
    .max(100, \"Password is too long\"),
});

export const RegisterSchema = z
  .object({
    username: z
      .string()
      .min(3, \"Username must be at least 3 characters\")
      .max(20, \"Username must not exceed 20 characters\")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        \"Username can only contain letters, numbers, and underscores\"
      ),
    email: z
      .string()
      .email(\"Invalid email format\")
      .min(1, \"Email is required\")
      .toLowerCase(),
    password: z
      .string()
      .min(6, \"Password must be at least 6 characters\")
      .max(100, \"Password is too long\")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/,
        \"Password must contain at least one uppercase letter, one lowercase letter, and one number\"
      ),
    confirmPassword: z
      .string()
      .min(1, \"Please confirm your password\"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: \"Passwords don't match\",
    path: [\"confirmPassword\"],
  });

// ============================================================================
// User Profile Schemas
// ============================================================================

export const ProfileUpdateSchema = z.object({
  username: z
    .string()
    .min(3, \"Username must be at least 3 characters\")
    .max(20, \"Username must not exceed 20 characters\")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      \"Username can only contain letters, numbers, and underscores\"
    )
    .optional(),
  firstName: z
    .string()
    .min(1, \"First name is required\")
    .max(50, \"First name must not exceed 50 characters\")
    .optional(),
  lastName: z
    .string()
    .min(1, \"Last name is required\")
    .max(50, \"Last name must not exceed 50 characters\")
    .optional(),
  bio: z
    .string()
    .max(500, \"Bio must not exceed 500 characters\")
    .optional(),
  occupation: z
    .string()
    .max(100, \"Occupation must not exceed 100 characters\")
    .optional(),
  interests: z
    .array(z.string().max(50, \"Interest must not exceed 50 characters\"))
    .max(20, \"You can have at most 20 interests\")
    .optional(),
  birthday: z
    .string()
    .datetime(\"Invalid birthday format\")
    .optional(),
  profilePicture: z
    .string()
    .url(\"Invalid profile picture URL\")
    .optional(),
  isDiscoverable: z.boolean().optional(),
  discoveryRange: z
    .number()
    .min(100, \"Discovery range must be at least 100 meters\")
    .max(50000, \"Discovery range must not exceed 50km\")
    .optional(),
  privacySettings: z.object({
    showAge: z.boolean().optional(),
    showLocation: z.boolean().optional(),
    showLastSeen: z.boolean().optional(),
    allowMessages: z.boolean().optional(),
    allowCalls: z.boolean().optional(),
  }).optional(),
});

export const UserProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  bio: z.string().optional(),
  profilePicture: z.string().optional(),
  isDiscoverable: z.boolean(),
  discoveryRange: z.number(),
  lastSeen: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Discovery Schemas
// ============================================================================

export const CoordinatesSchema = z.object({
  latitude: z
    .number()
    .min(-90, \"Latitude must be between -90 and 90\")
    .max(90, \"Latitude must be between -90 and 90\"),
  longitude: z
    .number()
    .min(-180, \"Longitude must be between -180 and 180\")
    .max(180, \"Longitude must be between -180 and 180\"),
  accuracy: z.number().positive().optional(),
});

export const LocationUpdateSchema = CoordinatesSchema;

export const PresenceUpdateSchema = z.object({
  bssid: z
    .string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      \"Invalid BSSID format (MAC address)\"
    )
    .optional(),
});

export const BluetoothUpdateSchema = z.object({
  bluetoothId: z
    .string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      \"Invalid Bluetooth ID format (MAC address)\"
    ),
});

export const BluetoothScanSchema = z.object({
  nearbyDevices: z
    .array(
      z.string().regex(
        /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
        \"Invalid device ID format\"
      )
    )
    .max(50, \"Too many devices in scan result\"),
});

export const NearbyUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),
  interests: z.array(z.string()).optional(),
  distance: z.number().optional(), // in meters for GPS
  lastSeen: z.date(),
  isOnline: z.boolean().optional(),
  isFriend: z.boolean(),
  hasPendingRequest: z.boolean(),
  // Privacy settings
  showAge: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showLastSeen: z.boolean().optional(),
  // Location data (only for map display)
  location: z.object({
    type: z.literal(\"Point\"),
    coordinates: z.array(z.number()).length(2), // [lng, lat]
  }).optional(),
});

export const NearbyUsersQuerySchema = z.object({
  radius: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .min(100, \"Radius must be at least 100 meters\")
        .max(50000, \"Radius must not exceed 50km\")
    )
    .optional()
    .default(\"5000\"),
});

// ============================================================================
// Friend System Schemas
// ============================================================================

export const FriendRequestSchema = z.object({
  to: z.string().min(1, \"User ID is required\"),
});

export const FriendResponseSchema = z.object({
  from: z.string().min(1, \"User ID is required\"),
  status: z.enum([\"accepted\", \"rejected\"], {
    errorMap: () => ({ message: \"Status must be 'accepted' or 'rejected'\" }),
  }),
});

export const FriendSchema = z.object({
  id: z.string(),
  username: z.string(),
  profilePicture: z.string().optional(),
  lastSeen: z.date(),
  isOnline: z.boolean().optional(),
});

// ============================================================================
// Messaging Schemas
// ============================================================================

export const MessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  text: z.string(),
  messageType: z.enum([\"text\", \"image\", \"file\"]).default(\"text\"),
  metadata: z
    .object({
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      cloudinaryUrl: z.string().url().optional(),
    })
    .optional(),
  createdAt: z.date(),
  readAt: z.date().optional(),
  editedAt: z.date().optional(),
});

export const SendMessageSchema = z.object({
  text: z
    .string()
    .min(1, \"Message cannot be empty\")
    .max(2000, \"Message is too long\"),
  messageType: z.enum([\"text\", \"image\", \"file\"]).default(\"text\"),
  metadata: z
    .object({
      fileName: z.string().optional(),
      fileSize: z.number().positive().optional(),
      mimeType: z.string().optional(),
      cloudinaryUrl: z.string().url().optional(),
    })
    .optional(),
});

export const MessagesQuerySchema = z.object({
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .min(1, \"Limit must be at least 1\")
        .max(100, \"Limit must not exceed 100\")
    )
    .optional()
    .default(\"20\"),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0, \"Offset must be non-negative\"))
    .optional()
    .default(\"0\"),
  before: z.string().optional(), // message ID for pagination
});

// ============================================================================
// Upload Schemas
// ============================================================================

export const UploadResultSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
  bytes: z.number().optional(),
});

// File upload validation
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z
    .array(z.string())
    .default([\"image/jpeg\", \"image/png\", \"image/webp\", \"image/gif\"]),
});

// ============================================================================
// API Response Schemas
// ============================================================================

export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
});

// ============================================================================
// Socket Event Schemas
// ============================================================================

export const TypingEventSchema = z.object({
  userId: z.string(),
  isTyping: z.boolean(),
});

export const CallEventSchema = z.object({
  from: z.string(),
  to: z.string(),
  isVideo: z.boolean().default(false),
});

export const ICECandidateSchema = z.object({
  candidate: z.string(),
  sdpMLineIndex: z.number(),
  sdpMid: z.string().optional(),
});

export const RTCSessionDescriptionSchema = z.object({
  type: z.enum([\"offer\", \"answer\", \"pranswer\", \"rollback\"]),
  sdp: z.string(),
});

// ============================================================================
// Form Validation Helpers
// ============================================================================

// Helper function to validate ObjectId format
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, \"Invalid ObjectId format\");

// Helper for optional ObjectId
export const optionalObjectIdSchema = objectIdSchema.optional();

// Helper for arrays of ObjectIds
export const objectIdArraySchema = z.array(objectIdSchema);

// Email validation with additional checks
export const emailSchema = z
  .string()
  .email(\"Invalid email format\")
  .min(1, \"Email is required\")
  .max(254, \"Email is too long\")
  .toLowerCase()
  .refine(
    (email) => {
      // Additional validation for email format
      const parts = email.split('@');
      return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
    },
    {
      message: \"Invalid email format\",
    }
  );

// URL validation with optional protocols
export const urlSchema = z
  .string()
  .url(\"Invalid URL format\")
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    {
      message: \"URL must use HTTP or HTTPS protocol\",
    }
  );

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;
export type PresenceUpdate = z.infer<typeof PresenceUpdateSchema>;
export type BluetoothUpdate = z.infer<typeof BluetoothUpdateSchema>;
export type BluetoothScan = z.infer<typeof BluetoothScanSchema>;
export type NearbyUser = z.infer<typeof NearbyUserSchema>;
export type NearbyUsersQuery = z.infer<typeof NearbyUsersQuerySchema>;
export type FriendRequest = z.infer<typeof FriendRequestSchema>;
export type FriendResponse = z.infer<typeof FriendResponseSchema>;
export type Friend = z.infer<typeof FriendSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type SendMessage = z.infer<typeof SendMessageSchema>;
export type MessagesQuery = z.infer<typeof MessagesQuerySchema>;
export type UploadResult = z.infer<typeof UploadResultSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type APIResponse<T = any> = z.infer<typeof APIResponseSchema> & { data?: T };
export type PaginatedResponse<T> = Omit<z.infer<typeof PaginatedResponseSchema>, 'data'> & { data: T[] };
export type TypingEvent = z.infer<typeof TypingEventSchema>;
export type CallEvent = z.infer<typeof CallEventSchema>;
export type ICECandidate = z.infer<typeof ICECandidateSchema>;
export type RTCSessionDescription = z.infer<typeof RTCSessionDescriptionSchema>;