import { useState, useEffect } from "react";
import { Wallet, ArrowUpRight, TrendingUp, Eye, EyeOff, Calendar, Download, DollarSign, Target, Activity, BarChart3, ChevronRight, Clock, BookOpen, Trophy, Star, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useSound } from "@/hooks/useSound";
import { userDataManager, type UserData } from "@/utils/userDataManager";
import WithdrawModal from "@/components/WithdrawModal";
import PlanModal from "@/components/PlanModal";
import { PlanLimitationsModal } from "@/components/PlanLimitationsModal";
import { CompleteBooksModal } from "@/components/CompleteBooksModal";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";

export default function WalletPage() {
  const [, setLocation] = useLocation();
  const { playSound } = useSound();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(500);
  const [tempGoal, setTempGoal] = useState(500);
  const [isLoading, setIsLoading] = useState(true);
  const [showLimitationsModal, setShowLimitationsModal] = useState(false);
  const [showCompleteBooksModal, setShowCompleteBooksModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Load fresh data from database
      await userDataManager.loadUserData();
      const data = userDataManager.getUserData();
      setUserData(data);
      setMonthlyGoal(data?.monthlyGoal || 500);
      setTempGoal(data?.monthlyGoal || 500);
      setIsLoading(false);
    };
    
    loadData();
    
    // Reload data when page becomes visible
    const handleFocus = () => {
      loadData();
    };
    
    // Auto-refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const balance = userData?.balance || 0;
  const monthEarnings = userData?.stats.monthEarnings || 0;
  const totalBooksRead = userData?.stats.totalBooksRead || 0;
  const weekBooksRead = userData?.stats.weekBooksRead || 0;
  const todayEarnings = userData?.stats.todayEarnings || 0;
  const weekEarnings = userData?.stats.weekEarnings || 0;
  const monthlyProgress = (monthEarnings / monthlyGoal) * 100;
  
  const canWithdraw = totalBooksRead >= 3;

  const transactions = userData?.transactions.slice(-10).reverse() || [];

  const handleWithdraw = () => {
    playSound('click');
    
    // Show upgrade modal for free users
    if (!userData?.selectedPlan || userData.selectedPlan === 'free') {
      // Check if user has read 3 books before showing upgrade modal
      const totalBooksRead = userData?.stats?.totalBooksRead || 0;
      if (totalBooksRead >= 3) {
        setShowLimitationsModal(true);
      } else {
        setShowCompleteBooksModal(true);
      }
      return;
    }
    
    if (!canWithdraw) {
      alert(`Você precisa ler ${3 - totalBooksRead} livro(s) antes de fazer um saque`);
      return;
    }
    setIsWithdrawModalOpen(true);
  };

  const handleWithdrawConfirm = () => {
    playSound('click');
    setIsWithdrawModalOpen(false);
    setIsPlanModalOpen(true);
  };

  const handlePlanSelect = (plan: string) => {
    playSound('reward');
    setIsPlanModalOpen(false);
    userDataManager.selectPlan(plan);
    const updatedData = userDataManager.getUserData();
    setUserData(updatedData);
  };

  const handleSaveGoal = async () => {
    playSound('click');
    await userDataManager.updateMonthlyGoal(tempGoal);
    setMonthlyGoal(tempGoal);
    setShowGoalModal(false);
    // Reload data from database to ensure consistency
    await userDataManager.loadUserData();
    const updatedData = userDataManager.getUserData();
    setUserData(updatedData);
  };

  const pieData = [
    { name: 'Ganho Hoje', value: todayEarnings, color: '#10B981' },
    { name: 'Resto da Semana', value: weekEarnings - todayEarnings, color: '#34D399' },
    { name: 'Falta para Meta', value: Math.max(0, monthlyGoal - monthEarnings), color: '#E5E7EB' }
  ];

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = daysInMonth - currentDay;
  const dailyGoal = (monthlyGoal - monthEarnings) / Math.max(1, daysRemaining);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Carteira Digital</h1>
              <p className="text-xs text-gray-600 mt-1">
                Gerencie seus ganhos e metas
              </p>
            </div>
            <button
              onClick={() => setLocation('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Balance Card */}
      <div className="px-5 py-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Wallet className="h-5 w-5" />
                </div>
                <p className="text-xs text-white/90 font-semibold uppercase tracking-wide">Saldo Disponível</p>
              </div>
              <button
                onClick={() => {
                  setShowBalance(!showBalance);
                  playSound('click');
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                data-testid="button-toggle-balance"
              >
                {showBalance ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="mb-6">
              {showBalance ? (
                <div>
                  <p className="text-4xl font-bold">
                    R$ {balance.toFixed(2).replace('.', ',')}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3 w-3" />
                    <p className="text-xs text-white/80">
                      +R$ {todayEarnings.toFixed(2).replace('.', ',')} hoje
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-4xl font-bold">R$ ••••</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWithdraw}
                className="py-3 bg-white text-green-600 font-semibold rounded-2xl hover:bg-gray-100 transition-all shadow-lg flex items-center justify-center gap-2"
                data-testid="button-withdraw-wallet"
              >
                <ArrowUpRight className="h-4 w-4" />
                Sacar
              </button>
              <button
                onClick={() => setLocation('/livros')}
                className="py-3 bg-white/20 text-white font-semibold rounded-2xl hover:bg-white/30 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Ler Mais
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Goal Section */}
      <section className="px-5 pb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                <Target className="h-4 w-4 text-purple-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Meta Mensal</h3>
                <p className="text-xs text-gray-600">R$ {monthlyGoal.toFixed(0)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowGoalModal(true)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700 font-medium">Progresso</span>
                <span className="text-xs font-bold text-gray-900">
                  {monthlyProgress.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, monthlyProgress)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center">
                <p className="text-xs text-gray-700 font-semibold uppercase">Conquistado</p>
                <p className="text-lg font-bold text-green-600">
                  R$ {monthEarnings.toFixed(0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-700 font-semibold uppercase">Faltam</p>
                <p className="text-lg font-bold text-gray-900">
                  R$ {Math.max(0, monthlyGoal - monthEarnings).toFixed(0)}
                </p>
              </div>
            </div>

            {monthlyProgress < 100 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-600 text-center">
                  Leia <span className="font-bold">R$ {dailyGoal.toFixed(2)}</span> por dia para alcançar sua meta
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Analytics Charts */}
      <section className="px-5 pb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Análise de Ganhos</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
        {/* Weekly Chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Últimos 7 Dias</h3>
            <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
              <BarChart3 className="h-4 w-4 text-green-600" strokeWidth={2} />
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={180}>
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
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
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

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-600">Média</p>
              <p className="text-sm font-bold text-gray-900">
                R$ {(weekEarnings / 7).toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-sm font-bold text-green-600">
                R$ {weekEarnings.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">Melhor</p>
              <p className="text-sm font-bold text-gray-900">
                R$ {Math.max(...(userData?.stats.lastSevenDays.map(d => d.valor) || [0])).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribuição do Mês</h3>
          
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 mt-4">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-gray-700">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">
                  R$ {item.value.toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
          </div>
        </div>
          </>
        )}
      </section>

      {/* Quick Stats */}
      <section className="px-5 pb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Estatísticas Rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                <Activity className="h-4 w-4 text-green-600" strokeWidth={2} />
              </div>
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                +23%
              </span>
            </div>
            <p className="text-xs text-gray-700 font-semibold uppercase">Ganho Hoje</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              R$ {todayEarnings.toFixed(2).replace('.', ',')}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" strokeWidth={2} />
              </div>
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                Semana
              </span>
            </div>
            <p className="text-xs text-gray-700 font-semibold uppercase">Esta Semana</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              R$ {weekEarnings.toFixed(2).replace('.', ',')}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg">
                <BookOpen className="h-4 w-4 text-purple-600" strokeWidth={2} />
              </div>
              <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
                Semana
              </span>
            </div>
            <p className="text-xs text-gray-700 font-semibold uppercase">Livros na Semana</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{weekBooksRead}</p>
            <p className="text-xs text-gray-500 mt-1">Total: {totalBooksRead}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                <Star className="h-4 w-4 text-amber-600" strokeWidth={2} />
              </div>
              <span className="text-xs text-amber-600 font-medium">
                {userData?.stats.averageRating?.toFixed(1) || '0.0'}
              </span>
            </div>
            <p className="text-xs text-gray-700 font-semibold uppercase">Avaliação</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {userData?.stats.averageRating?.toFixed(1) || '0.0'} ⭐
            </p>
          </div>
        </div>
      </section>

      {/* Transactions */}
      <section className="px-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Histórico</h2>
          <button className="text-xs text-green-600 hover:text-green-700 transition-colors font-semibold">
            Ver todos →
          </button>
        </div>

        <div className="space-y-3">
          {transactions.length > 0 ? (
            transactions.map((transaction, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-xl ${
                      transaction.type === 'earning' 
                        ? 'bg-gradient-to-br from-green-100 to-emerald-100' 
                        : transaction.type === 'bonus'
                        ? 'bg-gradient-to-br from-purple-100 to-indigo-100'
                        : 'bg-gradient-to-br from-amber-100 to-orange-100'
                    }`}>
                      {transaction.type === 'earning' ? (
                        <BookOpen className="h-4 w-4 text-green-600" strokeWidth={2} />
                      ) : transaction.type === 'bonus' ? (
                        <Trophy className="h-4 w-4 text-purple-600" strokeWidth={2} />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-600" strokeWidth={2} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(transaction.date).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-green-600">
                      +R$ {transaction.amount.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Nenhuma transação ainda</p>
              <p className="text-xs text-gray-500 mt-1">Comece a ler para ver seu histórico</p>
            </div>
          )}
        </div>
      </section>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Definir Meta Mensal</h3>
            <p className="text-sm text-gray-600 mb-6">
              Quanto você quer ganhar este mês?
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-700 font-semibold uppercase block mb-2">
                  Valor da Meta (R$)
                </label>
                <input
                  type="number"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  min="100"
                  max="5000"
                  step="50"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTempGoal(300)}
                  className="py-2 px-3 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200"
                >
                  R$ 300
                </button>
                <button
                  onClick={() => setTempGoal(500)}
                  className="py-2 px-3 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200"
                >
                  R$ 500
                </button>
                <button
                  onClick={() => setTempGoal(1000)}
                  className="py-2 px-3 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200"
                >
                  R$ 1000
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGoalModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        booksRead={totalBooksRead}
      />

      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSelectPlan={handlePlanSelect}
      />
      
      <PlanLimitationsModal
        isOpen={showLimitationsModal}
        onClose={() => setShowLimitationsModal(false)}
      />
      
      <CompleteBooksModal
        isOpen={showCompleteBooksModal}
        onClose={() => setShowCompleteBooksModal(false)}
        booksRead={userData?.stats?.totalBooksRead || 0}
      />
    </div>
  );
}