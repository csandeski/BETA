// API Client for Beta Reader Brasil

const API_URL = '/api';

class ApiClient {
  private userId: string | null = null;

  constructor() {
    // Check authentication status on initialization
    this.checkAuthStatus();
  }
  
  private async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();
        this.userId = data.userId;
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  }

  private async request(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.userId) {
      headers['X-User-Id'] = this.userId;
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include', // IMPORTANTE: Enviar cookies com as requisições
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Auth methods
  async register(data: {
    email: string;
    fullName: string;
    phone: string;
    password: string;
  }) {
    const user = await this.request('POST', '/users/register', data);
    this.userId = user.id;
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.request('POST', '/users/login', { email, password });
    this.userId = user.id;
    return user;
  }

  async logout() {
    await this.request('POST', '/logout', {});
    this.userId = null;
  }

  // User methods
  async getCurrentUser() {
    if (!this.userId) return null;
    try {
      return await this.request('GET', '/users/me');
    } catch {
      this.logout();
      return null;
    }
  }

  async updateUser(data: any) {
    return await this.request('PATCH', '/users/me', data);
  }

  async getUserStats() {
    return await this.request('GET', '/users/stats');
  }

  // Books methods
  async getAllBooks() {
    return await this.request('GET', '/books');
  }

  async getBook(slug: string) {
    return await this.request('GET', `/books/${slug}`);
  }

  async getCompletedBooks() {
    return await this.request('GET', '/users/books/completed');
  }

  async isBookCompleted(slug: string) {
    const result = await this.request('GET', `/users/books/completed/${slug}`);
    return result.completed;
  }

  async completeBook(data: {
    bookSlug: string;
    title: string;
    author?: string;
    reward: number;
    rating: number;
    opinion: string;
    readingTime: number;
    quizAnswers?: any;
  }) {
    return await this.request('POST', '/books/complete', data);
  }

  // Transactions
  async getTransactions() {
    return await this.request('GET', '/users/transactions');
  }

  async withdraw(amount: number) {
    return await this.request('POST', '/users/withdraw', { amount });
  }

  // Goals and plans
  async updateMonthlyGoal(monthlyGoal: number) {
    return await this.request('PATCH', '/users/monthly-goal', { monthlyGoal });
  }

  async upgradePlan(plan: 'free' | 'premium') {
    return await this.request('POST', '/users/upgrade-plan', { plan });
  }

  // Database sync methods
  async getUserData(userId: string) {
    return await this.request('GET', `/users/${userId}/data`);
  }

  async updateUserData(userId: string, data: any) {
    return await this.request('PUT', `/users/${userId}/data`, data);
  }

  // Removed completeBookWithId - using completeBook instead

  // Friendship methods
  async sendFriendRequest(friendEmail: string) {
    return await this.request('POST', '/friendships/send-request', { friendEmail });
  }

  async getPendingFriendRequests() {
    return await this.request('GET', '/friendships/pending');
  }

  async getUserFriends() {
    return await this.request('GET', '/friendships/friends');
  }

  async acceptFriendRequest(friendshipId: string) {
    return await this.request('POST', '/friendships/accept', { friendshipId });
  }

  async rejectFriendRequest(friendshipId: string) {
    return await this.request('POST', '/friendships/reject', { friendshipId });
  }

  async removeFriend(friendId: string) {
    return await this.request('DELETE', `/friendships/${friendId}`);
  }

  async updateOnlineStatus(isOnline: boolean) {
    return await this.request('POST', '/users/online-status', { isOnline });
  }

  // Helper methods
  isLoggedIn() {
    return !!this.userId;
  }

  getUserId() {
    return this.userId;
  }
  
  setUserId(userId: string | null) {
    this.userId = userId;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types from the API responses
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  plan: 'free' | 'premium';
  balance: string;
  totalEarnings: string;
  monthlyGoal: string;
  canWithdraw: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  synopsis?: string;
  content: string;
  category?: string;
  difficulty: string;
  readingTime: number;
  reward: string;
  pages?: number;
  chapters?: number;
  publishYear?: number;
  questions: any;
  isActive: boolean;
  createdAt: string;
}

export interface BookCompleted {
  id: string;
  userId: string;
  bookId: string;
  bookSlug: string;
  title: string;
  author?: string;
  reward: string;
  rating: number;
  opinion?: string;
  readingTime: number;
  quizAnswers?: any;
  completedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'earning' | 'bonus' | 'withdrawal' | 'activity';
  description: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  referenceId?: string;
  createdAt: string;
}

export interface UserStats {
  id: string;
  userId: string;
  totalBooksRead: number;
  todayBooksRead: number;
  weekBooksRead: number;
  monthBooksRead: number;
  todayEarnings: string;
  weekEarnings: string;
  monthEarnings: string;
  averageRating: string;
  streak: number;
  lastReadDate?: string;
  easyBooksCount: number;
  mediumBooksCount: number;
  hardBooksCount: number;
  weeklyProgress: string;
  monthlyProgress: string;
  updatedAt: string;
}