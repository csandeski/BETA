import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Zap, TrendingUp, CheckCircle, Star, Trophy, Calendar, Timer, Users, ArrowRight, Check, DollarSign, Sparkles, Target, Crown, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import { userDataManager } from '@/utils/userDataManager';
import { useToast } from '@/hooks/use-toast';
import AcceleratorPaymentModal from '../components/AcceleratorPaymentModal';

export default function Confirm() {
  const [timeLeft, setTimeLeft] = useState({ minutes: 14, seconds: 59 });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Load user data
    const loadData = async () => {
      await userDataManager.loadUserData();
      const data = userDataManager.getUserData();
      if (data) {
        setUserData(data);
      } else {
        // Redirect to dashboard if no user data
        setLocation('/dashboard');
      }
    };
    loadData();
  }, [setLocation]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          clearInterval(timer);
          return { minutes: 0, seconds: 0 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSkip = () => {
    toast({
      title: "Oferta Recusada",
      description: "Você optou por não ativar o Acelerador de Ganhos",
      variant: "default",
    });
    setLocation('/dashboard');
  };

  const handleActivate = () => {
    setShowPaymentModal(true);
  };

  const getUserFirstName = () => {
    if (!userData) return "Leitor";
    const firstName = userData.fullName.split(' ')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-green-600 font-bold text-lg">Beta Reader Brasil</div>
            <div className="bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
              <Timer className="h-4 w-4" />
              <span className="font-bold text-sm">
                {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Success Badge */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold text-sm">Pagamento Confirmado com Sucesso!</span>
          </div>
        </div>

        {/* Welcome Message */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
          <div className="text-center space-y-3">
            <Crown className="h-12 w-12 text-indigo-600 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">
              Parabéns, {getUserFirstName()}!
            </h2>
            <p className="text-sm text-gray-700">
              Você agora faz parte do Beta Reader Brasil e pode ganhar dinheiro lendo livros!
            </p>
          </div>
        </Card>

        {/* Exclusive Offer */}
        <Card className="p-6 mb-4 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-orange-200 relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            OFERTA ÚNICA
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Acelerador de Ganhos
                </h3>
                <p className="text-xs text-gray-600">
                  Multiplique seus lucros por 14 dias
                </p>
              </div>
            </div>

            {/* Main Value Proposition */}
            <div className="bg-white rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold text-gray-900">2X MAIS GANHOS</span>
                <Zap className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-sm text-gray-700 text-center">
                Durante os próximos <strong>14 dias</strong>, escolha <strong>3 horas por dia</strong> para <strong className="text-orange-600">DOBRAR</strong> todos os valores recebidos
              </p>
            </div>

            {/* How it Works */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900">Como Funciona:</h4>
              
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>Ativação Flexível:</strong> Você escolhe quando ativar as 3 horas diárias
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>Ganho Dobrado:</strong> Livro de R$45 vira R$90 durante o período ativo
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>14 Dias Completos:</strong> Use estrategicamente para maximizar lucros
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ROI Calculation */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Análise de Retorno:</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Investimento:</span>
                  <span className="text-sm font-bold text-gray-900">R$ 29,90</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Ganho médio em 14 dias:</span>
                  <span className="text-sm font-bold text-green-600">R$ 378,00</span>
                </div>
                <div className="h-px bg-green-200"></div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700">Lucro líquido:</span>
                  <span className="text-base font-bold text-green-600">R$ 348,10</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  * Baseado em 5 livros/dia durante período ativo
                </p>
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">96% dos novos usuários ativam</span>
              </div>
              <p className="text-xs text-gray-700">
                Esta oferta aparece <strong>apenas uma vez</strong> para novos membros. Depois que fechar esta tela, o Acelerador não estará mais disponível.
              </p>
            </div>

            {/* Price Display */}
            <div className="text-center py-3">
              <p className="text-xs text-gray-500 mb-1">Investimento único</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold text-gray-900">R$ 29,90</span>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                  Válido por 14 dias
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleActivate}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                data-testid="button-activate-accelerator"
              >
                <Rocket className="h-5 w-5" />
                Comprar e Ativar Acelerador
                <ArrowRight className="h-5 w-5" />
              </Button>

              <button
                onClick={handleSkip}
                className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                data-testid="button-skip-accelerator"
              >
                Não quero multiplicar meus ganhos
              </button>
            </div>

            {/* Urgency Notice */}
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-700 text-center font-medium">
                ⚠️ Oferta expira em {timeLeft.minutes}:{String(timeLeft.seconds).padStart(2, '0')} minutos
              </p>
            </div>
          </div>
        </Card>

        {/* Trust Badges */}
        <div className="flex justify-center gap-4 mt-6">
          <div className="flex items-center gap-1 text-gray-500">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">Garantia de 7 dias</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Trophy className="h-4 w-4" />
            <span className="text-xs">+10.000 usuários</span>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AcceleratorPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          toast({
            title: "Acelerador Ativado!",
            description: "Seus ganhos agora serão dobrados por 3 horas diárias",
          });
          setLocation('/dashboard');
        }}
      />
    </div>
  );
}