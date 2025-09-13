import { useState, useEffect } from "react";
import { Wallet, ArrowUpRight, TrendingUp, Eye, EyeOff, Calendar, Download, DollarSign, Target, Activity, BarChart3, ChevronRight, Clock, BookOpen, Trophy, Star, Settings, X, CreditCard, Send, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useSound } from "@/hooks/useSound";
import { userDataManager, type UserData } from "@/utils/userDataManager";
import WithdrawModal from "@/components/WithdrawModal";
import PlanModal from "@/components/PlanModal";
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
  const [showCompleteBooksModal, setShowCompleteBooksModal] = useState(false);
  const [showBankWithdrawModal, setShowBankWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixCpf, setPixCpf] = useState('');
  const [showPlanRequiredModal, setShowPlanRequiredModal] = useState(false);
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
    setShowBankWithdrawModal(true);
  };

  const handleBankTransfer = () => {
    playSound('click');
    
    // Validate withdrawal amount
    const amountStr = withdrawAmount.replace(',', '.');
    const amount = parseFloat(amountStr);
    
    if (!amount || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para o saque.",
        variant: "destructive",
      });
      return;
    }
    
    if (amount > balance) {
      toast({
        title: "Saldo insuficiente",
        description: `Você não pode sacar mais do que seu saldo disponível de R$ ${balance.toFixed(2).replace('.', ',')}.`,
        variant: "destructive",
      });
      return;
    }
    
    if (!pixCpf || pixCpf.replace(/\D/g, '').length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido para a chave PIX.",
        variant: "destructive",
      });
      return;
    }
    
    setShowBankWithdrawModal(false);
    // Redirect directly to onboarding-complete (new PIX flow)
    setLocation('/onboarding-complete');
  };

  const handlePlanRequiredContinue = () => {
    playSound('click');
    setShowPlanRequiredModal(false);
    // Redirect to new onboarding complete flow
    setLocation('/onboarding-complete');
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = (parseInt(numbers) / 100).toFixed(2);
    return `R$ ${amount.replace('.', ',')}`;
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
                onClick={() => {
                  playSound('click');
                  // Global guard in App.tsx handles redirection after 3 books
                  setLocation('/livros');
                }}
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
      
      
      <CompleteBooksModal
        isOpen={showCompleteBooksModal}
        onClose={() => setShowCompleteBooksModal(false)}
        booksRead={userData?.stats?.totalBooksRead || 0}
      />

      {/* Plan Required Modal */}
      {showPlanRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPlanRequiredModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-6">
            <div className="text-center space-y-4">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="h-8 w-8 text-amber-600" />
              </div>
              
              {/* Message */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Plano Necessário</h3>
                <p className="text-sm text-gray-600">
                  Você precisa de um plano para realizar Saques em sua conta.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPlanRequiredModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  data-testid="button-cancel-plan-required"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePlanRequiredContinue}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
                  data-testid="button-continue-plan-required"
                >
                  Ver Planos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Transfer Modal */}
      {showBankWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBankWithdrawModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-5 rounded-t-2xl border-b border-green-100">
              <button
                onClick={() => setShowBankWithdrawModal(false)}
                className="absolute right-4 top-4 p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Transferência PIX</h2>
              </div>
              <p className="text-xs text-gray-600 mt-1">Realize seu saque de forma segura</p>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Current Balance Display */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Saldo disponível</p>
                <p className="text-2xl font-bold text-gray-900">
                  {showBalance ? `R$ ${balance.toFixed(2)}` : '••••••'}
                </p>
              </div>

              {/* Withdrawal Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor do saque
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    R$
                  </span>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value) {
                        const amount = (parseInt(value) / 100).toFixed(2);
                        const numericAmount = parseFloat(amount);
                        // Check if amount exceeds balance while typing
                        if (numericAmount > balance) {
                          // Don't update if it exceeds balance
                          return;
                        }
                        setWithdrawAmount(`${amount.replace('.', ',')}`);
                      } else {
                        setWithdrawAmount('');
                      }
                    }}
                    className="w-full pl-12 pr-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>
                {withdrawAmount && parseFloat(withdrawAmount.replace(',', '.')) > balance && (
                  <p className="text-xs text-red-500 mt-1">
                    Valor maior que o saldo disponível
                  </p>
                )}
                {(!withdrawAmount || parseFloat(withdrawAmount.replace(',', '.')) <= balance) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Digite o valor que deseja sacar
                  </p>
                )}
              </div>

              {/* PIX CPF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave PIX (CPF)
                </label>
                <input
                  type="text"
                  value={pixCpf}
                  onChange={(e) => setPixCpf(formatCPF(e.target.value))}
                  maxLength={14}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="000.000.000-00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informe o CPF cadastrado como chave PIX
                </p>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-blue-900">Transferência segura</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Sua transferência será processada com total segurança através do sistema PIX do Banco Central.
                    </p>
                  </div>
                </div>
              </div>

              {/* Transfer Button */}
              <button
                onClick={handleBankTransfer}
                className="w-full py-4 px-6 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-2xl shadow-[0_4px_0_0_rgb(34,197,94,0.5)] hover:shadow-[0_2px_0_0_rgb(34,197,94,0.5)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0_0_0_rgb(34,197,94,0.5)] transition-all duration-150 flex items-center justify-center gap-2"
                data-testid="button-transfer"
              >
                <Send className="h-5 w-5" />
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}