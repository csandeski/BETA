import { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, CheckCircle, BookOpen, Star, MessageCircle } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { userDataManager, type UserData } from '@/utils/userDataManager';
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'friend';
  time: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
  onOpenActivities: () => void;
}

const SIMULATED_MESSAGES: { [key: string]: Message[] } = {
  'sim_1': [
    { id: '1', text: 'Oi! Vi que você também está lendo no Beta Reader! 📚', sender: 'friend', time: '10:30' },
    { id: '2', text: 'Quanto você já ganhou lendo?', sender: 'friend', time: '10:31' },
  ],
  'sim_2': [
    { id: '1', text: 'E aí! Acabei de completar meu terceiro livro hoje!', sender: 'friend', time: '09:45' },
    { id: '2', text: 'Já consegui sacar R$ 135! Muito bom mesmo 💰', sender: 'friend', time: '09:46' },
  ],
  'sim_3': [
    { id: '1', text: 'Olá! Que legal ver você por aqui!', sender: 'friend', time: '11:15' },
    { id: '2', text: 'Qual livro você está lendo agora?', sender: 'friend', time: '11:16' },
  ],
  'sim_4': [
    { id: '1', text: 'Fala! Você já descobriu como desbloquear mais livros?', sender: 'friend', time: '14:20' },
    { id: '2', text: 'Estou querendo ler mais mas acabaram os gratuitos 😅', sender: 'friend', time: '14:21' },
  ],
  'sim_5': [
    { id: '1', text: 'Oi! Adorei sua avaliação do último livro!', sender: 'friend', time: '16:10' },
    { id: '2', text: 'Você escreve muito bem! Continua assim 👏', sender: 'friend', time: '16:11' },
  ],
};

export default function ChatModal({ isOpen, onClose, friend, onOpenActivities }: ChatModalProps) {
  const { playSound } = useSound();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [hasTriedToType, setHasTriedToType] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      loadUserData();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  useEffect(() => {
    if (friend && isOpen) {
      // Load simulated messages for this friend
      const friendMessages = SIMULATED_MESSAGES[friend.id] || [];
      setMessages(friendMessages);
      setHasTriedToType(false);
    }
  }, [friend, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUserData = async () => {
    const data = userDataManager.getUserData();
    setUserData(data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputFocus = () => {
    // Check if user has completed required activities
    const hasCompletedActivities = localStorage.getItem('hasCompletedRequiredActivities') === 'true';
    
    if (!hasCompletedActivities && !hasTriedToType) {
      setHasTriedToType(true);
      playSound('click');
      onOpenActivities();
      setInputValue('');
    } else if (hasCompletedActivities && userData?.plan !== 'premium') {
      // Show upgrade prompt if activities completed but not premium
      playSound('click');
      setInputValue('');
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const hasCompletedActivities = localStorage.getItem('hasCompletedRequiredActivities') === 'true';
    
    if (!hasCompletedActivities) {
      onOpenActivities();
      return;
    }

    if (userData?.plan !== 'premium') {
      playSound('click');
      return;
    }

    // If premium, actually send the message
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'me',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    playSound('success');

    // Simulate friend typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Legal! Continue lendo e ganhando! 🎉',
        sender: 'friend',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, response]);
      playSound('success');
    }, 2000);
  };

  if (!isOpen || !friend) return null;

  const hasCompletedActivities = localStorage.getItem('hasCompletedRequiredActivities') === 'true';
  const isPremium = userData?.plan === 'premium';
  const canSendMessages = hasCompletedActivities && isPremium;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold">
                  {friend.avatar}
                </div>
                {friend.isOnline && (
                  <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white">{friend.name}</h3>
                <p className="text-xs text-white/80">
                  {friend.isOnline ? 'Online agora' : friend.lastSeen || 'Offline'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              data-testid="button-close-chat"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  message.sender === 'me'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'me' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {message.time}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
          {!hasCompletedActivities ? (
            <button
              onClick={onOpenActivities}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all"
              data-testid="button-complete-activities"
            >
              <CheckCircle className="h-5 w-5" />
              Complete 3 atividades para desbloquear
            </button>
          ) : !isPremium ? (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-3">
              <div className="flex items-center gap-2 text-purple-700 mb-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-semibold">Chat Premium</span>
              </div>
              <p className="text-xs text-gray-600">
                Faça upgrade para conversar com amigos ilimitadamente
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={handleInputFocus}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite uma mensagem..."
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                data-testid="input-chat-message"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || !canSendMessages}
                className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-send-message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}