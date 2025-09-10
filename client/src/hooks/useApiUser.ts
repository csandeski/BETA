import { useState, useEffect } from "react";
import { apiClient, type User, type UserStats } from "@/lib/api";

// Cache global para evitar recargas desnecessárias
let cachedUser: User | null = null;
let cachedStats: UserStats | null = null;
let lastLoadTime = 0;
const CACHE_DURATION = 5000; // 5 segundos

export function useApiUser() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [stats, setStats] = useState<UserStats | null>(cachedStats);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async (force = false) => {
    // Use cache if available and fresh
    const now = Date.now();
    if (!force && cachedUser && (now - lastLoadTime) < CACHE_DURATION) {
      setUser(cachedUser);
      setStats(cachedStats);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const currentUser = await apiClient.getCurrentUser();
      if (currentUser) {
        cachedUser = currentUser;
        setUser(currentUser);
        const userStats = await apiClient.getUserStats();
        cachedStats = userStats;
        setStats(userStats);
        lastLoadTime = now;
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    fullName: string;
    phone: string;
    password?: string;
  }) => {
    const newUser = await apiClient.register({ ...data, password: data.password || '' });
    setUser(newUser);
    const userStats = await apiClient.getUserStats();
    setStats(userStats);
    return newUser;
  };

  const login = async (email: string, password?: string) => {
    const loggedUser = await apiClient.login(email, password || '');
    setUser(loggedUser);
    const userStats = await apiClient.getUserStats();
    setStats(userStats);
    return loggedUser;
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    setStats(null);
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const updated = await apiClient.updateUser(data);
    setUser(updated);
    return updated;
  };

  const completeBook = async (bookData: any) => {
    const result = await apiClient.completeBook(bookData);
    if (result.user) {
      cachedUser = result.user;
      setUser(result.user);
    }
    if (result.stats) {
      cachedStats = result.stats;
      setStats(result.stats);
    }
    lastLoadTime = Date.now();
    return result;
  };

  const updateMonthlyGoal = async (goal: number) => {
    const updated = await apiClient.updateMonthlyGoal(goal);
    if (user) {
      setUser({ ...user, monthlyGoal: goal.toString() });
    }
    await loadUser(); // Reload to get updated stats
    return updated;
  };

  const upgradePlan = async (plan: 'free' | 'premium') => {
    const updated = await apiClient.upgradePlan(plan);
    if (user) {
      setUser({ ...user, plan });
    }
    return updated;
  };

  return {
    user,
    stats,
    loading,
    register,
    login,
    logout,
    updateUser,
    completeBook,
    updateMonthlyGoal,
    upgradePlan,
    refreshUser: loadUser
  };
}