import { X, Crown, Check, Zap, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useSound } from "@/hooks/useSound";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/scrollLock";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: 'free' | 'premium') => void;
}

export default function PlanModal({ isOpen, onClose, onSelectPlan }: PlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | null>(null);
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

  const handleConfirm = () => {
    if (selectedPlan) {
      playSound('click');
      onSelectPlan(selectedPlan);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 pb-8 relative animate-in slide-in-from-bottom duration-300">
        <button
          onClick={() => {
            playSound('click');
            onClose();
          }}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          data-testid="button-close-plan-modal"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Escolha seu Plano de Saque
          </h2>
          <p className="text-xs text-gray-600">
            Para realizar saques, você precisa escolher um plano de conta
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Free Plan */}
          <div
            onClick={() => {
              playSound('click');
              setSelectedPlan('free');
            }}
            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
              selectedPlan === 'free' 
                ? 'border-green-500 bg-green-50/50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            data-testid="plan-free"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Plano Gratuito</h3>
                <p className="text-xl font-bold text-gray-900 mt-1">R$ 0,00</p>
              </div>
              {selectedPlan === 'free' && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
              )}
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">5 livros por dia</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Saque mínimo de <span className="font-semibold">R$ 1.300,00</span></span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Taxa de <span className="font-semibold">R$ 15,90</span> por saque</span>
              </li>
            </ul>
          </div>

          {/* Premium Plan */}
          <div
            onClick={() => {
              playSound('click');
              setSelectedPlan('premium');
            }}
            className={`border-2 rounded-xl p-6 cursor-pointer transition-all relative ${
              selectedPlan === 'premium' 
                ? 'border-green-500 bg-green-50/50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            data-testid="plan-premium"
          >
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Recomendado
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  Plano Premium
                  <Crown className="h-4 w-4 text-yellow-500" />
                </h3>
                <div className="mt-1">
                  <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    R$ 29,90
                  </p>
                  <p className="text-xs text-gray-600">Pagamento único</p>
                </div>
              </div>
              {selectedPlan === 'premium' && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
              )}
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Livros ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600"><span className="font-semibold">Sem valor mínimo</span> para saque</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600"><span className="font-semibold">Sem taxa</span> de saque</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Saques instantâneos</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-600 text-center">
            <span className="font-semibold">Importante:</span> Este é um serviço bancário sério. 
            Todos os planos incluem proteção de dados e segurança garantida pelo Beta Reader Brasil.
          </p>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedPlan}
          className={`w-full py-3.5 text-sm font-semibold rounded-xl transition-all ${
            selectedPlan
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          data-testid="button-confirm-plan"
        >
          {selectedPlan === 'premium' ? 'Ativar Premium por R$ 29,90' : selectedPlan === 'free' ? 'Continuar com Plano Gratuito' : 'Selecione um plano'}
        </button>
      </div>
    </div>
  );
}