import { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  Circle, 
  BookOpen, 
  Star, 
  MessageSquare, 
  Trophy,
  ArrowRight,
  Lock,
  Sparkles
} from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { useLocation } from 'wouter';
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock';

interface Activity {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action: () => void;
  actionText: string;
}

interface RequiredActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function RequiredActivitiesModal({ isOpen, onClose, onComplete }: RequiredActivitiesModalProps) {
  const { playSound } = useSound();
  const [, setLocation] = useLocation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      loadActivities();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  const loadActivities = () => {
    // Check what activities are already completed
    const hasReadTwoBooks = localStorage.getItem('hasCompletedTwoBooks') === 'true';
    const hasGivenRating = localStorage.getItem('hasGivenFiveStarRating') === 'true';
    const hasWrittenReview = localStorage.getItem('hasWrittenDetailedReview') === 'true';

    const activitiesList: Activity[] = [
      {
        id: 'read_books',
        title: 'Leia 2 livros completos',
        description: 'Continue sua jornada de leitura e complete mais um livro',
        icon: <BookOpen className="h-6 w-6" />,
        completed: hasReadTwoBooks,
        action: () => {
          playSound('click');
          setLocation('/dashboard');
          onClose();
        },
        actionText: hasReadTwoBooks ? 'Concluído' : 'Ler agora',
      },
      {
        id: 'give_rating',
        title: 'Avalie com 5 estrelas',
        description: 'Dê uma avaliação máxima para seu livro favorito',
        icon: <Star className="h-6 w-6" />,
        completed: hasGivenRating,
        action: () => {
          playSound('click');
          // Simulate completion for demo
          if (!hasGivenRating) {
            localStorage.setItem('hasGivenFiveStarRating', 'true');
            loadActivities();
            playSound('reward');
          }
        },
        actionText: hasGivenRating ? 'Concluído' : 'Avaliar',
      },
      {
        id: 'write_review',
        title: 'Escreva uma resenha detalhada',
        description: 'Compartilhe sua opinião com pelo menos 50 palavras',
        icon: <MessageSquare className="h-6 w-6" />,
        completed: hasWrittenReview,
        action: () => {
          playSound('click');
          // Simulate completion for demo
          if (!hasWrittenReview) {
            localStorage.setItem('hasWrittenDetailedReview', 'true');
            loadActivities();
            playSound('reward');
          }
        },
        actionText: hasWrittenReview ? 'Concluído' : 'Escrever',
      },
    ];

    setActivities(activitiesList);
    
    const completed = activitiesList.filter(a => a.completed).length;
    setCompletedCount(completed);

    // Check if all activities are completed
    if (completed === 3) {
      localStorage.setItem('hasCompletedRequiredActivities', 'true');
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }
  };

  const progress = (completedCount / 3) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 opacity-90" />
          <div className="relative p-6 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              data-testid="button-close-activities"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                Desbloqueie o Chat
              </h2>
              <p className="text-sm text-white/90">
                Complete 3 atividades para conversar com amigos
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso</span>
            <span className="text-sm font-bold text-orange-600">{completedCount}/3 completas</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Activities List */}
        <div className="p-6 space-y-3">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={`p-4 rounded-2xl border-2 transition-all ${
                activity.completed
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activity.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                }`}>
                  {activity.completed ? <CheckCircle className="h-5 w-5" /> : activity.icon}
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-semibold ${
                    activity.completed ? 'text-green-700' : 'text-gray-900'
                  }`}>
                    {activity.title}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    activity.completed ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {activity.description}
                  </p>
                </div>
                
                <button
                  onClick={activity.action}
                  disabled={activity.completed}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    activity.completed
                      ? 'bg-green-100 text-green-600 cursor-default'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                  data-testid={`button-activity-${activity.id}`}
                >
                  {activity.actionText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          {completedCount === 3 ? (
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Parabéns!</p>
                  <p className="text-sm text-green-700">Chat desbloqueado com sucesso!</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800">
                <Lock className="h-4 w-4" />
                <p className="text-sm">
                  Complete todas as atividades para desbloquear o chat
                </p>
              </div>
            </div>
          )}
          
          {completedCount < 3 && (
            <button
              onClick={() => {
                playSound('click');
                setLocation('/dashboard');
                onClose();
              }}
              className="w-full mt-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
              data-testid="button-go-to-activities"
            >
              <span>Ir para atividades</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}