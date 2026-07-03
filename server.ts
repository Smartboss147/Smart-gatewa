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
  // 1.5. CREDENTIALS & SYSTEM DIAGNOSTICS TEST
  // ==========================================================
  app.get('/api/system/diagnostics', async (req, res) => {
    try {
      // 1. Check database connection
      let dbStatus = false;
      try {
        await db.select().from(users).limit(1);
        dbStatus = true;
      } catch (err) {
        console.error('Diagnostic DB test error:', err);
      }

      // 2. Check Firebase Admin environment variables
      const hasFirebaseAdminKeys = !!(process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_PRIVATE_KEY);
      
      // 3. Check Paystack Secret Key environment variable
      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      const hasPaystackSecretKey = !!paystackKey;
      let paystackKeyMode = 'inactive';
      if (hasPaystackSecretKey) {
        paystackKeyMode = paystackKey.startsWith('sk_test_') ? 'test_mode' : 'live_mode';
      }

      // 4. Check admin emails configuration
      const hasAdminEmail = !!process.env.ADMIN_EMAIL;

      res.json({
        dbConnected: dbStatus,
        firebaseAdminConfigured: hasFirebaseAdminKeys,
        paystackConfigured: hasPaystackSecretKey,
        paystackMode: paystackKeyMode,
        adminEmailConfigured: hasAdminEmail,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to perform system diagnostics.' });
    }
  });

  // ==========================================================
  // 3. WALLET OPERATIONS (PAYSTACK SIMULATION & REAL GATEWAY)
  // ==========================================================

  // Initialize Paystack transaction (either real or fallback to sandbox simulator)
  app.post('/api/wallet/paystack/initialize', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { amount } = req.body; // Amount in Naira
      const userRecord = req.dbUser;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid funding amount.' });
      }

      const amountKobo = Math.floor(amount * 100);
      const secretKey = process.env.PAYSTACK_SECRET_KEY;

      if (!secretKey) {
        // Return fallback simulation info
        return res.json({ 
          simulation: true, 
          message: 'Paystack Secret Key is not configured on the server. Falling back to secure sandbox simulation.' 
        });
      }

      // We have a real key! Let's make a real API call to Paystack
      const reference = `PAYSTACK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const callbackUrl = `${appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl}/api/wallet/paystack-callback`;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userRecord.email,
          amount: amountKobo,
          reference: reference,
          callback_url: callbackUrl,
          metadata: {
            userId: userRecord.id,
            amountKobo: amountKobo
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        console.error('Paystack initialize failed:', data);
        return res.status(400).json({ 
          error: data.message || 'Failed to initialize real Paystack transaction.',
          details: data 
        });
      }

      res.json({
        success: true,
        simulation: false,
        authorizationUrl: data.data.authorization_url,
        reference: reference
      });

    } catch (err: any) {
      console.error('Paystack initialization exception:', err);
      res.status(500).json({ error: 'An unexpected error occurred during Paystack initialization.' });
    }
  });

  // Paystack Redirect callback handler
  app.get('/api/wallet/paystack-callback', async (req, res) => {
    try {
      const { reference } = req.query;
      if (!reference) {
        return res.send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f8fafc;">
              <h2 style="color: #ef4444;">Missing Transaction Reference</h2>
              <p>We could not find the payment reference. Please return to the Smart Gateway app.</p>
              <button onclick="window.close()" style="padding: 10px 20px; background-color: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Close Window</button>
            </body>
          </html>
        `);
      }

      // Verify transaction reference on Paystack
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        return res.status(400).send('Paystack secret key is missing.');
      }

      const verifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
      const response = await fetch(verifyUrl, {
        headers: {
          'Authorization': `Bearer ${secretKey}`
        }
      });

      const data = await response.json();
      if (!response.ok || !data.status || data.data.status !== 'success') {
        return res.send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f8fafc;">
              <h2 style="color: #ef4444;">Payment Verification Failed</h2>
              <p>The transaction could not be verified or was unsuccessful. Ref: ${reference}</p>
              <button onclick="window.close()" style="padding: 10px 20px; background-color: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Close Window</button>
            </body>
          </html>
        `);
      }

      // Success! Credit the user's wallet
      const amountKobo = data.data.amount;
      const metadata = data.data.metadata || {};
      const userId = metadata.userId;

      if (!userId) {
        return res.status(400).send('Could not map payment to user record.');
      }

      // Check if reference already processed
      const existingTx = await db.select().from(transactions).where(eq(transactions.reference, String(reference)));
      if (existingTx.length > 0) {
        return res.send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f8fafc;">
              <div style="max-width: 450px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                <div style="background-color: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 30px;">✓</div>
                <h2 style="color: #0f172a; margin-bottom: 8px;">Payment Credited!</h2>
                <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">This payment of ₦${(amountKobo / 100).toLocaleString()} has already been successfully credited to your wallet.</p>
                <button onclick="window.close()" style="padding: 12px 24px; background-color: #2563eb; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; width: 100%;">Return to Smart Gateway Dashboard</button>
              </div>
            </body>
          </html>
        `);
      }

      // Fetch user
      const userList = await db.select().from(users).where(eq(users.id, Number(userId)));
      if (userList.length === 0) {
        return res.status(400).send('User not found.');
      }
      const userRecord = userList[0];

      // Update balance
      const newBalance = userRecord.walletBalance + amountKobo;
      await db.update(users).set({ walletBalance: newBalance }).where(eq(users.id, userRecord.id));

      // Log transaction
      await db.insert(transactions).values({
        userId: userRecord.id,
        type: 'wallet_funding',
        amount: amountKobo,
        status: 'success',
        reference: String(reference),
        provider: 'Paystack',
        recipient: userRecord.email,
        details: `Funded ₦${(amountKobo / 100).toLocaleString()} via Paystack Secure Checkout.`,
      });

      // Notify
      await db.insert(notifications).values({
        userId: userRecord.id,
        title: 'Wallet Funded Successfully!',
        message: `Your wallet has been credited with ₦${(amountKobo / 100).toLocaleString()}. Reference: ${reference}`,
      });

      // Referral System (10% of first deposit to referrer)
      if (userRecord.referredBy) {
        const pastFundings = await db.select()
          .from(transactions)
          .where(and(eq(transactions.userId, userRecord.id), eq(transactions.type, 'wallet_funding')));

        if (pastFundings.length === 1) {
          const referrerCode = userRecord.referredBy;
          const referrers = await db.select().from(users).where(eq(users.referralCode, referrerCode));

          if (referrers.length > 0) {
            const referrer = referrers[0];
            const referralBonus = Math.floor(amountKobo * 0.10);

            await db.update(users)
              .set({
                walletBalance: referrer.walletBalance + referralBonus,
                referralEarnings: referrer.referralEarnings + referralBonus,
              })
              .where(eq(users.id, referrer.id));

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

            await db.insert(notifications).values({
              userId: referrer.id,
              title: 'Referral Bonus Received! ₦',
              message: `You earned ₦${(referralBonus / 100).toFixed(2)} because ${userRecord.fullName || userRecord.email} made their first deposit!`,
            });
          }
        }
      }

      // Success screen
      return res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f8fafc;">
            <div style="max-width: 450px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <div style="background-color: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 30px;">✓</div>
              <h2 style="color: #0f172a; margin-bottom: 8px;">Funding Successful!</h2>
              <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Your payment of ₦${(amountKobo / 100).toLocaleString()} has been successfully processed and added to your wallet balance.</p>
              <button onclick="window.close()" style="padding: 12px 24px; background-color: #2563eb; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; width: 100%;">Return to Smart Gateway Dashboard</button>
            </div>
          </body>
        </html>
      `);

    } catch (error: any) {
      console.error('Callback handler error:', error);
      res.status(500).send('Unexpected error while verifying payment.');
    }
  });

  // Verify specific reference (called manually or polled by frontend)
  app.get('/api/wallet/verify/:reference', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { reference } = req.params;
      const userRecord = req.dbUser;

      // Check if already in DB
      const existingTxList = await db.select().from(transactions).where(eq(transactions.reference, reference));
      if (existingTxList.length > 0) {
        const freshUser = await db.select().from(users).where(eq(users.id, userRecord.id));
        return res.json({ 
          success: true, 
          status: 'success', 
          message: 'Payment verified and wallet credited.',
          walletBalance: freshUser[0].walletBalance, 
          user: freshUser[0] 
        });
      }

      // Check with Paystack if key present
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        return res.status(404).json({ error: 'Transaction reference not found (simulation mode).' });
      }

      const verifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
      const response = await fetch(verifyUrl, {
        headers: {
          'Authorization': `Bearer ${secretKey}`
        }
      });

      const data = await response.json();
      if (!response.ok || !data.status || data.data.status !== 'success') {
        return res.json({ 
          success: false, 
          status: data.data?.status || 'failed', 
          message: data.message || 'Transaction could not be verified.' 
        });
      }

      const amountKobo = data.data.amount;
      const metadata = data.data.metadata || {};
      const userId = metadata.userId;

      if (Number(userId) !== userRecord.id) {
        return res.status(400).json({ error: 'This transaction does not belong to your account.' });
      }

      // Update balance
      const newBalance = userRecord.walletBalance + amountKobo;
      await db.update(users).set({ walletBalance: newBalance }).where(eq(users.id, userRecord.id));

      // Log transaction
      await db.insert(transactions).values({
        userId: userRecord.id,
        type: 'wallet_funding',
        amount: amountKobo,
        status: 'success',
        reference: reference,
        provider: 'Paystack',
        recipient: userRecord.email,
        details: `Funded ₦${(amountKobo / 100).toLocaleString()} via Paystack Secure Checkout.`,
      });

      // Notify
      await db.insert(notifications).values({
        userId: userRecord.id,
        title: 'Wallet Funded Successfully!',
        message: `Your wallet has been credited with ₦${(amountKobo / 100).toLocaleString()}. Reference: ${reference}`,
      });

      // Referral Bonus (10% of first deposit to referrer)
      if (userRecord.referredBy) {
        const pastFundings = await db.select()
          .from(transactions)
          .where(and(eq(transactions.userId, userRecord.id), eq(transactions.type, 'wallet_funding')));

        if (pastFundings.length === 1) {
          const referrerCode = userRecord.referredBy;
          const referrers = await db.select().from(users).where(eq(users.referralCode, referrerCode));

          if (referrers.length > 0) {
            const referrer = referrers[0];
            const referralBonus = Math.floor(amountKobo * 0.10);

            await db.update(users)
              .set({
                walletBalance: referrer.walletBalance + referralBonus,
                referralEarnings: referrer.referralEarnings + referralBonus,
              })
              .where(eq(users.id, referrer.id));

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

            await db.insert(notifications).values({
              userId: referrer.id,
              title: 'Referral Bonus Received! ₦',
              message: `You earned ₦${(referralBonus / 100).toFixed(2)} because ${userRecord.fullName || userRecord.email} made their first deposit!`,
            });
          }
        }
      }

      const freshUser = await db.select().from(users).where(eq(users.id, userRecord.id));
      res.json({ 
        success: true, 
        status: 'success',
        walletBalance: freshUser[0].walletBalance, 
        user: freshUser[0] 
      });

    } catch (err: any) {
      console.error('Verify endpoint error:', err);
      res.status(500).json({ error: 'Failed to verify transaction reference.' });
    }
  });

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
    console.log(`Smart Gateway Server running on host http://0.0.0.0:${PORT}`);
  });
}

startServer();
