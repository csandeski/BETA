import { apiClient } from "@/lib/api";

export interface BookRead {
  id: string;
  bookSlug: string;
  title: string;
  reward: number;
  completedAt: string;
  rating: number;
}

export interface UserStats {
  totalEarnings: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalBooksRead: number;
  todayBooksRead: number;
  weekBooksRead?: number;
  averageRating: number;
  lastSevenDays: { dia: string; valor: number }[];
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyGoal: number;
  monthlyProgress: number;
  streak?: number;
  totalActivities?: number;
  easyBooksCount?: number;
  mediumBooksCount?: number;
  hardBooksCount?: number;
}

export interface Transaction {
  type: 'earning' | 'bonus' | 'activity';
  description: string;
  amount: number;
  date: string;
}

export interface UserData {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  registeredAt: string;
  balance: number;
  booksCompleted: BookRead[];
  stats: UserStats;
  selectedPlan: 'free' | 'premium' | null;
  canWithdraw: boolean;
  transactions: Transaction[];
  monthlyGoal: number;
  totalEarnings: number;
  plan: 'free' | 'premium';
  createdAt: string;
  dailyBooksRead: number;
  lastReadDate: string;
  completedBooks: string[];
}

class UserDataManager {
  private userData: UserData | null = null;
  private userId: string | null = null;
  
  constructor() {
    // Initialize and check auth status
    this.initializeAuth();
  }
  
  private async initializeAuth() {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();
        if (data.userId) {
          this.userId = data.userId;
          apiClient.setUserId(this.userId);
          this.loadUserData().catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  public async loadUserData(): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Load everything from database
      const dbUser = await apiClient.getUserData(this.userId);
      if (dbUser) {
        this.userData = dbUser;
      } else {
        // Create default user data structure if not in database
        const user = await apiClient.getCurrentUser();
        if (user) {
          this.userData = this.createFullUserData(user);
          await this.saveUserData();
        }
      }
    } catch (error) {
      console.error('Error loading user from database:', error);
      // Create minimal user data structure
      const user = await apiClient.getCurrentUser();
      if (user) {
        this.userData = this.createFullUserData(user);
      }
    }
  }

  private mergeUserData(dbData: any, localData: any): UserData {
    // Merge database data with local data, preferring database
    const merged = {
      ...localData,
      ...dbData,
      booksCompleted: dbData.booksCompleted || localData.booksCompleted || [],
      transactions: dbData.transactions || localData.transactions || [],
      completedBooks: dbData.completedBooks || localData.completedBooks || [],
      stats: {
        ...localData.stats,
        ...dbData.stats
      }
    };
    return merged;
  }

  private createFullUserData(basicData: any): UserData {
    const now = new Date();
    const lastSevenDays = this.generateLastSevenDays();
    
    return {
      fullName: basicData.fullName || '',
      email: basicData.email || '',
      phone: basicData.phone || '',
      password: basicData.password || '',
      registeredAt: basicData.registeredAt || now.toISOString(),
      balance: 0,
      booksCompleted: [],
      selectedPlan: null,
      canWithdraw: false,
      transactions: [],
      monthlyGoal: basicData.monthlyGoal || 500,
      totalEarnings: 0,
      plan: basicData.plan || 'free',
      createdAt: basicData.createdAt || now.toISOString(),
      dailyBooksRead: 0,
      lastReadDate: new Date().toLocaleDateString('pt-BR'),
      completedBooks: [],
      stats: {
        totalEarnings: 0,
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
        totalBooksRead: 0,
        todayBooksRead: 0,
        averageRating: 0,
        lastSevenDays: lastSevenDays,
        weeklyGoal: 500,
        weeklyProgress: 0,
        monthlyGoal: 2000,
        monthlyProgress: 0,
        streak: 0,
        totalActivities: 0,
        easyBooksCount: 0,
        mediumBooksCount: 0,
        hardBooksCount: 0
      }
    };
  }

  private generateLastSevenDays(): { dia: string; valor: number }[] {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date().getDay();
    const result: { dia: string; valor: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7;
      result.push({
        dia: days[dayIndex],
        valor: 0
      });
    }
    
    return result;
  }

  private async saveUserData(): Promise<void> {
    if (this.userData && this.userId) {
      try {
        // Save only to database
        await apiClient.updateUserData(this.userId, this.userData);
      } catch (error) {
        console.error('Error saving to database:', error);
      }
    }
  }

  public getUserData(): UserData | null {
    return this.userData;
  }

  public async updateUserData(updates: Partial<UserData>): Promise<void> {
    if (this.userData) {
      this.userData = { ...this.userData, ...updates };
      await this.saveUserData();
    }
  }

  public async completeBook(bookData: {
    bookSlug: string;
    title: string;
    reward: number;
    rating: number;
    difficulty?: string;
  }): Promise<void> {
    if (!this.userData) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ensure arrays are initialized
    if (!this.userData.booksCompleted) {
      this.userData.booksCompleted = [];
    }
    if (!this.userData.completedBooks) {
      this.userData.completedBooks = [];
    }
    if (!this.userData.transactions) {
      this.userData.transactions = [];
    }

    // Add book to completed list
    const bookRead: BookRead = {
      id: `book_${Date.now()}`,
      ...bookData,
      completedAt: now.toISOString()
    };
    
    this.userData.booksCompleted.push(bookRead);
    this.userData.completedBooks.push(bookData.bookSlug);
    
    // Add transaction
    this.userData.transactions.push({
      type: 'earning',
      description: `${bookData.title} - Leitura completa`,
      amount: bookData.reward,
      date: now.toISOString()
    });
    
    // Update difficulty counters
    const stats = this.userData.stats as any;
    if (bookData.difficulty === 'Fácil') {
      stats.easyBooksCount = (stats.easyBooksCount || 0) + 1;
    } else if (bookData.difficulty === 'Médio') {
      stats.mediumBooksCount = (stats.mediumBooksCount || 0) + 1;
    } else if (bookData.difficulty === 'Difícil') {
      stats.hardBooksCount = (stats.hardBooksCount || 0) + 1;
    }
    
    // Update balance and total earnings
    this.userData.balance += bookData.reward;
    this.userData.totalEarnings += bookData.reward;
    
    // Update stats
    this.userData.stats.totalEarnings += bookData.reward;
    this.userData.stats.totalBooksRead += 1;
    
    // Update today's earnings
    const todayBooks = this.userData.booksCompleted.filter(b => 
      b.completedAt.split('T')[0] === today
    );
    this.userData.stats.todayEarnings = todayBooks.reduce((sum, b) => sum + b.reward, 0);
    this.userData.stats.todayBooksRead = todayBooks.length;
    
    // Update week earnings
    const weekBooks = this.userData.booksCompleted.filter(b => 
      new Date(b.completedAt) >= weekStart
    );
    this.userData.stats.weekEarnings = weekBooks.reduce((sum, b) => sum + b.reward, 0);
    
    // Update month earnings
    const monthBooks = this.userData.booksCompleted.filter(b => 
      new Date(b.completedAt) >= monthStart
    );
    this.userData.stats.monthEarnings = monthBooks.reduce((sum, b) => sum + b.reward, 0);
    
    // Update progress percentages
    this.userData.stats.weeklyProgress = Math.min(100, 
      (this.userData.stats.weekEarnings / this.userData.stats.weeklyGoal) * 100
    );
    this.userData.stats.monthlyProgress = Math.min(100,
      (this.userData.stats.monthEarnings / this.userData.stats.monthlyGoal) * 100
    );
    
    // Update average rating
    const totalRatings = this.userData.booksCompleted.reduce((sum, b) => sum + b.rating, 0);
    this.userData.stats.averageRating = totalRatings / this.userData.booksCompleted.length;
    
    // Update last 7 days chart
    const last7Days = this.generateLastSevenDays();
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayBooks = this.userData.booksCompleted.filter(b =>
        b.completedAt.split('T')[0] === dateStr
      );
      
      last7Days[i].valor = dayBooks.reduce((sum, b) => sum + b.reward, 0);
    }
    this.userData.stats.lastSevenDays = last7Days;
    
    // Check if can withdraw (3+ books)
    if (this.userData.stats.totalBooksRead >= 3) {
      this.userData.canWithdraw = true;
    }
    
    // Book already saved to database via apiClient.completeBook()
    // No need to save again here
    
    await this.saveUserData();
  }

  public async withdraw(amount: number): Promise<boolean> {
    if (!this.userData || this.userData.balance < amount) {
      return false;
    }
    
    this.userData.balance -= amount;
    await this.saveUserData();
    return true;
  }

  public isBookCompleted(bookSlug: string): boolean {
    if (!this.userData) return false;
    return this.userData.booksCompleted.some(book => book.bookSlug === bookSlug);
  }

  public async selectPlan(plan: string): Promise<void> {
    if (this.userData) {
      const selectedPlan = plan as 'free' | 'premium';
      this.userData.selectedPlan = selectedPlan;
      this.userData.plan = selectedPlan;
      if (plan === 'premium') {
        // Premium payment would be processed here
        // For now, just mark as premium
      }
      await this.saveUserData();
    }
  }

  public async updateMonthlyGoal(goal: number): Promise<void> {
    if (this.userData) {
      this.userData.monthlyGoal = goal;
      this.userData.stats.monthlyGoal = goal;
      this.userData.stats.monthlyProgress = Math.min(100,
        (this.userData.stats.monthEarnings / goal) * 100
      );
      await this.saveUserData();
    }
  }

  public async registerUser(userData: any): Promise<void> {
    // Use the user data directly from registration response
    if (userData && userData.id) {
      this.userId = userData.id;
      this.userData = this.createFullUserData(userData);
      await this.saveUserData();
    }
  }

  public async setUserData(userData: any): Promise<void> {
    // Set user data from API response
    const fullData = this.createFullUserData({
      ...userData,
      createdAt: userData.createdAt || new Date().toISOString(),
      registeredAt: userData.createdAt || new Date().toISOString()
    });
    
    // Store the user ID for database sync
    if (userData.id) {
      this.userId = userData.id;
      fullData.id = userData.id;
    }
    
    // Merge with existing data if needed
    if (userData.balance !== undefined) fullData.balance = Number(userData.balance);
    if (userData.totalEarnings !== undefined) fullData.totalEarnings = Number(userData.totalEarnings);
    if (userData.monthlyGoal !== undefined) fullData.monthlyGoal = Number(userData.monthlyGoal);
    if (userData.plan !== undefined) fullData.plan = userData.plan;
    if (userData.canWithdraw !== undefined) fullData.canWithdraw = userData.canWithdraw;
    
    this.userData = fullData;
    await this.saveUserData();
  }

  public clearUserData(): void {
    this.userData = null;
    this.userId = null;
  }
}

// Export singleton instance
export const userDataManager = new UserDataManager();

// React hook for using user data
import { useState, useEffect } from "react";

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(userDataManager.getUserData());
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Load initial data from database
    const loadData = async () => {
      setIsLoading(true);
      await userDataManager.loadUserData();
      setUserData(userDataManager.getUserData());
      setIsLoading(false);
    };
    
    loadData();
    
    // Check for updates periodically
    const interval = setInterval(() => {
      setUserData(userDataManager.getUserData());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return { 
    userData,
    isLoading,
    updateUserData: async (updates: Partial<UserData>) => {
      await userDataManager.updateUserData(updates);
      setUserData(userDataManager.getUserData());
    },
    completeBook: async (bookData: any) => {
      await userDataManager.completeBook(bookData);
      setUserData(userDataManager.getUserData());
    },
    reload: async () => {
      setIsLoading(true);
      await userDataManager.loadUserData();
      setUserData(userDataManager.getUserData());
      setIsLoading(false);
    }
  };
}