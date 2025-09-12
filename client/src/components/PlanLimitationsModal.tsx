import { useState, useEffect } from "react";
import { X, AlertCircle, TrendingUp, Users, Zap, Award, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock';
import { fbPixel } from '@/utils/facebookPixel';

interface PlanLimitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlanLimitationsModal({ isOpen, onClose }: PlanLimitationsModalProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      // Track modal view
      fbPixel.trackViewContent({
        content_name: 'Plan Limitations Modal',
        content_category: 'modal',
        content_type: 'upgrade_prompt'
      });
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    setLocation('/planos');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-t-2xl border-b border-amber-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Limitações do Plano Gratuito</h2>
                <p className="text-sm text-gray-600 mt-0.5">Desbloqueie todo o potencial</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              data-testid="button-close-modal"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Current Limitations */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-red-600">⚠️</span> No plano gratuito você tem:
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Saque mínimo de R$ 1.800</span> - valor muito alto para retirar seus ganhos
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Apenas 3 atividades diárias</span> - limitando seus ganhos a R$ 45/dia
                </p>
              </div>
            </div>
          </div>

          {/* Upgrade Benefits */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Com o plano completo você terá:
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Mais livros disponíveis</span> para leitura e avaliação
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Award className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Atividades exclusivas</span> com maiores recompensas
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Acesso à comunidade</span> de amigos do Beta Reader Brasil
                </p>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Potencial de ganhos ilimitado</span> sem restrições diárias
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleUpgrade}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-600 transform hover:scale-[1.02] transition-all duration-200"
            data-testid="button-upgrade-plan"
          >
            FAZER UPGRADE AGORA
          </button>

          {/* Trust Badge */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              Pagamento 100% seguro via PIX
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}