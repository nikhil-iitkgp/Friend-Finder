import { 
  LoginSchema, 
  RegisterSchema, 
  ProfileUpdateSchema,
  NearbyUsersQuerySchema,
  SendFriendRequestSchema 
} from '../validations';

describe('Validation Schemas', () => {
  describe('LoginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const result = LoginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };
      
      const result = LoginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
      };
      
      const result = LoginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('RegisterSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };
      
      const result = RegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword',
      };
      
      const result = RegisterSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid username', () => {
      const invalidData = {
        username: 'ab', // too short
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };
      
      const result = RegisterSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('NearbyUsersQuerySchema', () => {
    it('should validate with default values', () => {
      const result = NearbyUsersQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radius).toBe(5000);
      }
    });

    it('should validate custom radius', () => {
      const validData = { radius: '1000' };
      const result = NearbyUsersQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radius).toBe(1000);
      }
    });
  });

  describe('SendFriendRequestSchema', () => {
    it('should validate valid ObjectId', () => {
      const validData = {
        toUserId: '507f1f77bcf86cd799439011', // Valid ObjectId
      };
      
      const result = SendFriendRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid ObjectId', () => {
      const invalidData = {
        toUserId: 'invalid-id',
      };
      
      const result = SendFriendRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});