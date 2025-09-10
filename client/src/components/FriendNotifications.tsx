import { useState, useEffect } from 'react';
import { UserPlus, X, MessageCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { useSound } from '@/hooks/useSound';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar: string;
}

const SIMULATED_FRIENDS = [
  {
    id: 'sim_1',
    name: 'Maria Silva',
    email: 'maria.silva@example.com',
    message: 'quer ser seu amigo',
    time: 'agora',
    avatar: 'MS',
  },
  {
    id: 'sim_2',
    name: 'João Santos',
    email: 'joao.santos@example.com',
    message: 'enviou solicitação de amizade',
    time: '2 min atrás',
    avatar: 'JS',
  },
  {
    id: 'sim_3',
    name: 'Ana Costa',
    email: 'ana.costa@example.com',
    message: 'quer conectar com você',
    time: '5 min atrás',
    avatar: 'AC',
  },
  {
    id: 'sim_4',
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@example.com',
    message: 'enviou convite de amizade',
    time: '8 min atrás',
    avatar: 'PO',
  },
  {
    id: 'sim_5',
    name: 'Carla Mendes',
    email: 'carla.mendes@example.com',
    message: 'quer ser sua amiga',
    time: '10 min atrás',
    avatar: 'CM',
  },
];

interface FriendNotificationsProps {
  booksCompleted: number;
  onNotificationClick?: () => void;
}

export default function FriendNotifications({ booksCompleted, onNotificationClick }: FriendNotificationsProps) {
  const [, setLocation] = useLocation();
  const { playSound } = useSound();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [hasShownNotifications, setHasShownNotifications] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Check if user has completed first book and hasn't seen notifications yet
    const hasSeenFirstBookNotifications = localStorage.getItem('hasSeenFirstBookNotifications');
    
    if (booksCompleted >= 1 && !hasSeenFirstBookNotifications && !hasShownNotifications) {
      setHasShownNotifications(true);
      localStorage.setItem('hasSeenFirstBookNotifications', 'true');
      
      // Show first notification after 2 seconds
      setTimeout(() => {
        showNextNotification();
      }, 2000);
    }
  }, [booksCompleted]);

  const showNextNotification = () => {
    if (currentNotificationIndex < SIMULATED_FRIENDS.length) {
      const friend = SIMULATED_FRIENDS[currentNotificationIndex];
      
      // Check if this notification was already dismissed
      if (!dismissedNotifications.includes(friend.id)) {
        setNotifications(prev => [...prev, friend]);
        // playSound('success'); // Comentado temporariamente até corrigir as notificações visuais
        
        // Show next notification after 3-5 seconds
        const delay = 3000 + Math.random() * 2000;
        setTimeout(() => {
          setCurrentNotificationIndex(prev => prev + 1);
          showNextNotification();
        }, delay);
      } else {
        // Skip to next if this was dismissed
        setCurrentNotificationIndex(prev => prev + 1);
        showNextNotification();
      }
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    playSound('click');
    
    // Store the friend request to be shown in profile
    localStorage.setItem('pendingFriendRequest', JSON.stringify(notification));
    localStorage.setItem('openFriendsModal', 'true');
    
    // Navigate to profile
    setLocation('/profile');
    
    // Remove this notification
    dismissNotification(notification.id);
    
    if (onNotificationClick) {
      onNotificationClick();
    }
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setDismissedNotifications(prev => [...prev, notificationId]);
  };

  // Only show notifications that haven't been dismissed
  const visibleNotifications = notifications.filter(n => !dismissedNotifications.includes(n.id));

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          className="bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden animate-in slide-in-from-right duration-500"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <UserPlus className="h-4 w-4" />
                <span className="text-xs font-semibold">Nova solicitação de amizade</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(notification.id);
                }}
                className="text-white/80 hover:text-white transition-colors"
                data-testid={`button-dismiss-notification-${notification.id}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <button
            onClick={() => handleNotificationClick(notification)}
            className="w-full p-4 hover:bg-purple-50 transition-colors text-left"
            data-testid={`button-notification-${notification.id}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {notification.avatar}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{notification.name}</p>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
              </div>
              <MessageCircle className="h-5 w-5 text-purple-500" />
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}