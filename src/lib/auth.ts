import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "./mongoose";
import User, { IUser } from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          await connectDB();
          
          const user = await User.findOne({ 
            email: credentials.email.toLowerCase() 
          }).select("+passwordHash");
          
          if (!user || !user.passwordHash) {
            throw new Error("Invalid credentials");
          }
          
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );
          
          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.username,
            image: user.profilePicture || null,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          await connectDB();
          
          // Check if user exists
          const existingUser = await User.findOne({
            $or: [
              { email: user.email },
              { googleId: account.providerAccountId }
            ]
          });
          
          if (existingUser) {
            // Update Google ID if not set
            if (!existingUser.googleId) {
              existingUser.googleId = account.providerAccountId;
              await existingUser.save();
            }
          } else {
            // Create new user
            const username = user.email?.split('@')[0] || 'user';
            let finalUsername = username;
            
            // Ensure unique username
            let counter = 1;
            while (await User.findOne({ username: finalUsername })) {
              finalUsername = `${username}${counter}`;
              counter++;
            }
            
            await User.create({
              email: user.email,
              username: finalUsername,
              googleId: account.providerAccountId,
              profilePicture: user.image,
            });
          }
          
          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }
      
      return true;
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.username = user.name;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.username as string;
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/login",
    signUp: "/register",
  },
  
  session: {
    strategy: "jwt",
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to get current user
export async function getCurrentUser(userId: string): Promise<IUser | null> {
  try {
    await connectDB();
    const user = await User.findById(userId);
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}