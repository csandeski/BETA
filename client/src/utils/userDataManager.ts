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
      // ALWAYS load everything from database - no localStorage
      const dbUser = await apiClient.getUserData(this.userId);
      if (dbUser) {
        // Use database data as the single source of truth
        this.userData = dbUser;
        console.log('Loaded user data from database:', {
          totalBooksRead: dbUser.stats?.totalBooksRead,
          balance: dbUser.balance,
          booksCompleted: dbUser.booksCompleted?.length
        });
      } else {
        console.warn('No user data found in database');
        // Only create basic structure if completely missing
        const user = await apiClient.getCurrentUser();
        if (user) {
          this.userData = this.createFullUserData(user);
        }
      }
    } catch (error) {
      console.error('Error loading user from database:', error);
      throw error; // Don't create fake data on error
    }
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
    // Book completion is handled by the backend via apiClient.completeBook()
    // This method is no longer needed as all data processing happens server-side
    // The frontend just needs to reload data after completion
    console.log('Book completion handled by backend, reloading user data...');
    await this.loadUserData();
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