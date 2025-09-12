import { useState, useEffect } from 'react';
import { X, Gift, Clock, DollarSign, Zap, TrendingUp, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock';
import { fbPixel } from '@/utils/facebookPixel';

interface FreeChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FreeChoiceModal({ isOpen, onClose }: FreeChoiceModalProps) {
  const { toast } = useToast();
  
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

  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            data-testid="button-close-free-choice"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Você Escolheu o Plano Gratuito
            </h2>
            <p className="text-sm text-gray-600">
              Continue sua jornada com algumas limitações
            </p>
          </div>
        </div>
        
        <div className="px-6 pb-8 space-y-5">
          {/* Free Plan Limitations */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  3 Atividades Diárias
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Volte amanhã para continuar suas atividades
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Saque Mínimo: R$ 1.800
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Acumule este valor para poder sacar
                </p>
              </div>
            </div>
          </div>
          
          {/* Installation Reminder */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700 font-medium">
              💡 Instale nosso app para receber notificações quando suas atividades estiverem disponíveis!
            </p>
          </div>
          
          {/* Special Offer Section */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 border-2 border-orange-200">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-orange-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Oferta Especial Para Você!
                </h3>
              </div>
              
              <p className="text-xs text-gray-700">
                Você pode pular essa demora e ter <strong>atividades e saques ilimitados</strong> na Beta Reader Brasil.
              </p>
              
              <p className="text-xs text-gray-700">
                E para te incentivar ainda mais, vamos oferecer algo <strong>irrecusável</strong> para você!
              </p>
              
              {/* Discount Preview */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-[10px] text-green-600 font-bold">PLANO OFICIAL</p>
                  <p className="text-xs font-bold text-gray-900 line-through">R$ 39,90</p>
                  <p className="text-sm font-bold text-green-600">25% OFF</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-[10px] text-purple-600 font-bold">PLANO ILIMITADO</p>
                  <p className="text-xs font-bold text-gray-900 line-through">R$ 59,90</p>
                  <p className="text-sm font-bold text-purple-600">35% OFF</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                // Track Facebook Pixel Lead event when user shows interest
                fbPixel.trackLead({
                  value: 0,
                  currency: 'BRL',
                  content_name: 'Special Offer Interest',
                  content_category: 'discount_offer'
                });
                // Modal removed - just close the modal
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 flex items-center justify-center gap-2 animate-pulse"
              data-testid="button-surprise"
            >
              <Gift className="h-5 w-5" />
              EU QUERO A SURPRESA!
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
              data-testid="button-continue-free-plan"
            >
              Continuar com Plano Gratuito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}