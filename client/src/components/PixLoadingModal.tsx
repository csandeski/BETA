import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PixLoadingModalProps {
  isOpen: boolean;
}

export default function PixLoadingModal({ isOpen }: PixLoadingModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex flex-col items-center space-y-6">
          {/* Loading Icon */}
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
          
          {/* Loading Text */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Gerando seu pagamento
            </h3>
            <p className="text-sm text-gray-600">
              Confirmando sua conta...
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}