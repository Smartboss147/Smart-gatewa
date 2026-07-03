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

// Helper to generate a unique random referral code (e.g., SG-12345)
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SG-';
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

    // Determine if user is system admin based on env variable
    const adminEmailEnv = process.env.ADMIN_EMAIL || 'admin.moderator@smartgateway.com';
    const adminEmails = adminEmailEnv.split(',').map(e => e.trim().toLowerCase());
    const isSystemAdmin = adminEmails.includes(email.toLowerCase());

    if (!dbUser) {
      // Create user
      const referralCode = generateReferralCode();
      const insertResult = await db.insert(users)
        .values({
          uid,
          email,
          fullName: name,
          referralCode,
          walletBalance: 0, // Wallet balance (₦0 by default) as requested!
          role: isSystemAdmin ? 'admin' : 'user', // Only admins from configured env list
        })
        .returning();
      dbUser = insertResult[0];

      // Add a welcome notification
      await db.insert(notifications).values({
        userId: dbUser.id,
        title: 'Welcome to Smart Gateway!',
        message: 'Your account has been created successfully. Fund your wallet or invite friends to earn commission!'
      });
    } else {
      // Automatic sync in case email matches ADMIN_EMAIL after registration
      if (isSystemAdmin && dbUser.role !== 'admin') {
        const updated = await db.update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, dbUser.id))
          .returning();
        dbUser = updated[0];
      }
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or syncing user:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
