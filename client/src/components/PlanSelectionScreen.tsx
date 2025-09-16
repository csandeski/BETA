import { X, Crown, Check, Zap, Clock, Shield, Award } from "lucide-react";
import { useState } from "react";
import { useSound } from "@/hooks/useSound";

interface PlanSelectionScreenProps {
  onSelectPlan: (plan: 'free' | 'premium') => void;
  onClose?: () => void;
}

export default function PlanSelectionScreen({ onSelectPlan, onClose }: PlanSelectionScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | null>(null);
  const { playSound } = useSound();

  const handleConfirm = () => {
    if (selectedPlan) {
      playSound('click');
      onSelectPlan(selectedPlan);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative animate-in slide-in-from-bottom duration-300 my-auto">
        {onClose && (
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
        )}

        {/* Limited Time Offer */}
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-center py-2 px-4 rounded-full text-xs font-bold mb-6 animate-pulse">
          <Clock className="inline h-3 w-3 mr-1" />
          Oferta especial: Pro com 60% OFF por 24 horas!
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Escolha seu Plano
          </h2>
          <p className="text-xs text-gray-600">
            Selecione o plano ideal para seus objetivos de ganhos
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
                <h3 className="text-base font-semibold text-gray-900">Gratuito</h3>
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
                <span className="text-xs text-gray-600">Saque mínimo de <span className="font-semibold">R$ 1.800</span></span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Taxa de saque: <span className="font-semibold">R$ 15,90</span></span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Sem acesso a livros premium</span>
              </li>
            </ul>

            <div className="bg-gray-50 rounded-lg p-3 mt-4">
              <p className="text-xs text-gray-600">
                ⚠️ Espera de ~20 dias para sacar
              </p>
            </div>
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
              🔥 MAIS POPULAR
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  Pro
                  <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </h3>
                <div className="mt-1">
                  <p className="text-xs text-gray-400 line-through">R$ 74,90</p>
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
                <span className="text-xs text-gray-600">Leia <span className="font-semibold">ilimitado</span></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Saque <span className="font-semibold">instantâneo sem mínimo</span></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Taxa <span className="font-semibold">R$ 0,00</span> por saque</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Acesso a livros exclusivos</span>
              </li>
            </ul>

            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 mt-4">
              <p className="text-xs text-green-700 font-semibold">
                💰 O valor do plano é acrescido no primeiro saque
              </p>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 text-center">Por que confiar em nós?</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Shield className="h-6 w-6 text-green-600 mx-auto mb-1" strokeWidth={1.5} />
              <p className="text-xs text-gray-600">Pagamentos protegidos por Pix</p>
            </div>
            <div>
              <Award className="h-6 w-6 text-green-600 mx-auto mb-1" strokeWidth={1.5} />
              <p className="text-xs text-gray-600">+10.000 usuários ativos</p>
            </div>
            <div>
              <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" strokeWidth={1.5} />
              <p className="text-xs text-gray-600">Garantia de 7 dias</p>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-700 italic mb-2">
            "Saquei R$ 500 na primeira semana! O Pro vale cada centavo, recuperei o investimento no primeiro dia."
          </p>
          <p className="text-xs font-semibold text-gray-600">— Ana, SP</p>
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
          {selectedPlan === 'premium' ? 'Começar Pro Agora - R$ 29,90' : selectedPlan === 'free' ? 'Continuar Grátis' : 'Selecione um plano'}
        </button>
        </div>
      </div>
    </div>
  );
}