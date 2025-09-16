import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Home, BookOpen, Wallet, User, LogOut, Clock, Star, ChevronRight, TrendingUp, ArrowRight, Sparkles, Activity, Target, Calendar, BarChart3, Trophy, X, RefreshCw, Loader2, HelpCircle, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import WithdrawModal from "@/components/WithdrawModal";
import PlanModal from "@/components/PlanModal";
import { CompleteBooksModal } from "@/components/CompleteBooksModal";
import FreeChoiceModal from "@/components/FreeChoiceModal";
import WelcomeModal from "@/components/WelcomeModal";
import FriendNotifications from "@/components/FriendNotifications";
import { useSound } from "@/hooks/useSound";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { userDataManager, type UserData } from "@/utils/userDataManager";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import type { Book } from "@shared/schema";

export default function Dashboard() {
  const [showBalance, setShowBalance] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCompleteBooksModal, setShowCompleteBooksModal] = useState(false);
  const [showFreeChoiceModal, setShowFreeChoiceModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [hasSeenCelebration, setHasSeenCelebration] = useState(false);
  const [showFirstRewardPopup, setShowFirstRewardPopup] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [showFaq, setShowFaq] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Lock/unlock body scroll when modals open
  useEffect(() => {
    if (showWithdrawModal || showPlanModal || showFirstRewardPopup || showCompleteBooksModal || showFreeChoiceModal || showWelcomeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showWithdrawModal, showPlanModal, showFirstRewardPopup, showCompleteBooksModal, showFreeChoiceModal, showWelcomeModal]);
  const [, setLocation] = useLocation();
  const { playSound } = useSound();
  const { toast } = useToast();
  
  // Load user data from manager and scroll to top
  useEffect(() => {
    // Scroll to top when dashboard loads
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    const loadData = async () => {
      // Check if user is logged in via API
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      
      if (!authData.isLoggedIn || !authData.userId) {
        // Redirect to home page if not logged in
        setLocation('/');
        return;
      }
      
      // Load fresh data from database
      await userDataManager.loadUserData();
      const data = userDataManager.getUserData();
      if (data) {
        setUserData(data);
        
        // Check if we should show welcome modal for new users
        const shouldShowWelcome = localStorage.getItem('showWelcomeModal') === 'true';
        if (shouldShowWelcome) {
          // Clear the flag and show welcome modal
          localStorage.removeItem('showWelcomeModal');
          setShowWelcomeModal(true);
          return; // Don't show other modals
        }
        
        // Check if this is the first time user enters dashboard
        // Modal states will be managed based on user data from database
        // For now, we'll use basic logic until backend flags are implemented
        
        // Check if user completed their first book
        if (data.stats.totalBooksRead === 1) {
          // Could show first reward popup if needed
        }
        
        // Check if user has completed exactly 3 books and hasn't seen the celebration
        // Show modal regardless of plan status when hitting 3 books milestone
        const celebrationKey = 'hasSeenThreeBooksCelebration';
        const hasSeenCelebrationBefore = localStorage.getItem(celebrationKey) === 'true';
        
        if (data.stats.totalBooksRead >= 3 && !hasSeenCelebrationBefore) {
          // Mark as seen (modal removed)
          localStorage.setItem(celebrationKey, 'true');
        }
      } else {
        // Try to reload data if we should be logged in
        setTimeout(() => loadData(), 1000);
      }
    };
    
    loadData();
    
    // Reload data when page becomes visible (when returning from book page)
    const handleFocus = async () => {
      // Add small delay to ensure book completion is saved
      setTimeout(() => {
        loadData();
      }, 500);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [setLocation, playSound]);
  
  
  const getUserFirstName = () => {
    if (!userData) return "Leitor";
    const firstName = userData.fullName.split(' ')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };
  
  const balance = userData?.balance.toFixed(2).replace('.', ',') || "0,00";
  const hiddenBalance = "•••••";

  // Function to enrich book data with UI properties
  const enrichBookData = (book: any) => {
    const colorOptions = [
      'from-violet-500 to-purple-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-green-500',
      'from-orange-500 to-red-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
      'from-teal-500 to-green-500',
      'from-amber-500 to-orange-500',
    ];
    
    // Generate consistent color based on book title
    const colorIndex = book.title.charCodeAt(0) % colorOptions.length;
    
    return {
      ...book,
      color: colorOptions[colorIndex],
      rating: book.rating || (3.5 + (book.title.length % 15) / 10).toFixed(1), // Generate rating between 3.5-5.0
      readTime: book.readingTime ? `${book.readingTime} min` : '10 min',
    };
  };

  // Fetch books from API using React Query
  const { data: booksRaw = [], isLoading: isLoadingBooks, refetch: refetchBooks } = useQuery<Book[]>({
    queryKey: ['/api/books/feed'],
    enabled: !!userData,
    refetchOnWindowFocus: false,
  });
  
  // Enrich books with UI properties
  const books = booksRaw.map(enrichBookData);
  
  // Refresh books mutation with throttle
  const refreshBooksMutation = useMutation({
    mutationFn: async () => {
      const now = Date.now();
      if (now - lastRefreshTime < 5000) {
        throw new Error('Por favor aguarde alguns segundos antes de atualizar novamente');
      }
      
      const response = await fetch('/api/books/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to refresh books');
      }
      
      const data = await response.json();
      setLastRefreshTime(now);
      return data;
    },
    onSuccess: (data) => {
      if (data.canRefresh) {
        // Apply enrichment to refreshed books
        const enrichedBooks = data.books.map(enrichBookData);
        queryClient.setQueryData(['/api/books/feed'], enrichedBooks);
        toast({
          title: "Livros atualizados!",
          description: "Novos livros foram carregados para você.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Aguarde um momento",
        description: error.message || "Por favor aguarde alguns segundos antes de atualizar novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Book sets for rotation (removed - using API now)
  const oldBookSets = [
    // Set 0 - Initial books
    [
      {
        id: 1,
        title: "O Poder do Hábito",
        author: "Charles Duhigg",
        reward: "45",
        pages: 408,
        rating: 4.5,
        readTime: "8 min",
        isNew: false,
        difficulty: "Médio",
        color: "from-emerald-400 to-teal-500",
        slug: "o-poder-do-habito",
        synopsis: "Descubra como os hábitos funcionam e aprenda técnicas práticas para transformar sua rotina e alcançar seus objetivos com mais facilidade."
      },
      {
        id: 2,
        title: "Mindset",
        author: "Carol S. Dweck",
        reward: "38",
        pages: 312,
        rating: 4.7,
        readTime: "5 min",
        isNew: true,
        difficulty: "Fácil",
        color: "from-violet-400 to-purple-500",
        slug: "mindset",
        synopsis: "Explore a diferença entre mentalidade fixa e de crescimento, e como isso impacta diretamente seu sucesso pessoal e profissional."
      },
      {
        id: 3,
        title: "Como Fazer Amigos",
        author: "Dale Carnegie",
        reward: "42",
        pages: 256,
        rating: 4.8,
        readTime: "6 min",
        isNew: false,
        difficulty: "Fácil",
        color: "from-blue-400 to-indigo-500",
        slug: "como-fazer-amigos",
        synopsis: "Aprenda técnicas infalíveis para melhorar seus relacionamentos, influenciar pessoas positivamente e construir conexões duradouras."
      },
    ],
    // Set 1 - Second rotation
    [
      {
        id: 4,
        title: "Rápido e Devagar",
        author: "Daniel Kahneman",
        reward: "48",
        pages: 512,
        rating: 4.6,
        readTime: "10 min",
        isNew: true,
        difficulty: "Difícil",
        color: "from-orange-400 to-red-500",
        slug: "rapido-e-devagar",
        synopsis: "Entenda como sua mente toma decisões, os vieses cognitivos que afetam seu julgamento e como pensar de forma mais racional."
      },
      {
        id: 5,
        title: "Pai Rico, Pai Pobre",
        author: "Robert Kiyosaki",
        reward: "40",
        pages: 336,
        rating: 4.4,
        readTime: "7 min",
        isNew: false,
        difficulty: "Médio",
        color: "from-yellow-400 to-amber-500",
        slug: "pai-rico-pai-pobre",
        synopsis: "Aprenda lições fundamentais sobre educação financeira, investimentos e como fazer o dinheiro trabalhar para você."
      },
      {
        id: 6,
        title: "A Arte da Guerra",
        author: "Sun Tzu",
        reward: "35",
        pages: 160,
        rating: 4.3,
        readTime: "5 min",
        isNew: false,
        difficulty: "Fácil",
        color: "from-gray-400 to-slate-500",
        slug: "a-arte-da-guerra",
        synopsis: "Estratégias milenares de liderança e tática que podem ser aplicadas nos negócios e na vida pessoal."
      },
    ],
    // Set 2 - Third rotation  
    [
      {
        id: 7,
        title: "O Monge e o Executivo",
        author: "James C. Hunter",
        reward: "43",
        pages: 144,
        rating: 4.5,
        readTime: "6 min",
        isNew: true,
        difficulty: "Fácil",
        color: "from-cyan-400 to-blue-500",
        slug: "o-monge-e-o-executivo",
        synopsis: "Uma história transformadora sobre liderança servidora e como desenvolver relações saudáveis no trabalho."
      },
      {
        id: 8,
        title: "Os 7 Hábitos",
        author: "Stephen Covey",
        reward: "47",
        pages: 432,
        rating: 4.8,
        readTime: "9 min",
        isNew: false,
        difficulty: "Médio",
        color: "from-pink-400 to-rose-500",
        slug: "os-7-habitos",
        synopsis: "Desenvolva hábitos fundamentais para alcançar eficácia pessoal e profissional de forma sustentável."
      },
      {
        id: 9,
        title: "Quem Pensa Enriquece",
        author: "Napoleon Hill",
        reward: "44",
        pages: 360,
        rating: 4.7,
        readTime: "8 min",
        isNew: false,
        difficulty: "Médio",
        color: "from-green-400 to-emerald-500",
        slug: "quem-pensa-enriquece",
        synopsis: "Descubra os 13 passos comprovados para alcançar riqueza e sucesso através do poder do pensamento."
      },
    ],
  ];
  
  // Books now come from the API query above
  
  // Removed withdraw function - replaced with automatic redirect after 3 books
  
  const handleSelectPlan = async (plan: 'free' | 'premium') => {
    await userDataManager.selectPlan(plan);
    await userDataManager.loadUserData();
    const updatedData = userDataManager.getUserData();
    setUserData(updatedData);
  };
  
  const handleStartReading = (slug: string) => {
    playSound('click');
    
    // If user completed 3 books and is on free plan, redirect to onboarding
    if (userData?.stats?.totalBooksRead && userData.stats.totalBooksRead >= 3 && userData?.selectedPlan !== 'premium') {
      setLocation('/onboarding-complete');
      return;
    }
    
    setLocation(`/book/${slug}`);
  };
  
  const handleRefreshBooks = async () => {
    playSound('click');
    refreshBooksMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/20 to-white">
      {/* Elegant Header with subtle color */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-100/50">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-700 font-semibold uppercase tracking-wide">Sexta, 4 de Janeiro</p>
              <h1 className="text-lg font-semibold text-gray-900 mt-0.5">Olá, <span className="font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">{getUserFirstName()}</span></h1>
            </div>
            <button
              onClick={() => {
                playSound('click');
                // Clear user data on logout
                userDataManager.clearUserData();
                setLocation("/");
              }}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-8">
        {/* Balance Section with gradient accent */}
        <section className="px-5 py-6 bg-gradient-to-br from-green-50/50 via-white to-emerald-50/30">
          <div className="mb-2">
            <p className="text-xs text-gray-700 font-semibold uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-green-600" />
              Saldo Disponível
            </p>
          </div>
          
          <div className="flex items-baseline gap-3 mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-gray-700">R$</span>
              <span className="text-4xl font-bold text-gray-900 tracking-tight" data-testid="text-balance">
                {showBalance ? balance : hiddenBalance}
              </span>
            </div>
            <button
              onClick={() => {
                playSound('click');
                setShowBalance(!showBalance);
              }}
              className="p-1.5 text-green-600/60 hover:text-green-700 transition-colors"
              data-testid="button-toggle-balance"
            >
              {showBalance ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Quick Stats with color */}
          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-xs text-gray-700 font-semibold uppercase">Este Mês</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">
                <span className="text-green-500">↑</span> R$ {userData?.stats.monthEarnings.toFixed(2).replace('.', ',') || '0,00'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-700 font-semibold uppercase">Livros Lidos</p>
              <p className="text-base font-bold text-emerald-500 mt-0.5">{userData?.stats.totalBooksRead || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-700 font-semibold uppercase">Avaliação</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="text-base font-bold text-gray-900">{userData?.stats.averageRating?.toFixed(1) || '0.0'}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Withdraw Button with gradient */}
          <button
            onClick={() => {
              playSound('click');
              // Check if user has completed minimum activities
              if (!userData?.stats?.totalBooksRead || userData.stats.totalBooksRead < 3) {
                toast({
                  title: "Complete as atividades primeiro",
                  description: "Você precisa completar 3 livros antes de poder sacar.",
                  variant: "destructive"
                });
                return;
              }
              // If user completed 3 books and is on free plan, redirect to onboarding
              if (userData?.selectedPlan !== 'premium') {
                setLocation('/onboarding-complete');
              } else {
                setLocation('/carteira');
              }
            }}
            disabled={!userData?.stats?.totalBooksRead || userData.stats.totalBooksRead < 3}
            className={`w-full py-3.5 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
              !userData?.stats?.totalBooksRead || userData.stats.totalBooksRead < 3
                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                : `bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:shadow-lg ${
                    userData?.canWithdraw ? 'animate-pulse ring-2 ring-green-400 ring-offset-2' : ''
                  }`
            }`}
            data-testid="button-withdraw"
          >
            {!userData?.stats?.totalBooksRead || userData.stats.totalBooksRead < 3 ? (
              <>
                Sacar saldo (Complete {3 - (userData?.stats?.totalBooksRead || 0)} livros)
              </>
            ) : (
              <>
                Sacar saldo
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </>
            )}
          </button>
        </section>

        {/* Welcome Message with color accent */}
        <section className="px-5 py-4 border-b border-green-100 bg-gradient-to-r from-transparent via-green-100/30 to-transparent">
          {userData?.stats?.totalBooksRead && userData.stats.totalBooksRead >= 3 ? (
            // Show completion message for users who finished 3 books
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  <span className="text-green-500 font-semibold">Você completou</span> todas suas atividades
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Confirme sua conta para continuar trabalhando e sacar seus ganhos!
                </p>
              </div>
              {userData?.selectedPlan !== 'premium' && (
                <button
                  onClick={() => {
                    playSound('click');
                    setLocation('/onboarding-complete');
                  }}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg"
                  data-testid="button-confirm-account"
                >
                  Confirmar conta
                </button>
              )}
            </div>
          ) : (
            // Show default message for new users
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-base font-semibold text-gray-900">
                  <span className="text-green-500 font-semibold">3 novas</span> atividades disponíveis
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Continue lendo para aumentar seus ganhos
                </p>
              </div>
              <button
                onClick={() => {
                  playSound('click');
                }}
                className={`p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg transition-all ${
                  userData?.stats?.totalBooksRead && userData.stats.totalBooksRead >= 3 
                    ? 'hover:from-green-200 hover:to-emerald-200 cursor-pointer'
                    : 'cursor-default'
                }`}
              >
                <TrendingUp className="h-4 w-4 text-green-600" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </section>

        {/* Books Section with colorful cards */}
        <section className="px-5 py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Livros disponíveis</h2>
            <button 
              onClick={handleRefreshBooks}
              disabled={refreshBooksMutation.isPending}
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-refresh-books"
            >
              {refreshBooksMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Atualizar livros
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {isLoadingBooks ? (
              // Show skeleton loaders while loading
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-16 h-16 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : books.length === 0 ? (
              // Show message when no books available
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Nenhum livro disponível no momento</p>
                <p className="text-gray-500 text-sm mt-1">Clique em atualizar para carregar novos livros</p>
              </div>
            ) : (
              // Render books
              books.map((book: any, index: number) => {
              const isCompleted = userDataManager.isBookCompleted(book.slug);
              
              // Determinar qual livro deve ter destaque
              const completedBooksCount = books.filter(b => userDataManager.isBookCompleted(b.slug)).length;
              const shouldHighlight = !isCompleted && index === completedBooksCount && completedBooksCount < 3;
              
              return (
              <div
                key={book.id}
                className={`group bg-white border-2 rounded-2xl p-4 transition-all overflow-hidden relative ${
                  isCompleted
                    ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60'
                    : shouldHighlight 
                      ? 'border-green-400 shadow-lg shadow-green-200/50 animate-pulse-border'
                      : 'border-gray-200 hover:border-green-300 cursor-pointer hover:shadow-md'
                }`}
                data-testid={`card-book-${book.id}`}
              >
                {/* Highlight glow effect */}
                {shouldHighlight && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-emerald-400/10 to-green-400/10 animate-shimmer pointer-events-none" />
                )}
                {/* Subtle gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-r ${book.color} ${isCompleted ? 'opacity-[0.01]' : 'opacity-[0.03] group-hover:opacity-[0.06]'} transition-opacity`}></div>
                
                {/* Payment completed overlay */}
                {isCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300">
                      <p className="text-sm font-semibold">PAGAMENTO EFETUADO</p>
                    </div>
                  </div>
                )}
                
                <div className="relative flex gap-4">
                  {/* Book Icon with gradient */}
                  <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${book.color} opacity-90 rounded-xl flex items-center justify-center shadow-sm`}>
                    <BookOpen className="h-5 w-5 text-white" strokeWidth={1.5} />
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900">
                          {book.title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {book.author}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-900">
                          R$ {Number(book.reward).toFixed(2).replace('.', ',')}
                        </p>
                        {book.isNew && (
                          <span className="text-[10px] text-violet-600 font-semibold">NOVO</span>
                        )}
                      </div>
                    </div>

                    {/* Synopsis */}
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {book.synopsis}
                    </p>

                    {/* Meta Info with colors */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" strokeWidth={1.5} />
                        <span className="text-xs text-gray-700 font-medium">{book.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" strokeWidth={1.5} />
                        <span className="text-xs text-gray-700 font-medium">{book.readTime}</span>
                      </div>
                      <div className="ml-auto">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          book.difficulty === 'Fácil' ? 'bg-green-100 text-green-700' : 
                          book.difficulty === 'Médio' ? 'bg-amber-100 text-amber-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {book.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Area */}
                {!isCompleted && (
                  <div className="relative mt-3 pt-3 border-t border-gray-50">
                    <button 
                      onClick={() => handleStartReading(book.slug)}
                      className="w-full text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all rounded-xl flex items-center justify-center gap-1.5 py-3.5 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 border-b-4 border-green-700 hover:border-green-800">
                    Começar leitura
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
            );
            })
            )}
          </div>
        </section>

        {/* Achievement Section with color */}
        <section className="px-5 py-4 border-t border-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-700 font-semibold uppercase">Progresso Mensal</p>
              <p className="text-xs text-gray-600 mt-1">{userData?.stats.monthlyProgress?.toFixed(0) || 0}% da meta concluída</p>
            </div>
            <div className="flex-1 max-w-[120px] ml-4">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm"
                  style={{ width: `${userData?.stats.monthlyProgress || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Analytics Section */}
        <section className="px-5 py-6 bg-gradient-to-b from-gray-50/50 to-white">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Análise da Conta</h2>
            <button className="text-xs text-green-600 hover:text-green-700 transition-colors font-semibold">
              Ver detalhes →
            </button>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Daily Earnings Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600" strokeWidth={2} />
                </div>
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">+23%</span>
              </div>
              <p className="text-xs text-gray-700 font-semibold uppercase mb-1">Ganho Hoje</p>
              <p className="text-2xl font-bold text-gray-900">R$ {userData?.stats.todayEarnings.toFixed(2).replace('.', ',') || '0,00'}</p>
              <p className="text-xs text-gray-600 mt-1">{userData?.stats.todayBooksRead || 0} livros lidos</p>
            </div>
            
            {/* Weekly Goal Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
                  <Target className="h-4 w-4 text-purple-600" strokeWidth={2} />
                </div>
                <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">Meta</span>
              </div>
              <p className="text-xs text-gray-700 font-semibold uppercase mb-1">Meta Semanal</p>
              <p className="text-2xl font-bold text-gray-900">R$ {userData?.stats.weeklyGoal || 500}</p>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Progresso</span>
                  <span className="text-xs font-medium text-purple-600">{userData?.stats.weeklyProgress?.toFixed(0) || 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    style={{ width: `${userData?.stats.weeklyProgress || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chart */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-900">Ganhos dos Últimos 7 Dias</p>
                <p className="text-xs text-gray-500 mt-0.5">Total: R$ {userData?.stats.weekEarnings.toFixed(2).replace('.', ',') || '0,00'}</p>
              </div>
              <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                <BarChart3 className="h-4 w-4 text-green-600" strokeWidth={2} />
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart
                data={userData?.stats.lastSevenDays || []}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="dia" 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  hide
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`R$ ${value}`, 'Ganho']}
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fill="url(#colorGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-3 text-center">
              <Calendar className="h-4 w-4 text-green-600 mx-auto mb-2" strokeWidth={2} />
              <p className="text-xs text-gray-600 font-medium">Este Mês</p>
              <p className="text-base font-bold text-gray-900">R$ {userData?.stats.monthEarnings.toFixed(0) || 0}</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 text-center">
              <BookOpen className="h-4 w-4 text-blue-600 mx-auto mb-2" strokeWidth={2} />
              <p className="text-xs text-gray-600 font-medium">Total Lidos</p>
              <p className="text-base font-bold text-gray-900">{userData?.stats.totalBooksRead || 0}</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 text-center">
              <Star className="h-4 w-4 text-purple-600 mx-auto mb-2" strokeWidth={2} />
              <p className="text-xs text-gray-600 font-medium">Avaliação</p>
              <p className="text-base font-bold text-gray-900">{userData?.stats.averageRating?.toFixed(1) || '0.0'}</p>
            </div>
          </div>
        </section>
        
      </main>
      
      {/* Modals */}
      <WithdrawModal 
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        booksRead={userData?.stats.totalBooksRead || 0}
      />
      
      <PlanModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onSelectPlan={handleSelectPlan}
      />
      
      <CompleteBooksModal
        isOpen={showCompleteBooksModal}
        onClose={() => setShowCompleteBooksModal(false)}
        booksRead={userData?.stats?.totalBooksRead || 0}
      />
      
      <FreeChoiceModal
        isOpen={showFreeChoiceModal}
        onClose={() => setShowFreeChoiceModal(false)}
      />
      
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userName={userData?.fullName}
      />
      
      
      {/* Friend Notifications - shows after first book completed */}
      {/* Temporariamente desativado para evitar sons sem notificações visuais
      <FriendNotifications 
        booksCompleted={userData?.stats?.totalBooksRead || 0}
        onNotificationClick={() => {
          // User clicked a notification, they will be redirected to profile
        }}
      />
      */}
      
      {/* First Reward Popup */}
      {showFirstRewardPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 pb-24 relative max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full blur-3xl opacity-50 -translate-y-32 translate-x-32 pointer-events-none"></div>
            
            <button
              onClick={() => {
                playSound('click');
                setShowFirstRewardPopup(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
              data-testid="button-close-first-reward"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            
            <div className="relative">
              <div className="flex justify-center mb-6">
                <img 
                  src="/logo-beta-reader.png" 
                  alt="Beta Reader Brasil" 
                  className="h-20 w-auto"
                />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                Parabéns! 🎉
              </h2>
              
              <p className="text-gray-600 text-center mb-6">
                Você completou seu <span className="font-semibold text-green-600">primeiro livro</span> com sucesso!
              </p>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-700 mb-2">
                    Sua primeira recompensa de
                  </p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                    R$ {userData?.booksCompleted?.[0]?.reward || '0'},00
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    já foi creditada ao seu saldo!
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-50 rounded-xl p-3 mb-6">
                <p className="text-xs text-center text-amber-700">
                  <Sparkles className="inline h-3 w-3 mr-1" />
                  Continue lendo para aumentar seus ganhos!
                </p>
              </div>
              
              <button
                onClick={() => {
                  playSound('click');
                  setShowFirstRewardPopup(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
                data-testid="button-continue-dashboard"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}