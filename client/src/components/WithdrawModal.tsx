import { useEffect } from "react";
import { X, Lock, AlertCircle } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/scrollLock";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  booksRead: number;
}

export default function WithdrawModal({ isOpen, onClose, booksRead }: WithdrawModalProps) {
  const { playSound } = useSound();
  
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

  if (booksRead < 5) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 pb-8 relative animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="button-close-modal"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-amber-600" strokeWidth={1.5} />
            </div>

            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Saque Bloqueado
            </h2>
            
            <p className="text-xs text-gray-600 mb-6">
              Para liberar seu saque, você precisa completar a leitura e avaliação de <span className="font-semibold text-green-600">5 livros</span>.
            </p>

            <div className="w-full bg-gray-100 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-700 font-semibold">Progresso</span>
                <span className="text-xs font-bold text-green-600">{booksRead}/5 livros</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${(booksRead / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={() => {
                playSound('click');
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
              data-testid="button-understand"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}