import { useState } from "react";
import { useLocation } from "wouter";
import { Trophy, Shield, Check, Clock, Users, Calendar, ArrowLeft, AlertCircle, Star, TrendingUp, Lock, ChevronRight, X, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/useSound";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import * as fbPixel from "@/utils/facebookPixel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { userDataManager } from "@/utils/userDataManager";

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [pixCountdown, setPixCountdown] = useState(300);
  const [isPixExpired, setIsPixExpired] = useState(false);

  const generatePixMutation = useMutation({
    mutationFn: async () => {
      playSound('click');
      
      fbPixel.trackAddToCart({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Premium Plan',
        content_type: 'product',
        content_ids: ['premium']
      });

      fbPixel.trackInitiateCheckout({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Premium Plan',
        num_items: 1
      });

      const requestBody = {
        plan: 'premium',
        amount: 29.90,
      };

      return apiRequest('/api/payment/generate-pix', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
    },
    onSuccess: (data) => {
      if (data.pixCode && data.qrCodeUrl && data.paymentId) {
        setPixCode(data.pixCode);
        setQrCodeUrl(data.qrCodeUrl);
        setPaymentId(data.paymentId);
        setShowPixModal(true);
        setPixCountdown(300);
        setIsPixExpired(false);
        
        fbPixel.trackAddPaymentInfo({
          value: 29.90,
          currency: 'BRL',
          content_name: 'Premium Plan'
        });
        
        startCountdown();
        startPollingPaymentStatus(data.paymentId);
      } else {
        throw new Error('Invalid response from payment API');
      }
    },
    onError: (error: any) => {
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: error.message || "Não foi possível gerar o PIX. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const startCountdown = () => {
    const interval = setInterval(() => {
      setPixCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsPixExpired(true);
          setShowPixModal(false);
          toast({
            title: "PIX expirado",
            description: "O código PIX expirou. Gere um novo código para continuar.",
            variant: "destructive",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPollingPaymentStatus = (paymentId: string) => {
    let pollCount = 0;
    const maxPolls = 60;
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      if (pollCount >= maxPolls || isPixExpired) {
        clearInterval(pollInterval);
        setIsCheckingPayment(false);
        return;
      }

      try {
        setIsCheckingPayment(true);
        const response = await apiRequest(`/api/payment/check-status?paymentId=${paymentId}`);
        
        if (response.status === 'paid') {
          clearInterval(pollInterval);
          setIsCheckingPayment(false);
          
          fbPixel.trackPurchase({
            value: 29.90,
            currency: 'BRL',
            content_name: 'Premium Plan',
            content_type: 'product',
            content_ids: ['premium']
          });
          
          await userDataManager.loadUserData();
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          toast({
            title: "Pagamento confirmado!",
            description: "Seu plano Premium foi ativado com sucesso.",
          });
          
          playSound('reward');
          setShowPixModal(false);
          
          setTimeout(() => {
            setLocation('/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        setIsCheckingPayment(false);
      }
    }, 5000);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    playSound('click');
    toast({
      title: "Código copiado!",
      description: "Cole o código no app do seu banco",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/20 to-white">
      {/* Header - same style as dashboard */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-green-100/50 px-5 py-4 flex items-center justify-between z-10">
        <button
          onClick={() => {
            playSound('click');
            setLocation("/dashboard");
          }}
          className="p-2.5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-gray-600 hover:text-gray-900 hover:from-gray-100 hover:to-gray-200 transition-all"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Beta Reader</span>
          <span className="text-xs px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-bold">
            BRASIL
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-5 py-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl">
            <Trophy className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Parabéns! Você completou as
          <span className="text-green-500 block">primeiras atividades!</span>
        </h1>
        
        <p className="text-sm text-gray-600">
          Agora ative seu plano para continuar ganhando
        </p>
      </section>

      {/* Social Proof Stats */}
      <section className="px-5 pb-6">
        <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex justify-center mb-1">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-gray-900" data-testid="text-users-count">2.600+</p>
              <p className="text-xs text-gray-600">usuários ativos</p>
            </div>
            
            <div className="text-center border-x border-gray-100">
              <div className="flex justify-center mb-1">
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-gray-900" data-testid="text-years">6+ anos</p>
              <p className="text-xs text-gray-600">de experiência</p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-gray-900" data-testid="text-spots">36 vagas</p>
              <p className="text-xs text-gray-600">disponíveis</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Guarantee Section */}
      <section className="px-5 pb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Ativação 100% Segura
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Pagamento via PIX com proteção total dos seus dados
              </p>
              
              {/* Guarantee Box */}
              <div className="bg-green-100/50 rounded-xl p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-green-700" />
                  <span className="text-xs font-semibold text-green-900">Garantia Total</span>
                </div>
                <p className="text-xs text-green-800">
                  Valor reembolsado em até 1 hora se não gostar, sem perguntas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Plan Card */}
      <section className="px-5 pb-8">
        <Card className="border-2 border-green-500 shadow-lg overflow-hidden">
          {/* Plan Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Plano Premium</h2>
                <p className="text-xs text-green-100 mt-0.5">Ativação única • Sem mensalidades</p>
              </div>
              <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
            </div>
          </div>
          
          {/* Price Section */}
          <div className="px-5 py-6 bg-white text-center border-b border-gray-100">
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg text-gray-400 line-through">R$ 59,90</span>
              <div>
                <span className="text-3xl font-bold text-gray-900" data-testid="text-price-2990">R$ 29,90</span>
                <p className="text-xs text-green-600 font-semibold mt-1">Reembolsável</p>
              </div>
            </div>
          </div>
          
          {/* Benefits */}
          <div className="px-5 py-4 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">O que você recebe:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Saques ilimitados do seu saldo</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Acesso a atividades premium exclusivas</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Suporte prioritário via WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Garantia de 30 dias ou dinheiro de volta</span>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="p-5">
            <button
              onClick={() => generatePixMutation.mutate()}
              disabled={generatePixMutation.isPending}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-activate-premium"
            >
              {generatePixMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Ativar Plano Premium
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <section className="px-5 pb-6 text-center">
        <p className="text-xs text-gray-500">
          Pagamento processado com segurança • Seus dados estão protegidos
        </p>
      </section>

      {/* PIX Payment Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-md mx-auto p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-4 border-b border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pagamento PIX</h2>
                <p className="text-xs text-gray-600 mt-0.5">Escaneie ou copie o código</p>
              </div>
              <button
                onClick={() => setShowPixModal(false)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                data-testid="button-close-pix"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Countdown Timer */}
            <div className="flex items-center justify-center gap-2 mb-4 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700">
                Código expira em: <span className="font-bold text-green-600">{formatTime(pixCountdown)}</span>
              </span>
            </div>
            
            {/* QR Code */}
            {qrCodeUrl && (
              <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-full max-w-[200px] mx-auto"
                  data-testid="img-qrcode"
                />
              </div>
            )}
            
            {/* PIX Code */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-2 text-center">Ou copie o código PIX:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pixCode}
                  readOnly
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-700"
                  data-testid="input-pix-code"
                />
                <Button
                  onClick={copyPixCode}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  size="sm"
                  data-testid="button-copy-pix"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>
            
            {/* Status */}
            {isCheckingPayment && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent" />
                Verificando pagamento...
              </div>
            )}
            
            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Como pagar:</strong> Abra o app do seu banco, escolha pagar com PIX, 
                escaneie o QR Code ou cole o código copiado.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}