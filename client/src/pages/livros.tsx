import { useState, useEffect } from "react";
import { BookOpen, Star, Clock, Lock, Crown, AlertCircle, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useSound } from "@/hooks/useSound";
import { userDataManager, type UserData } from "@/utils/userDataManager";
import MobileNav from "@/components/MobileNav";
import { PlanLimitationsModal } from "@/components/PlanLimitationsModal";
import { CompleteBooksModal } from "@/components/CompleteBooksModal";

export default function Livros() {
  const [, setLocation] = useLocation();
  const { playSound } = useSound();
  const [showLimitationsModal, setShowLimitationsModal] = useState(false);
  const [showCompleteBooksModal, setShowCompleteBooksModal] = useState(false);
  const [showActivityWarning, setShowActivityWarning] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Load fresh data from database
      await userDataManager.loadUserData();
      const data = userDataManager.getUserData();
      setUserData(data);
      setIsLoading(false);
    };
    
    loadData();
    
    // Reload data when page becomes visible
    const handleFocus = () => {
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  const completedBooksToday = userData?.booksCompleted.filter(book => {
    const bookDate = new Date(book.completedAt).toDateString();
    const today = new Date().toDateString();
    return bookDate === today;
  }).length || 0;
  
  const totalBooksCompleted = userData?.stats.totalBooksRead || 0;
  const hasCompletedActivities = totalBooksCompleted >= 3;
  const canReadMore = userData?.selectedPlan === 'premium' || completedBooksToday < 3;

  const books = [
    {
      id: 1,
      slug: "o-poder-do-habito",
      title: "O Poder do Hábito",
      author: "Charles Duhigg",
      category: "Desenvolvimento Pessoal",
      rating: 4.8,
      reward: 45,
      readTime: "45 min",
      color: "from-purple-500 to-indigo-500"
    },
    {
      id: 2,
      slug: "mindset",
      title: "Mindset",
      author: "Carol S. Dweck",
      category: "Psicologia",
      rating: 4.7,
      reward: 38,
      readTime: "40 min",
      color: "from-pink-500 to-rose-500"
    },
    {
      id: 3,
      slug: "como-fazer-amigos",
      title: "Como Fazer Amigos",
      author: "Dale Carnegie",
      category: "Relacionamentos",
      rating: 4.9,
      reward: 42,
      readTime: "50 min",
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      slug: "o-milagre-da-manha",
      title: "O Milagre da Manhã",
      author: "Hal Elrod",
      category: "Produtividade",
      rating: 4.6,
      reward: 35,
      readTime: "35 min",
      color: "from-amber-500 to-orange-500"
    },
    {
      id: 5,
      slug: "pai-rico-pai-pobre",
      title: "Pai Rico, Pai Pobre",
      author: "Robert Kiyosaki",
      category: "Finanças",
      rating: 4.5,
      reward: 40,
      readTime: "42 min",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 6,
      slug: "o-poder-da-acao",
      title: "O Poder da Ação",
      author: "Paulo Vieira",
      category: "Motivação",
      rating: 4.4,
      reward: 33,
      readTime: "38 min",
      color: "from-red-500 to-pink-500"
    }
  ];

  const handleBookClick = (bookSlug: string) => {
    playSound('click');
    
    // Verifica se já leu este livro
    if (userDataManager.isBookCompleted(bookSlug)) {
      return;
    }
    
    // Verifica se completou as 3 atividades
    if (!hasCompletedActivities) {
      setShowActivityWarning(true);
      return;
    }
    
    // Verifica se atingiu o limite diário
    if (!canReadMore) {
      setShowLimitWarning(true);
      return;
    }
    
    // Pode ler o livro
    setLocation(`/book/${bookSlug}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/30 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-green-100 sticky top-0 z-10">
        <div className="px-5 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Biblioteca Premium</h1>
          <p className="text-xs text-gray-600 mt-1">
            Livros exclusivos para aumentar seus ganhos
          </p>
        </div>

        {/* Status Bar */}
        <div className="px-5 pb-3">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-700 font-semibold uppercase">Seu Plano</p>
                <p className="text-sm font-bold text-gray-900">
                  {userData?.selectedPlan === 'premium' ? (
                    <span className="flex items-center gap-1">
                      <Crown className="h-4 w-4 text-amber-500" />
                      Premium
                    </span>
                  ) : (
                    'Gratuito'
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-700 font-semibold uppercase">Lidos Hoje</p>
                <p className="text-sm font-bold text-gray-900">
                  {completedBooksToday}/
                  {userData?.selectedPlan === 'premium' ? '∞' : '3'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Warning Banner */}
      {!hasCompletedActivities && (
        <div className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Complete 3 atividades primeiro</p>
              <p className="text-xs text-amber-700 mt-1">
                Você precisa completar {3 - totalBooksCompleted} atividades da página inicial antes de acessar a biblioteca premium.
              </p>
            </div>
          </div>
        </div>
      )}

      {!canReadMore && hasCompletedActivities && (
        <div className="mx-5 mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex gap-3">
            <Crown className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-900">Limite diário atingido</p>
              <p className="text-xs text-purple-700 mt-1">
                No plano gratuito você pode ler até 3 livros por dia. Faça upgrade para Premium e leia ilimitado!
              </p>
              <button
                onClick={() => {
                  playSound('click');
                  // Check if user has read 3 books before showing upgrade modal
                  const totalBooksRead = userData?.stats?.totalBooksRead || 0;
                  if (totalBooksRead >= 3) {
                    setShowLimitationsModal(true);
                  } else {
                    setShowCompleteBooksModal(true);
                  }
                }}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold rounded-lg"
              >
                Ver Plano Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Books Grid */}
      <div className="px-5 py-6">
        <div className="grid gap-4">
          {books.map(book => {
            const isCompleted = userDataManager.isBookCompleted(book.slug);
            const isLocked = !hasCompletedActivities || (!canReadMore && !isCompleted);
            
            return (
              <div
                key={book.id}
                className={`relative bg-white border rounded-2xl p-4 transition-all ${
                  isCompleted 
                    ? 'border-gray-200 bg-gray-50/50 opacity-60'
                    : isLocked
                    ? 'border-gray-200 opacity-75'
                    : 'border-gray-200 hover:shadow-md cursor-pointer'
                }`}
                onClick={() => !isLocked && !isCompleted && handleBookClick(book.slug)}
                data-testid={`card-book-${book.id}`}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${book.color} ${
                  isCompleted || isLocked ? 'opacity-[0.02]' : 'opacity-5'
                } transition-opacity rounded-2xl`}></div>
                
                {/* Lock Overlay */}
                {isLocked && !isCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-white/95 p-3 rounded-xl shadow-lg">
                      <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-700">
                        {!hasCompletedActivities ? 'Complete 3 atividades' : 'Limite diário atingido'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Payment completed overlay */}
                {isCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300">
                      <p className="text-sm font-semibold">PAGAMENTO EFETUADO</p>
                    </div>
                  </div>
                )}
                
                <div className="relative">
                  {/* Book Icon */}
                  <div className={`float-left mr-4 w-14 h-20 bg-gradient-to-br ${book.color} rounded-lg flex items-center justify-center shadow-md`}>
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>

                  {/* Book Info */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{book.title}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">{book.author}</p>
                    <p className="text-xs text-gray-500 mt-1">{book.category}</p>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-semibold text-gray-700">{book.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">{book.readTime}</span>
                      </div>
                      <div className="ml-auto">
                        <p className="text-sm font-bold text-green-600">R$ {book.reward}</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  {!isCompleted && !isLocked && (
                    <div className="mt-4 pt-3 border-t border-gray-100 clear-both">
                      <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-2.5 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 text-sm">
                        Ler Agora
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Warning Modal */}
      {showActivityWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Complete as Atividades Primeiro
            </h2>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              Você precisa completar pelo menos 3 atividades da página inicial antes de acessar a biblioteca premium.
            </p>
            
            <p className="text-xs text-gray-700 font-semibold text-center mb-6">
              Atividades completadas: {totalBooksCompleted}/3
            </p>
            
            <button
              onClick={() => {
                playSound('click');
                setShowActivityWarning(false);
                setLocation('/dashboard');
              }}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
            >
              Ir para Atividades
            </button>
          </div>
        </div>
      )}

      {/* Limit Warning Modal */}
      {showLimitWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Limite Diário Atingido
            </h2>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              No plano gratuito você pode ler até 3 livros por dia. Você já leu {completedBooksToday} livros hoje.
            </p>
            
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-purple-900 mb-2">Plano Premium inclui:</p>
              <ul className="text-xs text-purple-700 space-y-1">
                <li>• Livros ilimitados por dia</li>
                <li>• Saques instantâneos</li>
                <li>• Bônus de 50% nos ganhos</li>
                <li>• Suporte prioritário</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  playSound('click');
                  setShowLimitWarning(false);
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setShowLimitWarning(false);
                  // Check if user has read 3 books before showing upgrade modal
                  const totalBooksRead = userData?.stats?.totalBooksRead || 0;
                  if (totalBooksRead >= 3) {
                    setShowLimitationsModal(true);
                  } else {
                    setShowCompleteBooksModal(true);
                  }
                }}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all"
              >
                Ver Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Upgrade Modal */}
      <PlanLimitationsModal
        isOpen={showLimitationsModal}
        onClose={() => setShowLimitationsModal(false)}
      />
      
      {/* Complete Books Modal */}
      <CompleteBooksModal
        isOpen={showCompleteBooksModal}
        onClose={() => setShowCompleteBooksModal(false)}
        booksRead={userData?.stats?.totalBooksRead || 0}
      />

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}