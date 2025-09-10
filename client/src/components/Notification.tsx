import { Bell, X, BookOpen, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

interface NotificationProps {
  onNotificationClick: () => void;
}

interface NotificationData {
  id: number;
  icon: React.ReactNode;
  title: string;
  message: string;
  delay: number;
}

export default function Notification({ onNotificationClick }: NotificationProps) {
  const [activeNotifications, setActiveNotifications] = useState<number[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<number[]>([]);

  const notifications: NotificationData[] = [
    {
      id: 1,
      icon: <Bell className="h-4 w-4 text-white" strokeWidth={2} />,
      title: "Nova atividade disponível!",
      message: "Toque para começar sua leitura e ganhar R$ 45",
      delay: 2000
    },
    {
      id: 2,
      icon: <BookOpen className="h-4 w-4 text-white" strokeWidth={2} />,
      title: "3 livros esperando por você",
      message: "Complete as leituras para liberar saques",
      delay: 8000
    },
    {
      id: 3,
      icon: <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />,
      title: "Bônus especial hoje!",
      message: "Leia agora e ganhe 20% a mais",
      delay: 15000
    }
  ];

  useEffect(() => {
    notifications.forEach(notification => {
      if (!dismissedNotifications.includes(notification.id)) {
        const timer = setTimeout(() => {
          setActiveNotifications(prev => [...prev, notification.id]);
        }, notification.delay);
        return () => clearTimeout(timer);
      }
    });
  }, [dismissedNotifications]);

  const handleClick = (notificationId: number) => {
    onNotificationClick();
    setActiveNotifications(prev => prev.filter(id => id !== notificationId));
    setTimeout(() => {
      setDismissedNotifications(prev => [...prev, notificationId]);
    }, 300);
  };

  const handleDismiss = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    setActiveNotifications(prev => prev.filter(id => id !== notificationId));
    setTimeout(() => {
      setDismissedNotifications(prev => [...prev, notificationId]);
    }, 300);
  };

  return (
    <>
      {notifications.map((notification, index) => {
        const isActive = activeNotifications.includes(notification.id);
        const isDismissed = dismissedNotifications.includes(notification.id);
        
        if (isDismissed) return null;
        
        return (
          <div
            key={notification.id}
            className={`fixed left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 transition-all duration-500 ${
              isActive ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            }`}
            style={{ top: `${1 + index * 4.5}rem` }}
          >
            <div
              onClick={() => handleClick(notification.id)}
              className="bg-white border border-green-200 rounded-xl shadow-lg p-3 flex items-start gap-3 cursor-pointer hover:shadow-xl transition-shadow"
              data-testid={`notification-${notification.id}`}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                {notification.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">{notification.title}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {notification.message}
                </p>
              </div>

              <button
                onClick={(e) => handleDismiss(e, notification.id)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                data-testid={`button-dismiss-${notification.id}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}