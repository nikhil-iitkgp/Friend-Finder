import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { RegisterSchema } from '@/lib/validations';
import { withDB, handleAPIError, parseRequestBody } from '@/lib/db-utils';

export const POST = withDB(async (request: NextRequest) => {
  try {
    const body = await parseRequestBody(request);
    
    // Validate request body
    const validatedData = RegisterSchema.parse(body);
    const { username, email, password } = validatedData;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
      if (existingUser.username === username.toLowerCase()) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
      isDiscoverable: true,
      discoveryRange: 5000, // 5km default
    });
    
    // Return user data (without password)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePicture: user.profilePicture,
      isDiscoverable: user.isDiscoverable,
      discoveryRange: user.discoveryRange,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    
    return NextResponse.json(
      { 
        success: true,
        data: userData,
        message: 'Account created successfully'
      },
      { status: 201 }
    );
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return handleAPIError(error, 'User registration');
  }
});"