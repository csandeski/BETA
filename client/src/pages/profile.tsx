import { useState, useEffect } from "react";
import { User, Users, Settings, Star, Trophy, Target, TrendingUp, Shield, LogOut, ChevronRight, BookOpen, Clock, Award, Calendar, Activity, Zap, Crown, Phone, Mail, Lock, ArrowLeft, X } from "lucide-react";
import { useLocation } from "wouter";
import { useSound } from "@/hooks/useSound";
import { userDataManager, type UserData } from "@/utils/userDataManager";
import { apiClient } from "@/lib/api";
import PlanModal from "@/components/PlanModal";
import { PlanLimitationsModal } from "@/components/PlanLimitationsModal";
import { CompleteBooksModal } from "@/components/CompleteBooksModal";
import FriendsSection from "@/components/FriendsSection";
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { playSound } = useSound();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLimitationsModal, setShowLimitationsModal] = useState(false);
  const [showCompleteBooksModal, setShowCompleteBooksModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsData, setFriendsData] = useState<{friends: any[], onlineFriends: any[]}>({ friends: [], onlineFriends: [] });
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      // Load fresh data from database
      await userDataManager.loadUserData();
      const data = userDataManager.getUserData();
      setUserData(data);
      setTempName(data?.fullName || "");
      setTempEmail(data?.email || "");
      setTempPhone(data?.phone || "");
      
      // Load friends data
      try {
        const friendsResponse = await apiClient.getUserFriends();
        const onlineFriends = friendsResponse.filter((f: any) => f.onlineStatus?.isOnline);
        setFriendsData({ 
          friends: friendsResponse, 
          onlineFriends 
        });
      } catch (error) {
        console.error('Failed to load friends:', error);
      }
    };
    
    loadData();
    
    // Check if we should open friends modal from notification
    const shouldOpenFriends = localStorage.getItem('openFriendsModal') === 'true';
    if (shouldOpenFriends) {
      localStorage.removeItem('openFriendsModal');
      setTimeout(() => {
        setShowFriendsModal(true);
      }, 500);
    }
    
    // Reload data when page becomes visible
    const handleFocus = () => {
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleLogout = () => {
    playSound('click');
    if (confirm('Tem certeza que deseja sair da sua conta?')) {
      apiClient.logout();
      userDataManager.clearUserData();
      window.location.href = '/';
    }
  };

  const handleSaveProfile = async () => {
    playSound('click');
    
    // Validação de senha se for alterada
    if (tempPassword && tempPassword !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    
    if (userData) {
      const updatedUser = {
        ...userData,
        fullName: tempName,
        email: tempEmail,
        phone: tempPhone
      };
      await userDataManager.updateUserData(updatedUser);
      // Reload data from database to ensure consistency
      await userDataManager.loadUserData();
      const data = userDataManager.getUserData();
      setUserData(data);
      setShowEditModal(false);
      setTempPassword('');
      setConfirmPassword('');
    }
  };

  const handlePlanSelect = async (plan: string) => {
    playSound('reward');
    await userDataManager.selectPlan(plan);
    // Reload data from database to ensure consistency
    await userDataManager.loadUserData();
    const updatedData = userDataManager.getUserData();
    setUserData(updatedData);
    setShowPlanModal(false);
  };

  const getUserFirstName = () => {
    if (!userData) return "Leitor";
    const firstName = userData.fullName.split(' ')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  const memberSince = userData && userData.createdAt ? 
    new Date(userData.createdAt).toLocaleDateString('pt-BR', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    }) : 
    new Date().toLocaleDateString('pt-BR', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    });

  // Calculate reading speed based on actual time since registration
  const calculateReadingSpeed = () => {
    if (!userData?.stats.totalBooksRead || !userData?.createdAt) return '0';
    const registrationDate = new Date(userData.createdAt);
    const now = new Date();
    const monthsDiff = (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsDiff < 1) return userData.stats.totalBooksRead.toFixed(1);
    return (userData.stats.totalBooksRead / monthsDiff).toFixed(1);
  };
  const readingSpeed = calculateReadingSpeed();

  const radarData = [
    {
      subject: 'Velocidade',
      A: Math.min(100, (userData?.stats.totalBooksRead || 0) * 10),
      fullMark: 100,
    },
    {
      subject: 'Consistência',
      A: Math.min(100, (userData?.stats.streak || 0) * 20),
      fullMark: 100,
    },
    {
      subject: 'Avaliações',
      A: (userData?.stats.averageRating || 0) * 20,
      fullMark: 100,
    },
    {
      subject: 'Ganhos',
      A: Math.min(100, ((userData?.balance || 0) / 100) * 100),
      fullMark: 100,
    },
    {
      subject: 'Atividades',
      A: Math.min(100, (userData?.stats.totalActivities || 0) * 5),
      fullMark: 100,
    },
  ];

  const levelProgress = userData?.stats.totalBooksRead || 0;
  const currentLevel = Math.floor(levelProgress / 5) + 1;
  const progressToNextLevel = (levelProgress % 5) * 20;

  const achievements = [
    {
      icon: Trophy,
      title: "Primeira Leitura",
      description: "Complete seu primeiro livro",
      unlocked: (userData?.stats.totalBooksRead || 0) >= 1,
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: Star,
      title: "Crítico",
      description: "Média acima de 4.0",
      unlocked: (userData?.stats.averageRating || 0) >= 4.0,
      color: "from-purple-500 to-indigo-500"
    },
    {
      icon: Zap,
      title: "Leitor Veloz",
      description: "Leia 10 livros",
      unlocked: (userData?.stats.totalBooksRead || 0) >= 10,
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Crown,
      title: "Premium",
      description: "Membro Premium",
      unlocked: userData?.plan === 'premium',
      color: "from-green-500 to-emerald-500"
    }
  ];

  const pieData = [
    { name: 'Livros Fáceis', value: userData?.stats.easyBooksCount || 0, color: '#10B981' },
    { name: 'Livros Médios', value: userData?.stats.mediumBooksCount || 0, color: '#F59E0B' },
    { name: 'Livros Difíceis', value: userData?.stats.hardBooksCount || 0, color: '#EF4444' }
  ].filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Meu Perfil</h1>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="button-settings"
          >
            <Settings className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* Profile Section */}
      <section className="bg-white">
        <div className="px-5 py-6">
          {/* Profile Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center shadow-sm">
              <User className="h-10 w-10 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{userData?.fullName || 'Nome do Usuário'}</h2>
              <p className="text-sm text-gray-600 mt-1">{userData?.email || 'email@exemplo.com'}</p>
              {userData?.phone && (
                <p className="text-sm text-gray-600 mt-0.5">{userData.phone}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  userData?.plan === 'premium' 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {userData?.plan === 'premium' ? '⭐ Premium' : '📖 Plano Gratuito'}
                </span>
                <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                  Nível {currentLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{userData?.stats.totalBooksRead || 0}</p>
              <p className="text-xs text-gray-600">Livros Lidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">R$ {userData?.balance?.toFixed(0) || '0'}</p>
              <p className="text-xs text-gray-600">Saldo Atual</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{userData?.stats.averageRating ? Number(userData.stats.averageRating).toFixed(1) : '0.0'}</p>
              <p className="text-xs text-gray-600">Avaliação</p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-900">Progresso do Nível {currentLevel}</span>
              </div>
              <span className="text-xs text-gray-600">
                {userData?.stats.totalBooksRead || 0}/5 livros
              </span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                style={{ width: `${progressToNextLevel}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              Leia mais {5 - (levelProgress % 5)} livros para alcançar o nível {currentLevel + 1}
            </p>
          </div>
        </div>
      </section>

      {/* Friends Section - Moved Above Stats Overview */}
      <section className="px-5 pb-6">
        <button
          onClick={() => setShowFriendsModal(true)}
          className="w-full text-left group"
          data-testid="button-open-friends"
        >
          <div className="relative overflow-hidden bg-white border-2 border-green-300 rounded-2xl p-4 hover:border-green-400 hover:shadow-xl transition-all duration-300">
            {/* Background gradient effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Icon container */}
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  {/* Notification dot - only show if there are friends */}
                  {friendsData.friends.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                  )}
                </div>
                
                {/* Text content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-gray-900">Amigos</p>
                    <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      NOVO
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">Conecte-se e converse</p>
                </div>
              </div>
              
              {/* Arrow and action */}
              <div className="flex items-center gap-1">
                {friendsData.friends.length > 0 && (
                  <div className="flex -space-x-2">
                    {/* Friend avatars preview - show up to 3 */}
                    {friendsData.friends.slice(0, 3).map((friend, index) => {
                      const colors = [
                        'from-purple-400 to-purple-500',
                        'from-blue-400 to-blue-500',
                        'from-amber-400 to-amber-500'
                      ];
                      return (
                        <div 
                          key={friend.friendship.id}
                          className={`w-6 h-6 bg-gradient-to-br ${colors[index % 3]} rounded-full border-2 border-white flex items-center justify-center`}
                        >
                          <span className="text-[8px] text-white font-bold">
                            {friend.friend.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                    {friendsData.friends.length > 3 && (
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">+{friendsData.friends.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}
                <ChevronRight className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            
            {/* Bottom info bar */}
            {friendsData.friends.length > 0 ? (
              <div className="mt-3 pt-3 border-t border-green-100 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4 text-[11px]">
                  {friendsData.onlineFriends.length > 0 && (
                    <>
                      <span className="flex items-center gap-1 text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {friendsData.onlineFriends.length} online
                      </span>
                      <span className="text-gray-500">•</span>
                    </>
                  )}
                  <span className="text-gray-600">{friendsData.friends.length} {friendsData.friends.length === 1 ? 'amigo' : 'amigos'}</span>
                </div>
                <span className="text-[10px] text-green-600 font-semibold">Ver todos →</span>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-green-100">
                <p className="text-center text-xs text-gray-500">Adicione amigos para começar</p>
              </div>
            )}
          </div>
        </button>
      </section>

      {/* Stats Overview */}
      <section className="px-5 py-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Visão Geral</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                <BookOpen className="h-4 w-4 text-green-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-gray-700 font-semibold uppercase">Livros Lidos</p>
            <p className="text-2xl font-bold text-gray-900">
              {userData?.stats.totalBooksRead || 0}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-gray-700 font-semibold uppercase">Total Ganho</p>
            <p className="text-2xl font-bold text-gray-900">
              R$ {userData?.totalEarnings?.toFixed(0) || '0'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                <Star className="h-4 w-4 text-amber-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-gray-700 font-semibold uppercase">Avaliação</p>
            <p className="text-2xl font-bold text-gray-900">
              {userData?.stats.averageRating ? Number(userData.stats.averageRating).toFixed(1) : '0.0'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                <Activity className="h-4 w-4 text-blue-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-gray-700 font-semibold uppercase">Sequência</p>
            <p className="text-2xl font-bold text-gray-900">
              {userData?.stats.streak || 0} dias
            </p>
          </div>
        </div>
      </section>

      {/* Performance Chart */}
      <section className="px-5 pb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Performance de Leitura</h3>
          
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7280' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Performance" dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Reading Distribution */}
      {pieData.length > 0 && (
        <section className="px-5 pb-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Dificuldade dos Livros</h3>
            
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2 mt-4">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{item.value} livros</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Achievements */}
      <section className="px-5 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Conquistas</h3>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((achievement, index) => (
            <div 
              key={index}
              className={`bg-white border rounded-2xl p-4 min-w-0 ${
                achievement.unlocked 
                  ? 'border-gray-200' 
                  : 'border-gray-200 opacity-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 flex-shrink-0 ${
                achievement.unlocked
                  ? `bg-gradient-to-br ${achievement.color}`
                  : 'bg-gray-100'
              }`}>
                <achievement.icon className={`h-6 w-6 ${
                  achievement.unlocked ? 'text-white' : 'text-gray-400'
                }`} />
              </div>
              <h4 className={`text-sm font-semibold truncate ${
                achievement.unlocked ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {achievement.title}
              </h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-words">{achievement.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Account Info */}
      <section className="px-5 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Informações da Conta</h3>
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Criou a conta em</p>
                <p className="text-xs text-gray-600">{memberSince}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>

          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Velocidade de leitura</p>
                <p className="text-xs text-gray-600">{readingSpeed} livros/mês</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>

          <button 
            onClick={() => setShowPlanModal(true)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-gray-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Plano atual</p>
                <p className="text-xs text-gray-600">
                  {userData?.plan === 'premium' ? 'Premium' : 'Gratuito'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </section>


      {/* Action Buttons */}
      <section className="px-5 pb-6">
        <button 
          onClick={() => {
            playSound('click');
            if (!userData?.selectedPlan || userData.selectedPlan === 'free') {
              // Check if user has read 3 books before showing upgrade modal
              const totalBooksRead = userData?.stats?.totalBooksRead || 0;
              if (totalBooksRead >= 3) {
                setShowLimitationsModal(true);
              } else {
                setShowCompleteBooksModal(true);
              }
            } else {
              setShowPlanModal(true);
            }
          }}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2 mb-3"
        >
          <Crown className="h-5 w-5" />
          {userData?.plan === 'premium' ? 'Gerenciar Plano' : 'Fazer Upgrade'}
        </button>

        <button 
          onClick={handleLogout}
          className="w-full py-4 bg-white border border-red-200 text-red-600 font-semibold rounded-2xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="h-5 w-5" />
          Sair da Conta
        </button>
      </section>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Perfil</h3>
            
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="text-xs text-gray-700 font-semibold uppercase block mb-2">
                  <User className="inline h-3 w-3 mr-1" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  placeholder="João da Silva"
                />
              </div>
              
              {/* Email */}
              <div>
                <label className="text-xs text-gray-700 font-semibold uppercase block mb-2">
                  <Mail className="inline h-3 w-3 mr-1" />
                  E-mail
                </label>
                <input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="text-xs text-gray-700 font-semibold uppercase block mb-2">
                  <Phone className="inline h-3 w-3 mr-1" />
                  Telefone
                </label>
                <input
                  type="tel"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  placeholder="(11) 98765-4321"
                />
              </div>

              {/* Divisor */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 mb-4">Alterar Senha (opcional)</p>
              </div>

              {/* Nova Senha */}
              <div>
                <label className="text-xs text-gray-700 font-semibold uppercase block mb-2">
                  <Lock className="inline h-3 w-3 mr-1" />
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  placeholder="Deixe em branco para não alterar"
                />
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="text-xs text-gray-700 font-semibold uppercase block mb-2">
                  <Lock className="inline h-3 w-3 mr-1" />
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setTempPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <PlanModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
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
      
      {/* Friends Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Amigos</h2>
              <button
                onClick={() => setShowFriendsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-close-friends-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-4rem)] sm:h-auto sm:max-h-[calc(90vh-4rem)]">
              <FriendsSection 
                isModalOpen={showFriendsModal}
                onModalClose={() => setShowFriendsModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}