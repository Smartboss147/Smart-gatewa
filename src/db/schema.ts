import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Users table storing account profiles
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Linked to Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name'),
  phone: text('phone'),
  role: text('role').notNull().default('user'), // 'user' or 'admin'
  walletBalance: integer('wallet_balance').notNull().default(0), // Balance in Kobo (e.g. 100 kobo = ₦1)
  referralCode: text('referral_code').notNull().unique(),
  referredBy: text('referred_by'), // Referral code of person who referred this user
  referralEarnings: integer('referral_earnings').notNull().default(0), // Referral earnings in Kobo
  createdAt: timestamp('created_at').defaultNow(),
});

// Transactions log
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'wallet_funding', 'airtime', 'data', 'electricity', 'cable'
  amount: integer('amount').notNull(), // Amount in Kobo
  status: text('status').notNull().default('pending'), // 'pending', 'success', 'failed'
  reference: text('reference').notNull().unique(), // Paystack or VTU provider reference
  provider: text('provider'), // 'MTN', 'Airtel', 'Glo', '9mobile', 'IKEDC', 'DSTV', etc.
  recipient: text('recipient'), // Phone number, meter number, smartcard number
  details: text('details').notNull(), // Detailed text narrative
  createdAt: timestamp('created_at').defaultNow(),
});

// Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations definitions
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  notifications: many(notifications),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
