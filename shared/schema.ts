import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
  index,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - stores user account information
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  plan: varchar("plan", { length: 20 }).default('free').notNull(), // 'free' | 'premium'
  balance: decimal("balance", { precision: 10, scale: 2 }).default('0').notNull(),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default('0').notNull(),
  monthlyGoal: decimal("monthly_goal", { precision: 10, scale: 2 }).default('500').notNull(),
  canWithdraw: boolean("can_withdraw").default(false).notNull(),
  selectedPlan: varchar("selected_plan", { length: 20 }), // Plan selected after 3 books
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_users_email").on(table.email),
]);

// Books catalog - stores all available books
export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  synopsis: text("synopsis"),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  difficulty: varchar("difficulty", { length: 20 }).notNull(), // 'Fácil' | 'Médio' | 'Difícil'
  readingTime: integer("reading_time").notNull(), // in minutes
  reward: decimal("reward", { precision: 10, scale: 2 }).notNull(),
  pages: integer("pages"),
  chapters: integer("chapters"),
  publishYear: integer("publish_year"),
  questions: jsonb("questions").notNull(), // Quiz questions array
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_books_slug").on(table.slug),
  index("idx_books_active").on(table.isActive),
]);

// Books completed by users
export const booksCompleted = pgTable("books_completed", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: varchar("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  bookSlug: varchar("book_slug", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  reward: decimal("reward", { precision: 10, scale: 2 }).notNull(),
  rating: integer("rating").notNull(), // 1-5
  opinion: text("opinion"),
  readingTime: integer("reading_time").notNull(), // actual time in seconds
  quizAnswers: jsonb("quiz_answers"), // User's quiz answers
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_books_completed_user").on(table.userId),
  index("idx_books_completed_book").on(table.bookId),
  index("idx_books_completed_date").on(table.completedAt),
  unique("unique_user_book").on(table.userId, table.bookSlug),
]);

// Transactions history
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // 'earning' | 'bonus' | 'withdrawal' | 'activity'
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  referenceId: varchar("reference_id"), // Reference to book_id or activity_id
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_transactions_user").on(table.userId),
  index("idx_transactions_type").on(table.type),
  index("idx_transactions_date").on(table.createdAt),
]);

// User statistics
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  totalBooksRead: integer("total_books_read").default(0).notNull(),
  todayBooksRead: integer("today_books_read").default(0).notNull(),
  weekBooksRead: integer("week_books_read").default(0).notNull(),
  monthBooksRead: integer("month_books_read").default(0).notNull(),
  todayEarnings: decimal("today_earnings", { precision: 10, scale: 2 }).default('0').notNull(),
  weekEarnings: decimal("week_earnings", { precision: 10, scale: 2 }).default('0').notNull(),
  monthEarnings: decimal("month_earnings", { precision: 10, scale: 2 }).default('0').notNull(),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default('0').notNull(),
  streak: integer("streak").default(0).notNull(),
  lastReadDate: timestamp("last_read_date"),
  easyBooksCount: integer("easy_books_count").default(0).notNull(),
  mediumBooksCount: integer("medium_books_count").default(0).notNull(),
  hardBooksCount: integer("hard_books_count").default(0).notNull(),
  weeklyProgress: decimal("weekly_progress", { precision: 5, scale: 2 }).default('0').notNull(),
  monthlyProgress: decimal("monthly_progress", { precision: 5, scale: 2 }).default('0').notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_stats_user").on(table.userId),
]);

// UTM tracking for marketing attribution
export const userUtmTracking = pgTable("user_utm_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  utmSource: varchar("utm_source", { length: 255 }), // e.g., 'facebook'
  utmMedium: varchar("utm_medium", { length: 255 }), // e.g., 'cpc', 'social'
  utmCampaign: varchar("utm_campaign", { length: 255 }), // campaign name
  utmTerm: varchar("utm_term", { length: 255 }), // paid keywords
  utmContent: varchar("utm_content", { length: 255 }), // ad variation
  fbclid: varchar("fbclid", { length: 500 }), // Facebook click ID
  referrer: text("referrer"), // Document referrer
  landingPage: text("landing_page"), // First page visited
  ipAddress: varchar("ip_address", { length: 45 }), // User IP
  userAgent: text("user_agent"), // Browser user agent
  firstVisit: timestamp("first_visit").defaultNow().notNull(),
  conversionDate: timestamp("conversion_date"), // When user converted to paid
  conversionPlan: varchar("conversion_plan", { length: 20 }), // Plan purchased
}, (table) => [
  index("idx_utm_user").on(table.userId),
  index("idx_utm_source").on(table.utmSource),
  index("idx_utm_conversion").on(table.conversionDate),
  unique("unique_user_utm").on(table.userId),
]);

// Reading progress tracking
export const readingProgress = pgTable("reading_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: varchar("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  bookSlug: varchar("book_slug", { length: 255 }).notNull(),
  progress: integer("progress").default(0).notNull(), // Percentage 0-100
  currentChapter: integer("current_chapter").default(0),
  timeSpent: integer("time_spent").default(0).notNull(), // Seconds
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
}, (table) => [
  index("idx_progress_user").on(table.userId),
  index("idx_progress_book").on(table.bookId),
  unique("unique_user_book_progress").on(table.userId, table.bookSlug),
]);

// Friendships table - stores friend relationships
export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId: varchar("friend_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending' | 'accepted' | 'blocked'
  requestedBy: varchar("requested_by").notNull().references(() => users.id), // Who sent the request
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
}, (table) => [
  index("idx_friendships_user").on(table.userId),
  index("idx_friendships_friend").on(table.friendId),
  index("idx_friendships_status").on(table.status),
  unique("unique_friendship").on(table.userId, table.friendId),
]);

// User online status
export const userOnlineStatus = pgTable("user_online_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  isOnline: boolean("is_online").default(false).notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
}, (table) => [
  index("idx_online_status_user").on(table.userId),
]);

// Sessions for authentication (if needed)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);


// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  booksCompleted: many(booksCompleted),
  transactions: many(transactions),
  stats: one(userStats, {
    fields: [users.id],
    references: [userStats.userId],
  }),
  utmTracking: one(userUtmTracking, {
    fields: [users.id],
    references: [userUtmTracking.userId],
  }),
  readingProgress: many(readingProgress),
  friendships: many(friendships),
  onlineStatus: one(userOnlineStatus, {
    fields: [users.id],
    references: [userOnlineStatus.userId],
  }),
}));

export const booksRelations = relations(books, ({ many }) => ({
  completions: many(booksCompleted),
}));

export const booksCompletedRelations = relations(booksCompleted, ({ one }) => ({
  user: one(users, {
    fields: [booksCompleted.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [booksCompleted.bookId],
    references: [books.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export const userUtmTrackingRelations = relations(userUtmTracking, ({ one }) => ({
  user: one(users, {
    fields: [userUtmTracking.userId],
    references: [users.id],
  }),
}));

export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  user: one(users, {
    fields: [readingProgress.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [readingProgress.bookId],
    references: [books.id],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
  }),
  requester: one(users, {
    fields: [friendships.requestedBy],
    references: [users.id],
  }),
}));

export const userOnlineStatusRelations = relations(userOnlineStatus, ({ one }) => ({
  user: one(users, {
    fields: [userOnlineStatus.userId],
    references: [users.id],
  }),
}));

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
});
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

export const insertBookCompletedSchema = createInsertSchema(booksCompleted).omit({
  id: true,
  completedAt: true,
});
export type InsertBookCompleted = z.infer<typeof insertBookCompletedSchema>;
export type BookCompleted = typeof booksCompleted.$inferSelect;

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  updatedAt: true,
});
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

export const insertUserUtmTrackingSchema = createInsertSchema(userUtmTracking).omit({
  id: true,
  firstVisit: true,
});
export type InsertUserUtmTracking = z.infer<typeof insertUserUtmTrackingSchema>;
export type UserUtmTracking = typeof userUtmTracking.$inferSelect;

export const insertReadingProgressSchema = createInsertSchema(readingProgress).omit({
  id: true,
  startedAt: true,
  lastReadAt: true,
});
export type InsertReadingProgress = z.infer<typeof insertReadingProgressSchema>;
export type ReadingProgress = typeof readingProgress.$inferSelect;

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendships.$inferSelect;

export const insertUserOnlineStatusSchema = createInsertSchema(userOnlineStatus).omit({
  id: true,
  lastSeen: true,
});
export type InsertUserOnlineStatus = z.infer<typeof insertUserOnlineStatusSchema>;
export type UserOnlineStatus = typeof userOnlineStatus.$inferSelect;

