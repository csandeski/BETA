import { 
  users, 
  books, 
  booksCompleted, 
  transactions, 
  userStats,
  userUtmTracking,
  readingProgress,
  friendships,
  userOnlineStatus,
  type User, 
  type InsertUser, 
  type Book,
  type InsertBook,
  type BookCompleted,
  type InsertBookCompleted,
  type Transaction,
  type InsertTransaction,
  type UserStats,
  type InsertUserStats,
  type UserUtmTracking,
  type InsertUserUtmTracking,
  type ReadingProgress,
  type InsertReadingProgress,
  type Friendship,
  type InsertFriendship,
  type UserOnlineStatus,
  type InsertUserOnlineStatus,
} from "@shared/schema";
import { db as getDb } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // Books operations
  getAllBooks(): Promise<Book[]>;
  getBookBySlug(slug: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  
  // Book completion operations
  getUserCompletedBooks(userId: string): Promise<BookCompleted[]>;
  isBookCompleted(userId: string, bookSlug: string): Promise<boolean>;
  completeBook(data: InsertBookCompleted): Promise<BookCompleted>;
  
  // Transaction operations
  getUserTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(data: InsertTransaction): Promise<Transaction>;
  
  // Stats operations
  getUserStats(userId: string): Promise<UserStats | undefined>;
  createOrUpdateUserStats(userId: string, data: Partial<UserStats>): Promise<UserStats>;
  updateUserBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<void>;
  
  // UTM tracking operations
  saveUserUtmData(userId: string, data: InsertUserUtmTracking): Promise<UserUtmTracking>;
  getUserUtmData(userId: string): Promise<UserUtmTracking | undefined>;
  updateUtmConversion(userId: string, plan: string): Promise<void>;
  
  // Reading progress operations
  saveReadingProgress(data: InsertReadingProgress): Promise<ReadingProgress>;
  getReadingProgress(userId: string, bookSlug: string): Promise<ReadingProgress | undefined>;
  updateReadingProgress(userId: string, bookSlug: string, progress: number, timeSpent: number): Promise<void>;
  
  // Friendship operations
  getFriendship(userId: string, friendId: string): Promise<Friendship | undefined>;
  createFriendshipRequest(userId: string, friendId: string): Promise<Friendship>;
  getPendingFriendRequests(userId: string): Promise<any[]>;
  getUserFriends(userId: string): Promise<any[]>;
  acceptFriendRequest(friendshipId: string, userId: string): Promise<void>;
  rejectFriendRequest(friendshipId: string, userId: string): Promise<void>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  
  // Online status operations
  updateOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
}

// Memory storage fallback when database is not available
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private books: Map<string, Book> = new Map();
  private booksCompleted: Map<string, BookCompleted[]> = new Map();
  private transactions: Map<string, Transaction[]> = new Map();
  private userStats: Map<string, UserStats> = new Map();
  private utmTracking: Map<string, UserUtmTracking> = new Map();
  private readingProgress: Map<string, ReadingProgress> = new Map();
  private friendships: Friendship[] = [];
  private onlineStatus: Map<string, boolean> = new Map();

  constructor() {
    console.warn("Using in-memory storage - data will not persist!");
    this.initDefaultBooks();
  }

  private initDefaultBooks() {
    // Initialize with some default books
    const defaultBooks: Book[] = [
      {
        id: "1",
        slug: "o-poder-do-habito",
        title: "O Poder do Hábito",
        author: "Charles Duhigg",
        coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
        summary: "Descubra como os hábitos funcionam e como mudá-los.",
        totalPages: 408,
        estimatedTime: "6-8 horas",
        difficulty: "intermediate",
        tags: ["Psicologia", "Desenvolvimento Pessoal"],
        rating: 4.5,
        totalRatings: 1250,
        value: 3.5,
        questions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    defaultBooks.forEach(book => {
      this.books.set(book.slug, book);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: insertUser.id || Math.random().toString(36),
      createdAt: new Date(),
      updatedAt: new Date()
    } as User;
    
    this.users.set(user.id, user);
    this.userStats.set(user.id, {
      id: Math.random().toString(36),
      userId: user.id,
      totalEarnings: 0,
      totalWithdrawals: 0,
      currentBalance: 0,
      booksCompleted: 0,
      booksInProgress: 0,
      totalReadingTime: 0,
      averageRating: 0,
      lastActiveAt: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async getAllBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(b => b.isActive);
  }

  async getBookBySlug(slug: string): Promise<Book | undefined> {
    const book = this.books.get(slug);
    return book?.isActive ? book : undefined;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const book: Book = {
      ...insertBook,
      id: insertBook.id || Math.random().toString(36),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Book;
    
    this.books.set(book.slug, book);
    return book;
  }

  async getUserCompletedBooks(userId: string): Promise<BookCompleted[]> {
    return this.booksCompleted.get(userId) || [];
  }

  async isBookCompleted(userId: string, bookSlug: string): Promise<boolean> {
    const completed = this.booksCompleted.get(userId) || [];
    return completed.some(b => b.bookSlug === bookSlug);
  }

  async completeBook(data: InsertBookCompleted): Promise<BookCompleted> {
    const completed: BookCompleted = {
      ...data,
      id: Math.random().toString(36),
      createdAt: new Date(),
      updatedAt: new Date()
    } as BookCompleted;
    
    const userCompleted = this.booksCompleted.get(data.userId) || [];
    userCompleted.push(completed);
    this.booksCompleted.set(data.userId, userCompleted);
    
    return completed;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return this.transactions.get(userId) || [];
  }

  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      ...data,
      id: Math.random().toString(36),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Transaction;
    
    const userTransactions = this.transactions.get(data.userId) || [];
    userTransactions.push(transaction);
    this.transactions.set(data.userId, userTransactions);
    
    return transaction;
  }

  async getUserStats(userId: string): Promise<UserStats | undefined> {
    return this.userStats.get(userId);
  }

  async createOrUpdateUserStats(userId: string, data: Partial<UserStats>): Promise<UserStats> {
    const existing = this.userStats.get(userId);
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.userStats.set(userId, updated);
      return updated;
    }
    
    const stats: UserStats = {
      ...data,
      id: Math.random().toString(36),
      userId,
      totalEarnings: data.totalEarnings || 0,
      totalWithdrawals: data.totalWithdrawals || 0,
      currentBalance: data.currentBalance || 0,
      booksCompleted: data.booksCompleted || 0,
      booksInProgress: data.booksInProgress || 0,
      totalReadingTime: data.totalReadingTime || 0,
      averageRating: data.averageRating || 0,
      lastActiveAt: new Date(),
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as UserStats;
    
    this.userStats.set(userId, stats);
    return stats;
  }

  async updateUserBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<void> {
    const stats = this.userStats.get(userId);
    if (!stats) return;
    
    const newBalance = type === 'add' 
      ? stats.currentBalance + amount 
      : stats.currentBalance - amount;
    
    this.userStats.set(userId, {
      ...stats,
      currentBalance: Math.max(0, newBalance),
      updatedAt: new Date()
    });
  }

  async saveUserUtmData(userId: string, data: InsertUserUtmTracking): Promise<UserUtmTracking> {
    const tracking: UserUtmTracking = {
      ...data,
      id: Math.random().toString(36),
      createdAt: new Date(),
      updatedAt: new Date()
    } as UserUtmTracking;
    
    this.utmTracking.set(userId, tracking);
    return tracking;
  }

  async getUserUtmData(userId: string): Promise<UserUtmTracking | undefined> {
    return this.utmTracking.get(userId);
  }

  async updateUtmConversion(userId: string, plan: string): Promise<void> {
    const tracking = this.utmTracking.get(userId);
    if (!tracking) return;
    
    this.utmTracking.set(userId, {
      ...tracking,
      hasConverted: true,
      conversionPlan: plan,
      conversionDate: new Date(),
      updatedAt: new Date()
    });
  }

  async saveReadingProgress(data: InsertReadingProgress): Promise<ReadingProgress> {
    const progress: ReadingProgress = {
      ...data,
      id: Math.random().toString(36),
      createdAt: new Date(),
      updatedAt: new Date()
    } as ReadingProgress;
    
    const key = `${data.userId}-${data.bookSlug}`;
    this.readingProgress.set(key, progress);
    return progress;
  }

  async getReadingProgress(userId: string, bookSlug: string): Promise<ReadingProgress | undefined> {
    const key = `${userId}-${bookSlug}`;
    return this.readingProgress.get(key);
  }

  async updateReadingProgress(userId: string, bookSlug: string, progress: number, timeSpent: number): Promise<void> {
    const key = `${userId}-${bookSlug}`;
    const existing = this.readingProgress.get(key);
    if (!existing) return;
    
    this.readingProgress.set(key, {
      ...existing,
      currentPage: progress,
      timeSpent: existing.timeSpent + timeSpent,
      lastReadAt: new Date(),
      updatedAt: new Date()
    });
  }

  async getFriendship(userId: string, friendId: string): Promise<Friendship | undefined> {
    return this.friendships.find(
      f => (f.userId === userId && f.friendId === friendId) ||
           (f.userId === friendId && f.friendId === userId && f.status === 'accepted')
    );
  }

  async createFriendshipRequest(userId: string, friendId: string): Promise<Friendship> {
    const friendship: Friendship = {
      id: Math.random().toString(36),
      userId,
      friendId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.friendships.push(friendship);
    return friendship;
  }

  async getPendingFriendRequests(userId: string): Promise<any[]> {
    return this.friendships
      .filter(f => f.friendId === userId && f.status === 'pending')
      .map(f => ({ 
        ...f, 
        user: this.users.get(f.userId) 
      }));
  }

  async getUserFriends(userId: string): Promise<any[]> {
    const accepted = this.friendships.filter(
      f => f.status === 'accepted' && (f.userId === userId || f.friendId === userId)
    );
    
    return accepted.map(f => {
      const friendId = f.userId === userId ? f.friendId : f.userId;
      return { 
        ...f, 
        user: this.users.get(friendId),
        isOnline: this.onlineStatus.get(friendId) || false
      };
    });
  }

  async acceptFriendRequest(friendshipId: string, userId: string): Promise<void> {
    const friendship = this.friendships.find(f => f.id === friendshipId);
    if (friendship && friendship.friendId === userId) {
      friendship.status = 'accepted';
      friendship.updatedAt = new Date();
    }
  }

  async rejectFriendRequest(friendshipId: string, userId: string): Promise<void> {
    const index = this.friendships.findIndex(f => f.id === friendshipId);
    if (index !== -1 && this.friendships[index].friendId === userId) {
      this.friendships.splice(index, 1);
    }
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    this.friendships = this.friendships.filter(
      f => !((f.userId === userId && f.friendId === friendId) ||
             (f.userId === friendId && f.friendId === userId))
    );
  }

  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    this.onlineStatus.set(userId, isOnline);
  }
}

export class DatabaseStorage implements IStorage {
  private getDb() {
    const db = getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    return db;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.getDb().select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.getDb().select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await getDb()
      .insert(users)
      .values(insertUser)
      .returning();
      
    // Create initial stats for the user
    await this.getDb().insert(userStats).values({
      userId: user.id,
    });
    
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await this.getDb()
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Books operations
  async getAllBooks(): Promise<Book[]> {
    return await this.getDb()
      .select()
      .from(books)
      .where(eq(books.isActive, true))
      .orderBy(books.createdAt);
  }

  async getBookBySlug(slug: string): Promise<Book | undefined> {
    const [book] = await this.getDb()
      .select()
      .from(books)
      .where(and(eq(books.slug, slug), eq(books.isActive, true)));
    return book;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const [book] = await this.getDb()
      .insert(books)
      .values(insertBook)
      .returning();
    return book;
  }

  // Book completion operations
  async getUserCompletedBooks(userId: string): Promise<BookCompleted[]> {
    return await this.getDb()
      .select()
      .from(booksCompleted)
      .where(eq(booksCompleted.userId, userId))
      .orderBy(desc(booksCompleted.completedAt));
  }

  async isBookCompleted(userId: string, bookSlug: string): Promise<boolean> {
    const [result] = await this.getDb()
      .select()
      .from(booksCompleted)
      .where(
        and(
          eq(booksCompleted.userId, userId),
          eq(booksCompleted.bookSlug, bookSlug)
        )
      );
    return !!result;
  }

  async completeBook(data: InsertBookCompleted): Promise<BookCompleted> {
    // Start a transaction to ensure data consistency
    return await this.getDb().transaction(async (tx) => {
      // Check if book already completed
      const [existing] = await tx
        .select()
        .from(booksCompleted)
        .where(
          and(
            eq(booksCompleted.userId, data.userId),
            eq(booksCompleted.bookSlug, data.bookSlug)
          )
        );
      
      if (existing) {
        throw new Error("Book already completed");
      }

      // Insert book completion
      const [completion] = await tx
        .insert(booksCompleted)
        .values(data)
        .returning();

      // Get user's current balance
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, data.userId));

      const rewardAmount = Number(data.reward);
      const currentBalance = Number(user.balance);
      const newBalance = currentBalance + rewardAmount;

      // Update user balance and earnings
      await tx
        .update(users)
        .set({
          balance: newBalance.toString(),
          totalEarnings: (Number(user.totalEarnings) + rewardAmount).toString(),
          canWithdraw: newBalance >= 50, // Can withdraw after R$50
          updatedAt: new Date(),
        })
        .where(eq(users.id, data.userId));

      // Create transaction record
      await tx.insert(transactions).values({
        userId: data.userId,
        type: 'earning',
        description: `Leitura completa: ${data.title}`,
        amount: data.reward,
        balanceBefore: currentBalance.toString(),
        balanceAfter: newBalance.toString(),
        referenceId: completion.id,
      });

      // Update user stats
      await this.updateStatsAfterCompletion(tx, data.userId, rewardAmount);

      return completion;
    });
  }

  // Transaction operations
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await this.getDb()
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const [transaction] = await this.getDb()
      .insert(transactions)
      .values(data)
      .returning();
    return transaction;
  }

  // Stats operations
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const [stats] = await this.getDb()
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));
    return stats;
  }
  
  // Recalculate all user statistics from scratch based on existing data
  async recalculateUserStats(userId: string): Promise<UserStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Count books for each period
    const [totalBooksResult] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(booksCompleted)
      .where(eq(booksCompleted.userId, userId));
      
    const [todayBooksResult] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(booksCompleted)
      .where(
        and(
          eq(booksCompleted.userId, userId),
          gte(booksCompleted.completedAt, todayStart)
        )
      );
      
    const [weekBooksResult] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(booksCompleted)
      .where(
        and(
          eq(booksCompleted.userId, userId),
          gte(booksCompleted.completedAt, weekStart)
        )
      );
      
    const [monthBooksResult] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(booksCompleted)
      .where(
        and(
          eq(booksCompleted.userId, userId),
          gte(booksCompleted.completedAt, monthStart)
        )
      );
      
    // Calculate earnings for each period
    const [todayEarningsResult] = await this.getDb()
      .select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'earning'),
          gte(transactions.createdAt, todayStart)
        )
      );
      
    const [weekEarningsResult] = await this.getDb()
      .select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'earning'),
          gte(transactions.createdAt, weekStart)
        )
      );
      
    const [monthEarningsResult] = await this.getDb()
      .select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'earning'),
          gte(transactions.createdAt, monthStart)
        )
      );
      
    // Calculate average rating
    const [avgRatingResult] = await this.getDb()
      .select({ avg: sql<number>`COALESCE(AVG(rating), 0)` })
      .from(booksCompleted)
      .where(eq(booksCompleted.userId, userId));
      
    // Calculate difficulty counts
    const completedBooks = await this.getDb()
      .select()
      .from(booksCompleted)
      .where(eq(booksCompleted.userId, userId));
      
    // For now, set difficulty counts to 0 (will fix properly later)
    const easyCount = 0;
    const mediumCount = 0;
    const hardCount = 0;
    
    // Calculate streak - simplified version
    let streak = 0;
    if (completedBooks.length > 0) {
      // Just count consecutive days from today
      streak = 1; // Simple implementation for now
    }
    
    // Get user for monthly goal
    const [user] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.id, userId));
      
    const monthlyGoal = Number(user?.monthlyGoal || 500);
    const weeklyGoal = monthlyGoal / 4;
    
    // Create or update stats
    const statsData = {
      totalBooksRead: Number(totalBooksResult.count),
      todayBooksRead: Number(todayBooksResult.count),
      weekBooksRead: Number(weekBooksResult.count),
      monthBooksRead: Number(monthBooksResult.count),
      todayEarnings: todayEarningsResult.sum.toString(),
      weekEarnings: weekEarningsResult.sum.toString(),
      monthEarnings: monthEarningsResult.sum.toString(),
      averageRating: avgRatingResult.avg.toString(),
      easyBooksCount: easyCount,
      mediumBooksCount: mediumCount,
      hardBooksCount: hardCount,
      streak: streak,
      weeklyProgress: weeklyGoal > 0 ? Number(((Number(weekEarningsResult.sum) / weeklyGoal) * 100).toFixed(2)) : 0,
      monthlyProgress: monthlyGoal > 0 ? Number(((Number(monthEarningsResult.sum) / monthlyGoal) * 100).toFixed(2)) : 0,
      updatedAt: new Date(),
    };
    
    const [existing] = await this.getDb()
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));
      
    if (existing) {
      const [updated] = await this.getDb()
        .update(userStats)
        .set(statsData)
        .where(eq(userStats.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await this.getDb()
        .insert(userStats)
        .values({ ...statsData, userId })
        .returning();
      return created;
    }
  }

  async createOrUpdateUserStats(userId: string, data: Partial<UserStats>): Promise<UserStats> {
    const [existing] = await this.getDb()
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (existing) {
      const [updated] = await this.getDb()
        .update(userStats)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userStats.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await this.getDb()
        .insert(userStats)
        .values({ ...data, userId })
        .returning();
      return created;
    }
  }

  async updateUserBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<void> {
    const [user] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) throw new Error("User not found");

    const currentBalance = Number(user.balance);
    const newBalance = type === 'add' ? currentBalance + amount : currentBalance - amount;
    
    if (newBalance < 0) throw new Error("Insufficient balance");

    await this.getDb()
      .update(users)
      .set({
        balance: newBalance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // UTM tracking operations
  async saveUserUtmData(userId: string, data: InsertUserUtmTracking): Promise<UserUtmTracking> {
    // Check if UTM data already exists for user
    const [existing] = await this.getDb()
      .select()
      .from(userUtmTracking)
      .where(eq(userUtmTracking.userId, userId));
    
    if (existing) {
      // Update only if new data has more complete UTM params
      if (data.utmSource || data.utmCampaign || data.fbclid) {
        const [updated] = await this.getDb()
          .update(userUtmTracking)
          .set({
            ...data,
            userId,
          })
          .where(eq(userUtmTracking.userId, userId))
          .returning();
        return updated;
      }
      return existing;
    }
    
    const [tracking] = await this.getDb()
      .insert(userUtmTracking)
      .values({
        ...data,
        userId,
      })
      .returning();
    return tracking;
  }

  async getUserUtmData(userId: string): Promise<UserUtmTracking | undefined> {
    const [tracking] = await this.getDb()
      .select()
      .from(userUtmTracking)
      .where(eq(userUtmTracking.userId, userId));
    return tracking;
  }

  async updateUtmConversion(userId: string, plan: string): Promise<void> {
    await this.getDb()
      .update(userUtmTracking)
      .set({
        conversionDate: new Date(),
        conversionPlan: plan,
      })
      .where(eq(userUtmTracking.userId, userId));
  }

  // Reading progress operations
  async saveReadingProgress(data: InsertReadingProgress): Promise<ReadingProgress> {
    // Check if progress already exists
    const [existing] = await this.getDb()
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, data.userId),
          eq(readingProgress.bookSlug, data.bookSlug)
        )
      );
    
    if (existing) {
      const [updated] = await this.getDb()
        .update(readingProgress)
        .set({
          ...data,
          lastReadAt: new Date(),
        })
        .where(eq(readingProgress.id, existing.id))
        .returning();
      return updated;
    }
    
    const [progress] = await this.getDb()
      .insert(readingProgress)
      .values(data)
      .returning();
    return progress;
  }

  async getReadingProgress(userId: string, bookSlug: string): Promise<ReadingProgress | undefined> {
    const [progress] = await this.getDb()
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.bookSlug, bookSlug)
        )
      );
    return progress;
  }

  async updateReadingProgress(userId: string, bookSlug: string, progress: number, timeSpent: number): Promise<void> {
    const [existing] = await this.getDb()
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.bookSlug, bookSlug)
        )
      );
    
    if (existing) {
      await this.getDb()
        .update(readingProgress)
        .set({
          progress,
          timeSpent: existing.timeSpent + timeSpent,
          lastReadAt: new Date(),
          isCompleted: progress >= 100,
        })
        .where(eq(readingProgress.id, existing.id));
    } else {
      await this.getDb()
        .insert(readingProgress)
        .values({
          userId,
          bookSlug,
          bookId: '', // Will need to look up book ID
          progress,
          timeSpent,
          isCompleted: progress >= 100,
        });
    }
  }

  // Helper method to update stats after book completion
  private async updateStatsAfterCompletion(tx: any, userId: string, rewardAmount: number) {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get current stats
    const [stats] = await tx
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (!stats) {
      // Create new stats if doesn't exist
      await tx.insert(userStats).values({
        userId,
        totalBooksRead: 1,
        todayBooksRead: 1,
        weekBooksRead: 1,
        monthBooksRead: 1,
        todayEarnings: rewardAmount.toString(),
        weekEarnings: rewardAmount.toString(),
        monthEarnings: rewardAmount.toString(),
        averageRating: '0',
        streak: 1,
        lastReadDate: now,
      });
    } else {
      // Calculate books read today, this week, this month
      const todayBooks = await tx
        .select({ count: sql`count(*)` })
        .from(booksCompleted)
        .where(
          and(
            eq(booksCompleted.userId, userId),
            gte(booksCompleted.completedAt, todayStart)
          )
        );

      const weekBooks = await tx
        .select({ count: sql`count(*)` })
        .from(booksCompleted)
        .where(
          and(
            eq(booksCompleted.userId, userId),
            gte(booksCompleted.completedAt, weekStart)
          )
        );

      const monthBooks = await tx
        .select({ count: sql`count(*)` })
        .from(booksCompleted)
        .where(
          and(
            eq(booksCompleted.userId, userId),
            gte(booksCompleted.completedAt, monthStart)
          )
        );

      // Calculate earnings for periods
      const todayEarnings = await tx
        .select({ sum: sql`COALESCE(SUM(amount), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'earning'),
            gte(transactions.createdAt, todayStart)
          )
        );

      const weekEarnings = await tx
        .select({ sum: sql`COALESCE(SUM(amount), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'earning'),
            gte(transactions.createdAt, weekStart)
          )
        );

      const monthEarnings = await tx
        .select({ sum: sql`COALESCE(SUM(amount), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'earning'),
            gte(transactions.createdAt, monthStart)
          )
        );

      // Calculate average rating
      const avgRating = await tx
        .select({ avg: sql`COALESCE(AVG(rating), 0)` })
        .from(booksCompleted)
        .where(eq(booksCompleted.userId, userId));

      // Update stats
      await tx
        .update(userStats)
        .set({
          totalBooksRead: Number(stats.totalBooksRead) + 1,
          todayBooksRead: Number(todayBooks[0].count),
          weekBooksRead: Number(weekBooks[0].count),
          monthBooksRead: Number(monthBooks[0].count),
          todayEarnings: todayEarnings[0].sum.toString(),
          weekEarnings: weekEarnings[0].sum.toString(),
          monthEarnings: monthEarnings[0].sum.toString(),
          averageRating: avgRating[0].avg.toString(),
          lastReadDate: now,
          updatedAt: new Date(),
        })
        .where(eq(userStats.userId, userId));
    }
  }
  
  
  async getAllUsersWithStats(): Promise<any[]> {
    const usersData = await this.getDb()
      .select({
        user: users,
        stats: userStats,
      })
      .from(users)
      .leftJoin(userStats, eq(users.id, userStats.userId));
      
    return usersData;
  }

  // Friendship operations
  async getFriendship(userId: string, friendId: string): Promise<Friendship | undefined> {
    const [friendship] = await this.getDb()
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.friendId, friendId)
        )
      );
    
    if (friendship) return friendship;
    
    // Check reverse direction
    const [reverseFriendship] = await this.getDb()
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId)
        )
      );
    
    return reverseFriendship;
  }

  async createFriendshipRequest(userId: string, friendId: string): Promise<Friendship> {
    const [friendship] = await this.getDb()
      .insert(friendships)
      .values({
        userId,
        friendId,
        status: 'pending',
        requestedBy: userId,
      })
      .returning();
    
    // Also create the reverse relationship for easier queries
    await this.getDb()
      .insert(friendships)
      .values({
        userId: friendId,
        friendId: userId,
        status: 'pending',
        requestedBy: userId,
      })
      .onConflictDoNothing();
    
    return friendship;
  }

  async getPendingFriendRequests(userId: string): Promise<any[]> {
    const requests = await this.getDb()
      .select({
        friendship: friendships,
        requester: users,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requestedBy, users.id))
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, 'pending'),
          sql`${friendships.requestedBy} != ${userId}`
        )
      );
    
    return requests;
  }

  async getUserFriends(userId: string): Promise<any[]> {
    const friends = await this.getDb()
      .select({
        friendship: friendships,
        friend: users,
        onlineStatus: userOnlineStatus,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .leftJoin(userOnlineStatus, eq(users.id, userOnlineStatus.userId))
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.status, 'accepted')
        )
      );
    
    return friends;
  }

  async acceptFriendRequest(friendshipId: string, userId: string): Promise<void> {
    // Update both directions to accepted
    await this.getDb()
      .update(friendships)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(friendships.id, friendshipId));
    
    // Get the friendship to update the reverse
    const [friendship] = await this.getDb()
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId));
    
    if (friendship) {
      // Update reverse friendship
      await this.getDb()
        .update(friendships)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(
          and(
            eq(friendships.userId, friendship.friendId),
            eq(friendships.friendId, friendship.userId)
          )
        );
    }
  }

  async rejectFriendRequest(friendshipId: string, userId: string): Promise<void> {
    // Delete both directions
    const [friendship] = await this.getDb()
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId));
    
    if (friendship) {
      await this.getDb()
        .delete(friendships)
        .where(eq(friendships.id, friendshipId));
      
      // Delete reverse
      await this.getDb()
        .delete(friendships)
        .where(
          and(
            eq(friendships.userId, friendship.friendId),
            eq(friendships.friendId, friendship.userId)
          )
        );
    }
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    // Delete both directions
    await getDb()
      .delete(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.friendId, friendId)
        )
      );
    
    await getDb()
      .delete(friendships)
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId)
        )
      );
  }

  // Online status operations
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await getDb()
      .insert(userOnlineStatus)
      .values({
        userId,
        isOnline,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: userOnlineStatus.userId,
        set: {
          isOnline,
          lastSeen: new Date(),
        },
      });
  }
}

// Choose the appropriate storage implementation based on database availability
function createStorage(): IStorage {
  const db = getDb();
  if (!db) {
    console.warn("DATABASE_URL not configured - using in-memory storage");
    return new MemoryStorage();
  }
  return new DatabaseStorage();
}

export const storage = createStorage();