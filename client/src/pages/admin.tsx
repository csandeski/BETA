import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, MessageCircle, LogOut, Shield, Activity, DollarSign, BookOpen } from "lucide-react";

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'users' | 'support'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check admin authentication via API
    checkAdminAuth();
  }, []);
  
  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/status');
      if (response.ok) {
        const data = await response.json();
        if (data.isAuthenticated) {
          setIsAuthenticated(true);
          loadData();
        }
      }
    } catch (error) {
      console.error('Failed to check admin auth:', error);
    }
  };

  const loadData = async () => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadMessages();
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/admin/support/messages', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Group messages by user
        const grouped = data.reduce((acc: any, msg: any) => {
          if (!acc[msg.userId]) {
            acc[msg.userId] = [];
          }
          acc[msg.userId].push(msg);
          return acc;
        }, {});
        setMessages(grouped);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsAuthenticated(true);
        loadData();
      } else {
        setError("Credenciais inválidas");
      }
    } catch (error) {
      setError("Erro ao fazer login");
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setLocation('/');
  };

  const handleSendReply = async (userId: string) => {
    if (!replyMessage.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/support/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({
          userId,
          message: replyMessage
        })
      });
      
      if (response.ok) {
        setReplyMessage("");
        loadMessages();
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
            Painel Administrativo
          </h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 flex gap-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Usuários
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('support')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'support'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Suporte
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'users' ? (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Usuários Cadastrados</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nome</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Saldo</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Livros Lidos</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Plano</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Data Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{item.user.fullName}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.user.email}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-green-600">
                          R$ {Number(item.user.balance).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {item.stats?.totalBooksRead || 0}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            item.user.plan === 'premium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.user.plan === 'premium' ? 'Premium' : 'Free'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(item.user.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User list with messages */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversas</h2>
                
                <div className="space-y-2">
                  {Object.keys(messages).map((userId) => {
                    const userMessages = messages[userId];
                    const lastMessage = userMessages[userMessages.length - 1];
                    const unreadCount = userMessages.filter((m: any) => !m.isFromAdmin && !m.isRead).length;
                    
                    return (
                      <button
                        key={userId}
                        onClick={() => setSelectedUser(userId)}
                        className={`w-full p-4 rounded-lg border transition-colors text-left ${
                          selectedUser === userId
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-900">{lastMessage.userName}</h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{lastMessage.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(lastMessage.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Messages */}
            {selectedUser && (
              <div className="bg-white rounded-xl shadow-sm flex flex-col h-[600px]">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Conversa com {messages[selectedUser][0].userName}
                  </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages[selectedUser].map((msg: any, index: number) => (
                    <div
                      key={index}
                      className={`flex ${msg.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-2xl ${
                          msg.isFromAdmin
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.isFromAdmin ? 'opacity-80' : 'opacity-50'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="flex-1 px-4 py-3 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => handleSendReply(selectedUser)}
                      disabled={!replyMessage.trim() || isLoading}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}