import { useEffect } from "react";
import { X, BookOpen, Target, Trophy } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/scrollLock";

interface CompleteBooksModalProps {
  isOpen: boolean;
  onClose: () => void;
  booksRead: number;
}

export function CompleteBooksModal({ isOpen, onClose, booksRead }: CompleteBooksModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const booksRemaining = 3 - booksRead;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl p-6 pb-8 w-full max-w-sm animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          data-testid="button-close-modal"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
            <Target className="h-10 w-10 text-green-600" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Complete Suas Atividades!
          </h2>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-6">
            Para desbloquear os planos pagos, você precisa primeiro completar a leitura de <strong>3 livros</strong>.
          </p>

          {/* Progress */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Seu Progresso</span>
              <span className="text-sm font-bold text-green-600">{booksRead}/3 livros</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${(booksRead / 3) * 100}%` }}
              />
            </div>
            
            {booksRemaining > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                Faltam apenas <strong>{booksRemaining} {booksRemaining === 1 ? 'livro' : 'livros'}</strong> para desbloquear!
              </p>
            )}
          </div>

          {/* Incentive */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 mb-6 border border-green-200">
            <div className="flex items-start gap-3">
              <Trophy className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h4 className="text-sm font-bold text-gray-900 mb-1">
                  Benefícios ao Completar
                </h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• Acesso aos planos Oficial e Ilimitado</li>
                  <li>• Ganhe até R$60 por dia</li>
                  <li>• Saques sem taxa (plano pago)</li>
                  <li>• Leitura ilimitada de livros</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
            data-testid="button-continue-reading"
          >
            <BookOpen className="h-4 w-4" />
            Continuar Atividades
          </button>
        </div>
      </div>
    </div>
  );
}