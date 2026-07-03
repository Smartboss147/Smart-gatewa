import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users, notifications } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: any; // The database user object
}

// Helper to generate a unique random referral code (e.g., VTU-12345)
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'VTU-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const email = decodedToken.email || '';
    const uid = decodedToken.uid;
    const name = decodedToken.name || email.split('@')[0];

    // Synchronize or find the user in PostgreSQL
    let dbUserList = await db.select().from(users).where(eq(users.uid, uid));
    let dbUser = dbUserList[0];

    if (!dbUser) {
      // Create user
      const referralCode = generateReferralCode();
      const insertResult = await db.insert(users)
        .values({
          uid,
          email,
          fullName: name,
          referralCode,
          walletBalance: 100000, // Seed ₦1,000 (100,000 kobo) for testing!
          role: email.toLowerCase().includes('admin') ? 'admin' : 'user', // make any email containing 'admin' an admin
        })
        .returning();
      dbUser = insertResult[0];

      // Add a welcome notification
      await db.insert(notifications).values({
        userId: dbUser.id,
        title: 'Welcome to VTU-Pay!',
        message: 'Your account has been created successfully. We seeded N1,000 in your wallet for testing purposes!'
      });
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or syncing user:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
