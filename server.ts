import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, transactions, notifications } from './src/db/schema.ts';
import { eq, desc, and, sum } from 'drizzle-orm';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==========================================================
  // 1. PUBLIC AND UTILITY API ROUTES
  // ==========================================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // ==========================================================
  // 2. PROTECTED USER & PROFILE APIS
  // ==========================================================

  // Get current user profile
  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: req.dbUser });
  });

  // Update profile information
  app.post('/api/profile/update', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { fullName, phone, referredBy } = req.body;
      const userId = req.dbUser.id;

      // Prepare updates
      const updateFields: any = {};
      if (fullName !== undefined) updateFields.fullName = fullName;
      if (phone !== undefined) updateFields.phone = phone;
      
      // Handle referral code binding (only if not set yet)
      if (referredBy && !req.dbUser.referredBy) {
        // Validate if referral code exists
        const referrerList = await db.select().from(users).where(eq(users.referralCode, referredBy));
        if (referrerList.length > 0 && referrerList[0].id !== userId) {
          updateFields.referredBy = referredBy;
        } else if (referrerList.length > 0 && referrerList[0].id === userId) {
          return res.status(400).json({ error: 'You cannot refer yourself.' });
        } else {
          return res.status(400).json({ error: 'Invalid referral code.' });
        }
      }

      const updatedUsers = await db.update(users)
        .set(updateFields)
        .where(eq(users.id, userId))
        .returning();

      res.json({ success: true, user: updatedUsers[0] });
    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  // Get current user notifications
  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, req.dbUser.id))
        .orderBy(desc(notifications.createdAt));
      res.json({ notifications: list });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
  });

  // Mark notification as read
  app.post('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
    try {
      const nid = parseInt(req.params.id);
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, nid), eq(notifications.userId, req.dbUser.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update notification.' });
    }
  });

  // ==========================================================
  // 3. WALLET OPERATIONS (PAYSTACK SIMULATION)
  // ==========================================================

  // Process wallet funding (Simulates Paystack payment reference webhook verification)
  app.post('/api/wallet/fund', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { reference, amountKobo } = req.body; // amount in kobo (NGN 100 = 10000 kobo)
      const userRecord = req.dbUser;

      if (!reference || !amountKobo || amountKobo <= 0) {
        return res.status(400).json({ error: 'Invalid reference or funding amount.' });
      }

      // Check if transaction with this reference already exists to prevent duplicate funding
      const existingTx = await db.select().from(transactions).where(eq(transactions.reference, reference));
      if (existingTx.length > 0) {
        return res.status(400).json({ error: 'Transaction reference already processed.' });
      }

      // 1. Credit the user's wallet
      const originalBalance = userRecord.walletBalance;
      const newBalance = originalBalance + amountKobo;

      await db.update(users)
        .set({ walletBalance: newBalance })
        .where(eq(users.id, userRecord.id));

      // 2. Log success transaction
      await db.insert(transactions).values({
        userId: userRecord.id,
        type: 'wallet_funding',
        amount: amountKobo,
        status: 'success',
        reference,
        provider: 'Paystack',
        recipient: userRecord.email,
        details: `Funded ₦${(amountKobo / 100).toLocaleString()} via Paystack Card/Transfer.`,
      });

      // 3. Trigger notification
      await db.insert(notifications).values({
        userId: userRecord.id,
        title: 'Wallet Funded Successfully!',
        message: `Your wallet has been credited with ₦${(amountKobo / 100).toLocaleString()}. Reference: ${reference}`,
      });

      // 4. Referral System: If this user was referred, credit 10% of their FIRST deposit to the referrer
      if (userRecord.referredBy) {
        // Check if this is the user's first successful funding
        const pastFundings = await db.select()
          .from(transactions)
          .where(and(eq(transactions.userId, userRecord.id), eq(transactions.type, 'wallet_funding')));

        // If length is 1, it means the current transaction is their first funding!
        if (pastFundings.length === 1) {
          const referrerCode = userRecord.referredBy;
          const referrers = await db.select().from(users).where(eq(users.referralCode, referrerCode));

          if (referrers.length > 0) {
            const referrer = referrers[0];
            const referralBonus = Math.floor(amountKobo * 0.10); // 10% referral bonus

            // Update referrer's referral earnings and wallet balance
            await db.update(users)
              .set({
                walletBalance: referrer.walletBalance + referralBonus,
                referralEarnings: referrer.referralEarnings + referralBonus,
              })
              .where(eq(users.id, referrer.id));

            // Log referral transaction for the referrer
            const refTxRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
            await db.insert(transactions).values({
              userId: referrer.id,
              type: 'referral_bonus',
              amount: referralBonus,
              status: 'success',
              reference: refTxRef,
              provider: 'System',
              recipient: userRecord.email,
              details: `Referral bonus of 10% on ${userRecord.fullName || userRecord.email}'s first deposit.`,
            });

            // Notify referrer
            await db.insert(notifications).values({
              userId: referrer.id,
              title: 'Referral Bonus Received! ₦',
              message: `You earned ₦${(referralBonus / 100).toFixed(2)} because ${userRecord.fullName || userRecord.email} made their first deposit!`,
            });
          }
        }
      }

      // Fetch fresh profile state to return
      const freshUser = await db.select().from(users).where(eq(users.id, userRecord.id));
      res.json({ success: true, walletBalance: freshUser[0].walletBalance, user: freshUser[0] });

    } catch (error: any) {
      console.error('Funding error:', error);
      res.status(500).json({ error: 'Failed to process funding transaction.' });
    }
  });

  // ==========================================================
  // 4. UTILITY PRODUCTS REST APIS (Airtime, Data, Electricity, Cable)
  // ==========================================================

  // 4.1. Airtime Purchase
  app.post('/api/vtu/airtime', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { provider, phone, amount } = req.body; // amount in Naira
      const userRecord = req.dbUser;

      if (!['MTN', 'Airtel', 'Glo', '9mobile'].includes(provider)) {
        return res.status(400).json({ error: 'Invalid network provider select.' });
      }

      if (!phone || phone.length !== 11 || !phone.startsWith('0')) {
        return res.status(400).json({ error: 'Please enter a valid 11-digit Nigerian phone number.' });
      }

      const amountKobo = Math.floor(amount * 100);
      if (amountKobo < 10000) { // Min N100
        return res.status(400).json({ error: 'Minimum purchase amount is ₦100.' });
      }

      if (userRecord.walletBalance < amountKobo) {
        return res.status(400).json({ error: 'Insufficient wallet balance. Please top up your wallet.' });
      }

      // Debit User Balance
      const updatedBalance = userRecord.walletBalance - amountKobo;
      await db.update(users).set({ walletBalance: updatedBalance }).where(eq(users.id, userRecord.id));

      const txReference = `AIRTIME-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create Success Transaction log
      await db.insert(transactions).values({
        userId: userRecord.id,
        type: 'airtime',
        amount: amountKobo,
        status: 'success',
        reference: txReference,
        provider,
        recipient: phone,
        details: `Purchased ${provider} ₦${amount} Airtime for ${phone}.`,
      });

      // Create Notification
      await db.insert(notifications).values({
        userId: userRecord.id,
        title: 'Airtime Purchase Successful',
        message: `Your purchase of ${provider} ₦${amount} Airtime to ${phone} was successful. Ref: ${txReference}`,
      });

      res.json({ success: true, reference: txReference, balance: updatedBalance });

    } catch (error) {
      console.error('Airtime error:', error);
      res.status(500).json({ error: 'Failed to execute airtime purchase.' });
    }
  });

  // 4.2. Internet Data Bundle
  app.post('/api/vtu/data', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { provider, phone, planId, planName, price } = req.body;
      const userRecord = req.dbUser;

      if (!provider || !phone || !planId || !price) {
        return res.status(400).json({ error: 'Missing required subscription fields.' });
      }

      if (phone.length !== 11 || !phone.startsWith('0')) {
        return res.status(400).json({ error: 'Please provide a valid 11-digit phone number.' });
      }

      const amountKobo = Math.floor(price * 100);
      if (userRecord.walletBalance < amountKobo) {
        return res.status(400).json({ error: 'Insufficient wallet balance to buy this data bundle.' });
      }

      // Debit User
      const updatedBalance = userRecord.walletBalance - amountKobo;
      await db.update(users).set({ walletBalance: updatedBalance }).where(eq(users.id, userRecord.id));

      const txReference = `DATA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create Success Transaction
      await db.insert(transactions).values({
        userId: userRecord.id,
        type: 'data',
        amount: amountKobo,
        status: 'success',
        reference: txReference,
        provider,
        recipient: phone,
        details: `Subscribed to ${provider} ${planName} for ${phone}.`,
      });

      // Add Notification
      await db.insert(notifications).values({
        userId: userRecord.id,
        title: 'Data Bundle Activated',
        message: `Your ${provider} ${planName} data subscription to ${phone} was activated successfully.`,
      });

      res.json({ success: true, reference: txReference, balance: updatedBalance });

    } catch (error) {
      console.error('Data bundle error:', error);
      res.status(500).json({ error: 'Failed to process data subscription.' });
    }
  });

  // 4.3. Electricity Bills
  app.post('/api/vtu/electricity', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { provider, meterNumber, meterType, amount } = req.body;
      const userRecord = req.dbUser;

      if (!provider || !meterNumber || !meterType || !amount) {
        return res.status(400).json({ error: 'Missing required electricity parameters.' });
      }

      if (meterNumber.length < 10 || meterNumber.length > 13) {
        return res.status(400).json({ error: 'Please enter a valid 10 to 13-digit Meter Number.' });
      }

      const amountKobo = Math.floor(amount * 100);
      if (amountKobo < 100000) { // Min N1000
        return res.status(400).json({ error: 'Minimum utility payment is ₦1,000.' });
      }

      if (userRecord.walletBalance < amountKobo) {
        return res.status(400).json({ error: 'Insufficient wallet balance.' });
      }

      // Debit
      const updatedBalance = userRecord.walletBalance - amountKobo;
      await db.update(users).set({ walletBalance: updatedBalance }).where(eq(users.id, userRecord.id));

      const txReference = `ELEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      // Generate a simulated Token for prepaid meters
      const token = meterType === 'prepaid' 
        ? `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
        : null;

      // Log success transaction
      await db.insert(transactions).values({
        userId: userRecord.id,
        type: 'electricity',
        amount: amountKobo,
        status: 'success',
        reference: txReference,
        provider,
        recipient: meterNumber,
        details: `Payment for ${provider} (${meterType.toUpperCase()}) meter ${meterNumber}. ${token ? `TOKEN: ${token}` : ''}`,
      });

      // Notify
      await db.insert(notifications).values({
        userId: userRecord.id,
        title: 'Electricity Bill Paid',
        message: `Your payment of ₦${amount.toLocaleString()} to ${provider} meter ${meterNumber} succeeded.${token ? ` Your token is: ${token}` : ''}`,
      });

      res.json({ success: true, reference: txReference, balance: updatedBalance, token });

    } catch (error) {
      console.error('Electricity bill error:', error);
      res.status(500).json({ error: 'Failed to process electricity bill.' });
    }
  });

  // 4.4. Cable TV subscription
  app.post('/api/vtu/cable', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { provider, smartcardNumber, planName, price } = req.body;
      const userRecord = req.dbUser;

      if (!provider || !smartcardNumber || !planName || !price) {
        return res.status(400).json({ error: 'Missing required cable parameters.' });
      }

      if (smartcardNumber.length < 10 || smartcardNumber.length > 11) {
        return res.status(400).json({ error: 'Please enter a valid smartcard/decoder card number.' });
      }

      const amountKobo = Math.floor(price * 100);
      if (userRecord.walletBalance < amountKobo) {
        return res.status(400).json({ error: 'Insufficient wallet balance.' });
      }

      // Debit
      const updatedBalance = userRecord.walletBalance - amountKobo;
      await db.update(users).set({ walletBalance: updatedBalance }).where(eq(users.id, userRecord.id));

      const txReference = `CABLE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Log transaction
      await db.insert(transactions).values({
        userId: userRecord.id,
        type: 'cable',
        amount: amountKobo,
        status: 'success',
        reference: txReference,
        provider,
        recipient: smartcardNumber,
        details: `Activated ${provider} ${planName} bouquet for Smartcard ${smartcardNumber}.`,
      });

      // Notify
      await db.insert(notifications).values({
        userId: userRecord.id,
        title: 'Cable Bouquet Activated',
        message: `Your ${provider} decoder subscription for smartcard ${smartcardNumber} has been renewed successfully.`,
      });

      res.json({ success: true, reference: txReference, balance: updatedBalance });

    } catch (error) {
      console.error('Cable TV subscription error:', error);
      res.status(500).json({ error: 'Failed to process cable TV subscription.' });
    }
  });

  // ==========================================================
  // 5. TRANSACTION HISTORY
  // ==========================================================

  app.get('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await db.select()
        .from(transactions)
        .where(eq(transactions.userId, req.dbUser.id))
        .orderBy(desc(transactions.createdAt));
      res.json({ transactions: list });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve transaction history.' });
    }
  });

  // ==========================================================
  // 6. ADMIN DASHBOARD & CONTROLS (Protected)
  // ==========================================================

  // Admin validation helper
  const requireAdmin = (req: AuthRequest, res: any, next: any) => {
    if (!req.dbUser || req.dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin authorization required' });
    }
    next();
  };

  // 6.1. Get Admin Dashboard Summary statistics
  app.get('/api/admin/stats', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      // 1. Total registered users
      const allUsers = await db.select().from(users);
      const totalUsersCount = allUsers.length;

      // 2. Sum of all transactions (funding & payments)
      const allTxList = await db.select().from(transactions);
      
      const fundingSum = allTxList
        .filter(t => t.type === 'wallet_funding' && t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0);

      const utilitiesSum = allTxList
        .filter(t => ['airtime', 'data', 'electricity', 'cable'].includes(t.type) && t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0);

      // 3. User stats group
      res.json({
        totalUsers: totalUsersCount,
        totalFundingKobo: fundingSum,
        totalUtilitiesKobo: utilitiesSum,
        totalTransactionsCount: allTxList.length
      });

    } catch (error) {
      res.status(500).json({ error: 'Failed to compute admin statistics.' });
    }
  });

  // 6.2. Retrieve all users list (Admin only)
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const list = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json({ users: list });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load administrative users logs.' });
    }
  });

  // 6.3. Retrieve all transaction histories (Admin only)
  app.get('/api/admin/transactions', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const list = await db.select()
        .from(transactions)
        .orderBy(desc(transactions.createdAt));
      res.json({ transactions: list });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load full transaction audits.' });
    }
  });

  // 6.4. Fund / Adjust a user's wallet manually (Admin action)
  app.post('/api/admin/users/:id/wallet', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const { amountKobo, actionType } = req.body; // 'credit' or 'debit'

      if (!amountKobo || amountKobo <= 0) {
        return res.status(400).json({ error: 'Please enter a valid positive amount.' });
      }

      const targetUsers = await db.select().from(users).where(eq(users.id, targetUserId));
      if (targetUsers.length === 0) {
        return res.status(404).json({ error: 'Target user record not found.' });
      }

      const targetUser = targetUsers[0];
      let newBalance = targetUser.walletBalance;

      if (actionType === 'credit') {
        newBalance += amountKobo;
      } else if (actionType === 'debit') {
        if (targetUser.walletBalance < amountKobo) {
          return res.status(400).json({ error: 'Insufficient funds on target user wallet to execute debit.' });
        }
        newBalance -= amountKobo;
      } else {
        return res.status(400).json({ error: 'Invalid actionType. Must be credit or debit.' });
      }

      // Update
      const updatedUsers = await db.update(users)
        .set({ walletBalance: newBalance })
        .where(eq(users.id, targetUserId))
        .returning();

      // Log transaction
      const adminTxRef = `ADJ-${Date.now()}`;
      await db.insert(transactions).values({
        userId: targetUserId,
        type: actionType === 'credit' ? 'admin_credit' : 'admin_debit',
        amount: amountKobo,
        status: 'success',
        reference: adminTxRef,
        provider: 'Admin Portal',
        recipient: targetUser.email,
        details: `Wallet balance manually adjusted (${actionType.toUpperCase()}) by Administrator.`,
      });

      // Send Notification to user
      await db.insert(notifications).values({
        userId: targetUserId,
        title: 'Wallet Balance Adjusted',
        message: `Your wallet balance has been ${actionType === 'credit' ? 'credited' : 'debited'} with ₦${(amountKobo / 100).toLocaleString()} by an administrator. New balance: ₦${(newBalance / 100).toLocaleString()}`,
      });

      res.json({ success: true, user: updatedUsers[0] });

    } catch (error) {
      console.error('Wallet adjustment error:', error);
      res.status(500).json({ error: 'Failed to adjust target user wallet.' });
    }
  });

  // ==========================================================
  // 7. VITE FRONTEND ASSETS INGRESS INTEGRATION
  // ==========================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VTU-Pay Server running on host http://0.0.0.0:${PORT}`);
  });
}

startServer();
