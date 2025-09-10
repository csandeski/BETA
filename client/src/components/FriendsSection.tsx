import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Clock, 
  Mail, 
  Search,
  Check,
  X,
  Circle,
  MoreVertical,
  Trophy,
  BookOpen,
  MessageCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import ChatModal from '@/components/ChatModal';
import RequiredActivitiesModal from '@/components/RequiredActivitiesModal';

interface Friend {
  friendship: {
    id: string;
    status: string;
    createdAt: string;
    acceptedAt: string | null;
  };
  friend: {
    id: string;
    fullName: string;
    email: string;
    plan: string;
  };
  onlineStatus: {
    isOnline: boolean;
    lastSeen: string;
  } | null;
}

interface PendingRequest {
  friendship: {
    id: string;
    status: string;
    createdAt: string;
  };
  requester: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface FriendsSectionProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

export default function FriendsSection({ isModalOpen, onModalClose }: FriendsSectionProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'add'>('friends');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const { toast } = useToast();
  const { playSound } = useSound();

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
    updateOnlineStatus(true);

    // Check if we should show a pending friend request from notification
    const pendingFriend = localStorage.getItem('pendingFriendRequest');
    if (pendingFriend) {
      const friend = JSON.parse(pendingFriend);
      localStorage.removeItem('pendingFriendRequest');
      
      // Add to pending requests if not already there
      setPendingRequests(prev => {
        const exists = prev.some(r => r.friendship.id === friend.id);
        if (!exists) {
          return [...prev, {
            friendship: {
              id: friend.id,
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
            requester: {
              id: friend.id,
              fullName: friend.name,
              email: friend.email || `${friend.name.toLowerCase().replace(' ', '.')}@example.com`,
            },
          }];
        }
        return prev;
      });
      
      // Switch to pending tab
      setActiveTab('pending');
    }

    // Update online status periodically
    const interval = setInterval(() => {
      updateOnlineStatus(true);
    }, 60000); // Every minute

    // Set offline on unmount
    return () => {
      clearInterval(interval);
      updateOnlineStatus(false);
    };
  }, []);

  const updateOnlineStatus = async (isOnline: boolean) => {
    try {
      await apiClient.updateOnlineStatus(isOnline);
    } catch (error) {
      console.error('Failed to update online status:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await apiClient.getUserFriends();
      setFriends(response);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const response = await apiClient.getPendingFriendRequests();
      setPendingRequests(response);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!friendEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Digite o email do seu amigo",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.sendFriendRequest(friendEmail.trim());

      playSound('success');
      toast({
        title: "Solicitação enviada!",
        description: response.message,
      });
      setFriendEmail('');
      loadPendingRequests();
    } catch (error: any) {
      playSound('click');
      toast({
        title: "Erro ao enviar solicitação",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      // For simulated friends, just move to friends list
      const request = pendingRequests.find(r => r.friendship.id === friendshipId);
      if (request && request.friendship.id.startsWith('sim_')) {
        // Add to friends list
        const newFriend: Friend = {
          friendship: {
            id: request.friendship.id,
            status: 'accepted',
            createdAt: request.friendship.createdAt,
            acceptedAt: new Date().toISOString(),
          },
          friend: {
            id: request.requester.id,
            fullName: request.requester.fullName,
            email: request.requester.email,
            plan: Math.random() > 0.5 ? 'premium' : 'free',
          },
          onlineStatus: {
            isOnline: Math.random() > 0.3,
            lastSeen: new Date().toISOString(),
          },
        };
        
        setFriends(prev => [...prev, newFriend]);
        setPendingRequests(prev => prev.filter(r => r.friendship.id !== friendshipId));
        
        playSound('reward');
        toast({
          title: "Amizade aceita!",
          description: "Vocês agora são amigos",
        });
        
        // Auto open chat with new friend
        setTimeout(() => {
          openChat(newFriend);
        }, 500);
      } else {
        await apiClient.acceptFriendRequest(friendshipId);
        playSound('reward');
        toast({
          title: "Amizade aceita!",
          description: "Vocês agora são amigos",
        });
        loadFriends();
        loadPendingRequests();
      }
    } catch (error) {
      toast({
        title: "Erro ao aceitar solicitação",
        variant: "destructive",
      });
    }
  };

  const rejectRequest = async (friendshipId: string) => {
    try {
      await apiClient.rejectFriendRequest(friendshipId);
      playSound('click');
      loadPendingRequests();
    } catch (error) {
      toast({
        title: "Erro ao rejeitar solicitação",
        variant: "destructive",
      });
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!confirm('Tem certeza que deseja remover este amigo?')) return;

    try {
      // For simulated friends, just remove from list
      if (friendId.startsWith('sim_')) {
        setFriends(prev => prev.filter(f => f.friend.id !== friendId));
        playSound('click');
        toast({
          title: "Amigo removido",
        });
      } else {
        await apiClient.removeFriend(friendId);
        playSound('click');
        toast({
          title: "Amigo removido",
        });
        loadFriends();
      }
    } catch (error) {
      toast({
        title: "Erro ao remover amigo",
        variant: "destructive",
      });
    }
  };

  const openChat = (friend: Friend) => {
    setSelectedFriend({
      id: friend.friend.id,
      name: friend.friend.fullName,
      avatar: friend.friend.fullName.split(' ').map(n => n[0]).join('').toUpperCase(),
      isOnline: friend.onlineStatus?.isOnline,
      lastSeen: friend.onlineStatus?.lastSeen ? getLastSeenText(friend.onlineStatus.lastSeen) : undefined,
    });
    setShowChatModal(true);
    playSound('click');
  };

  const getLastSeenText = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const onlineFriends = friends.filter(f => f.onlineStatus?.isOnline);
  const offlineFriends = friends.filter(f => !f.onlineStatus?.isOnline);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
        <div className="flex items-center gap-3 text-white">
          <Users className="h-6 w-6" />
          <h2 className="text-xl font-bold">Amigos</h2>
          <div className="ml-auto flex items-center gap-2">
            {friends.length > 0 && (
              <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
                {friends.length} amigos
              </div>
            )}
            {pendingRequests.length > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                {pendingRequests.length} pendentes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'friends' 
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          data-testid="tab-friends"
        >
          <UserCheck className="h-4 w-4" />
          Amigos{friends.length > 0 && ` (${friends.length})`}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 relative ${
            activeTab === 'pending' 
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          data-testid="tab-pending"
        >
          <Clock className="h-4 w-4" />
          Pendentes
          {pendingRequests.length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'add' 
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          data-testid="tab-add"
        >
          <UserPlus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div>
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Você ainda não tem amigos</h3>
                <p className="text-sm text-gray-500 mb-6 px-4">Adicione amigos para compartilhar suas conquistas de leitura!</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-full hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg"
                  data-testid="button-add-first-friend"
                >
                  <UserPlus className="h-4 w-4 inline mr-2" />
                  Adicionar primeiro amigo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Online Friends */}
                {onlineFriends.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                      <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                      Online{onlineFriends.length > 0 && ` (${onlineFriends.length})`}
                    </h3>
                    <div className="space-y-2">
                      {onlineFriends.map((friend) => (
                        <div
                          key={friend.friendship.id}
                          className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                              {friend.friend.fullName.charAt(0).toUpperCase()}
                            </div>
                            <Circle className="absolute -bottom-0 -right-0 h-3 w-3 fill-green-500 text-green-500 border-2 border-white rounded-full" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{friend.friend.fullName}</p>
                            <p className="text-xs text-gray-500">Online agora</p>
                          </div>
                          {friend.friend.plan === 'premium' && (
                            <Trophy className="h-4 w-4 text-amber-500" />
                          )}
                          <button
                            onClick={() => openChat(friend)}
                            className="text-green-500 hover:text-green-600 transition-colors"
                            data-testid={`button-chat-friend-${friend.friend.id}`}
                          >
                            <MessageCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => removeFriend(friend.friend.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            data-testid={`button-remove-friend-${friend.friend.id}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offline Friends */}
                {offlineFriends.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                      <Circle className="h-3 w-3 text-gray-400" />
                      Offline{offlineFriends.length > 0 && ` (${offlineFriends.length})`}
                    </h3>
                    <div className="space-y-2">
                      {offlineFriends.map((friend) => (
                        <div
                          key={friend.friendship.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="relative">
                            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                              {friend.friend.fullName.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{friend.friend.fullName}</p>
                            <p className="text-xs text-gray-500">
                              {friend.onlineStatus 
                                ? getLastSeenText(friend.onlineStatus.lastSeen)
                                : 'Offline'}
                            </p>
                          </div>
                          {friend.friend.plan === 'premium' && (
                            <Trophy className="h-4 w-4 text-amber-500" />
                          )}
                          <button
                            onClick={() => openChat(friend)}
                            className="text-green-500 hover:text-green-600 transition-colors"
                            data-testid={`button-chat-friend-${friend.friend.id}`}
                          >
                            <MessageCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => removeFriend(friend.friend.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            data-testid={`button-remove-friend-${friend.friend.id}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <div>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhuma solicitação pendente</h3>
                <p className="text-sm text-gray-500 px-4">Quando alguém quiser ser seu amigo, aparecerá aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.friendship.id}
                    className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {request.requester.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{request.requester.fullName}</p>
                      <p className="text-xs text-gray-500">{request.requester.email}</p>
                    </div>
                    <button
                      onClick={() => acceptRequest(request.friendship.id)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      data-testid={`button-accept-request-${request.friendship.id}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => rejectRequest(request.friendship.id)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      data-testid={`button-reject-request-${request.friendship.id}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Friend Tab */}
        {activeTab === 'add' && (
          <div>
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                Adicione amigos pelo email e acompanhe o progresso deles!
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do amigo
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={friendEmail}
                      onChange={(e) => setFriendEmail(e.target.value)}
                      placeholder="amigo@exemplo.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      data-testid="input-friend-email"
                    />
                  </div>
                  <button
                    onClick={sendFriendRequest}
                    disabled={isLoading || !friendEmail.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    data-testid="button-send-friend-request"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Adicionar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Benefícios de ter amigos
                </h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Veja o progresso de leitura dos seus amigos</li>
                  <li>• Compare estatísticas e conquistas</li>
                  <li>• Motive-se mutuamente a ler mais</li>
                  <li>• Compartilhe recomendações de livros</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        friend={selectedFriend}
        onOpenActivities={() => setShowActivitiesModal(true)}
      />

      {/* Required Activities Modal */}
      <RequiredActivitiesModal
        isOpen={showActivitiesModal}
        onClose={() => setShowActivitiesModal(false)}
        onComplete={() => {
          setShowActivitiesModal(false);
          toast({
            title: "Atividades concluídas!",
            description: "Agora você pode conversar com seus amigos",
          });
        }}
      />
    </div>
  );
}