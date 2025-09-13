import { useState, useEffect } from "react";
import { CheckCircle2, Shield, Clock, Users, TrendingUp, Zap, Crown, Star, Lock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { QRCodeSVG } from 'qrcode.react';
import { fbPixel } from '@/utils/facebookPixel';
import { useToast } from "@/hooks/use-toast";

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const [showPixModal, setShowPixModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<{
    pixCode: string;
    pixQrCode: string;
    amount: number;
    orderId: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Track page view
    fbPixel.trackViewContent({
      content_name: 'Onboarding Complete',
      content_category: 'qualification'
    });
  }, []);

  // Timer for PIX
  useEffect(() => {
    if (showPixModal && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && showPixModal) {
      toast({
        title: "Tempo expirado",
        description: "O código PIX expirou. Por favor, gere um novo código.",
        variant: "destructive",
      });
      setShowPixModal(false);
      setPixData(null);
      setTimeLeft(300);
    }
  }, [showPixModal, timeLeft, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateRandomValidCPF = () => {
    const randomDigits = () => Math.floor(Math.random() * 10);
    let cpf = Array.from({ length: 9 }, randomDigits);
    
    // Calculate first verification digit
    let sum = cpf.reduce((acc, digit, index) => acc + digit * (10 - index), 0);
    let firstVerifier = (sum * 10) % 11;
    if (firstVerifier === 10) firstVerifier = 0;
    cpf.push(firstVerifier);
    
    // Calculate second verification digit
    sum = cpf.reduce((acc, digit, index) => acc + digit * (11 - index), 0);
    let secondVerifier = (sum * 10) % 11;
    if (secondVerifier === 10) secondVerifier = 0;
    cpf.push(secondVerifier);
    
    return cpf.join('');
  };

  const handleActivatePlan = async () => {
    setIsProcessing(true);
    
    // Track Initiate Checkout
    fbPixel.trackInitiateCheckout({
      value: 29.90,
      currency: 'BRL',
      content_name: 'Beta Reader Premium',
      content_category: 'plan_upgrade',
      content_ids: ['premium'],
      content_type: 'product',
      num_items: 1,
      plan: 'premium',
      paymentMethod: 'pix'
    });

    // Generate PIX
    await handleGeneratePix();
  };

  const handleGeneratePix = async () => {
    try {
      const cleanedCpf = generateRandomValidCPF();
      
      const requestBody = {
        plan: 'premium',
        amount: 29.90,
        email: 'user@example.com',
        cpf: cleanedCpf,
        fullName: 'Usuário Beta Reader',
      };
      
      const response = await fetch('/api/payment/generate-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PIX');
      }

      const data = await response.json();
      
      setPixData({
        pixCode: data.pixCode,
        pixQrCode: data.pixQrCode,
        amount: data.amount,
        orderId: data.orderId
      });
      
      setShowPixModal(true);
      setTimeLeft(300);

      // Track PIX generation
      fbPixel.trackAddPaymentInfo({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Beta Reader Premium',
        content_category: 'plan_upgrade'
      });

      // Start payment polling
      startPaymentPolling(data.orderId);
    } catch (error) {
      console.error('Error generating PIX:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startPaymentPolling = (orderId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/check-status/${orderId}`);
        const data = await response.json();
        
        if (data.status === 'paid') {
          clearInterval(pollInterval);
          
          // Track successful payment
          fbPixel.trackPurchase({
            value: 29.90,
            currency: 'BRL',
            content_name: 'Beta Reader Premium',
            content_category: 'plan_upgrade',
            content_ids: ['premium'],
            content_type: 'product',
            num_items: 1
          });
          
          toast({
            title: "Pagamento confirmado!",
            description: "Seu plano foi ativado com sucesso.",
          });
          
          // Redirect to dashboard
          setTimeout(() => {
            setLocation('/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 5000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  const copyToClipboard = async () => {
    if (pixData?.pixCode) {
      await navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamento.",
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-green-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Parabéns! Você completou as atividades!
          </h1>
          <p className="text-xl text-gray-600">
            Você viu como é fácil trabalhar em casa usando Beta Reader?
          </p>
        </div>

        {/* Social Proof Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-green-100">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">2.600+</h3>
              <p className="text-sm text-gray-600">Usuários ativos diariamente</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">6+ Anos</h3>
              <p className="text-sm text-gray-600">No mercado internacional</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">36 Vagas</h3>
              <p className="text-sm text-gray-600">Restantes no projeto</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              🎉 Agora que você já conhece nosso app, pode ter a chance de participar!
            </h2>
            <p className="text-gray-700 mb-4">
              Nós temos mais de <strong>2.600 usuários ativos</strong> todos os dias, e há mais de <strong>6 anos no mercado internacional</strong> abrimos as portas para o mercado Brasileiro!
            </p>
            <p className="text-gray-700">
              Atualmente nós temos apenas <strong className="text-orange-600">36 vagas restantes</strong> para nosso projeto e agora que você já conhece nosso app pode ter a chance de participar!
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">
                  Segurança para todos os usuários
                </h3>
                <p className="text-gray-700 mb-3">
                  Para mantermos toda estrutura e segurança de nossos sistemas, pedimos a ativação de um plano, para que você possa ter segurança com seus pagamentos e todos os nossos usuários também.
                </p>
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                  <p className="text-green-900 font-medium">
                    💰 O valor do plano é para confirmar se você é um <strong>USUÁRIO REAL</strong>
                  </p>
                  <p className="text-green-800 text-sm mt-1">
                    O valor é <strong>REEMBOLSADO em até 1 hora</strong> para a conta de origem
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Plan Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-green-500">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-6 w-6 text-yellow-300" />
                  <h2 className="text-2xl font-bold text-white">Plano Premium Beta Reader</h2>
                </div>
                <p className="text-green-100">Acesso completo à plataforma</p>
              </div>
              <div className="text-right">
                <p className="text-green-100 text-sm line-through">R$ 59,90</p>
                <p className="text-3xl font-bold text-white">R$ 29,90</p>
                <p className="text-green-100 text-xs">Reembolsável</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Benefícios inclusos:</h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Saques ilimitados</p>
                  <p className="text-sm text-gray-600">Retire seus ganhos quando quiser</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Atividades premium</p>
                  <p className="text-sm text-gray-600">Acesso a livros com recompensas maiores</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Suporte prioritário</p>
                  <p className="text-sm text-gray-600">Atendimento rápido e personalizado</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Garantia de reembolso</p>
                  <p className="text-sm text-gray-600">Valor devolvido em até 1 hora</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleActivatePlan}
              disabled={isProcessing}
              className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg"
              data-testid="button-activate-premium"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Processando...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Ativar Plano Premium - R$ 29,90
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500 mt-3">
              Pagamento seguro via PIX • Reembolso garantido
            </p>
          </div>
        </div>

        {/* Urgency Notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full">
            <Clock className="h-4 w-4" />
            <p className="text-sm font-medium">
              Apenas 36 vagas restantes - Garanta a sua agora!
            </p>
          </div>
        </div>
      </div>

      {/* PIX Modal */}
      {showPixModal && pixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPixModal(false)}
          />
          
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl">
            <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-5 rounded-t-2xl border-b border-green-100">
              <button
                onClick={() => setShowPixModal(false)}
                className="absolute right-4 top-4 p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <span className="text-gray-600">×</span>
              </button>
              <div className="flex items-center justify-between pr-8">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">PIX Gerado!</h2>
                  <p className="text-sm text-gray-600">Escaneie ou copie o código</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  timeLeft > 60 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-center p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                <QRCodeSVG
                  value={pixData.pixQrCode}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">Valor a pagar</p>
                <p className="text-3xl font-bold text-gray-900">R$ 29,90</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código PIX (copia e cola)
                </label>
                <div className="space-y-3">
                  <textarea
                    readOnly
                    value={pixData.pixCode}
                    className="w-full p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg resize-none"
                    rows={4}
                  />
                  <button
                    onClick={copyToClipboard}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02]"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Código Copiado!
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copiar Código PIX
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Como pagar:</strong> Abra o app do seu banco, vá em PIX, escolha "Pix Copia e Cola" e cole o código acima.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}