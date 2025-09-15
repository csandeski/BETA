import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Trophy, Shield, Check, Clock, Users, Calendar, ArrowLeft, AlertCircle, Star, TrendingUp, Lock, ChevronRight, X, Copy, Heart, BookOpen, Target, Award, Zap, MessageCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/useSound";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { fbPixel } from "@/utils/facebookPixel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { userDataManager } from "@/utils/userDataManager";
import { UtmTracker } from "@/utils/utmTracker";

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
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // Check if user has completed 3 activities
  useEffect(() => {
    const checkAccess = async () => {
      const userData = userDataManager.getUserData();
      
      // If no user data or less than 3 books completed, redirect to dashboard
      if (!userData || !userData.stats?.totalBooksRead || userData.stats.totalBooksRead < 3) {
        setLocation('/dashboard');
        toast({
          title: "Acesso negado",
          description: "Você precisa completar 3 atividades antes de acessar esta página.",
          variant: "destructive"
        });
      }
    };
    
    checkAccess();
  }, [setLocation, toast]);

  const generatePixMutation = useMutation({
    mutationFn: async () => {
      playSound('click');
      
      fbPixel.trackAddToCart({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Supporter Plan',
        content_type: 'product',
        content_ids: ['supporter']
      });

      fbPixel.trackInitiateCheckout({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Supporter Plan',
        num_items: 1
      });

      // Get user data or use defaults
      const userData = userDataManager.getUserData();
      
      // Get UTM parameters
      const utmParams = UtmTracker.getForOrinPay();
      
      const requestBody = {
        plan: 'supporter',
        amount: 29.90,
        fullName: userData?.fullName || 'Usuário Beta Reader',
        email: userData?.email || 'usuario@betareader.com.br',
        cpf: '09092192651', // 090.921.926-51 without formatting
        ...utmParams // Include UTM parameters
      };

      const response = await fetch('/api/payment/generate-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to generate PIX');
      }

      return response.json();
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
        const response = await fetch(`/api/payment/check-status?paymentId=${paymentId}`, {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.status === 'paid') {
          clearInterval(pollInterval);
          setIsCheckingPayment(false);
          
          fbPixel.trackPurchase({
            value: 29.90,
            currency: 'BRL',
            content_name: 'Supporter Plan',
            content_type: 'product',
            content_ids: ['supporter']
          });
          
          await userDataManager.loadUserData();
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          toast({
            title: "Pagamento confirmado!",
            description: "Obrigado por se tornar um apoiador!",
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

  const handleRatingClick = (value: number) => {
    setRating(value);
    playSound('click');
    if (value >= 4) {
      setShowFeedbackForm(true);
    }
  };

  const handleContinueStandard = () => {
    playSound('click');
    toast({
      title: "Continuando no Plano Padrão",
      description: "Você pode mudar de ideia a qualquer momento!",
    });
    setTimeout(() => {
      setLocation('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/20 to-white">
      {/* Header */}
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

      {/* 1. Feedback Section */}
      <section className="px-5 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl mb-4">
            <Star className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Você está gostando do nosso app?
          </h1>
          <p className="text-sm text-gray-600">
            Sua opinião é muito importante para nós
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleRatingClick(value)}
              className="p-2 transition-all hover:scale-110"
              data-testid={`button-rating-${value}`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  value <= rating
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Feedback Form */}
        {showFeedbackForm && (
          <div className="mt-6 bg-white rounded-xl p-4 border border-gray-200 animate-in slide-in-from-bottom-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Deixe um comentário (opcional)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Conte-nos o que você mais gostou..."
              className="w-full resize-none"
              rows={3}
              data-testid="input-feedback"
            />
            <button
              onClick={() => {
                playSound('click');
                toast({
                  title: "Obrigado pelo feedback!",
                  description: "Sua opinião nos ajuda a melhorar",
                });
              }}
              className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              data-testid="button-send-feedback"
            >
              Enviar feedback
            </button>
          </div>
        )}
      </section>

      {/* 2. Who We Are Section */}
      <section className="px-5 py-8 bg-gradient-to-br from-blue-50 to-indigo-50 -mx-5">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Quem Somos
            </h2>
            <p className="text-sm text-gray-600">
              Uma plataforma que conecta leitores e escritores
            </p>
          </div>

          <div className="space-y-4">
            <Card className="p-4 bg-white/90 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Nossa Missão</h3>
                  <p className="text-sm text-gray-600">
                    Realizamos testes de qualidade para editoras, coletando feedback de leitores reais antes do lançamento oficial dos livros.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/90 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Parcerias Especiais</h3>
                  <p className="text-sm text-gray-600">
                    Trabalhamos com autores independentes e mantemos um acervo digital curado especialmente para nossa comunidade.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/90 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Heart className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Sistema Colaborativo</h3>
                  <p className="text-sm text-gray-600">
                    Nosso app é mantido por uma comunidade de apoiadores que acreditam no poder da leitura e querem ajudar a manter o projeto vivo.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Community Section */}
      <section className="px-5 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mb-4">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nossa Comunidade
          </h2>
          <p className="text-sm text-gray-600">
            Juntos, estamos transformando o mercado editorial
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900" data-testid="text-active-users">2.600+</p>
            <p className="text-xs text-gray-600">Leitores ativos</p>
          </Card>

          <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <Award className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900" data-testid="text-years-active">6+ anos</p>
            <p className="text-xs text-gray-600">De atividade</p>
          </Card>

          <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <BookOpen className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900" data-testid="text-books-tested">500+</p>
            <p className="text-xs text-gray-600">Livros testados</p>
          </Card>

          <Card className="p-4 text-center bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
            <Heart className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900" data-testid="text-supporters">1.200+</p>
            <p className="text-xs text-gray-600">Apoiadores</p>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 text-center">
          <p className="text-sm text-green-800">
            <span className="font-semibold">💚 Mensagem da comunidade:</span><br/>
            "Cada apoiador nos ajuda a manter o app gratuito para milhares de leitores que não podem pagar"
          </p>
        </div>
      </section>

      {/* 4. Plan Comparison Section */}
      <section className="px-5 py-8 bg-gradient-to-b from-gray-50 to-white -mx-5">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4">
              <Zap className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Escolha seu plano
            </h2>
            <p className="text-sm text-gray-600">
              Você decide como quer usar o app
            </p>
          </div>

          {/* Standard Plan */}
          <Card className="mb-4 border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Plano Padrão</h3>
                <span className="text-sm font-semibold text-gray-600">Grátis</span>
              </div>
            </div>
            <div className="p-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="p-1 bg-gray-100 rounded">
                    <BookOpen className="h-3 w-3 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700">Limite de 3 livros por dia</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="p-1 bg-gray-100 rounded">
                    <Target className="h-3 w-3 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700">Saque apenas ao atingir R$ 1.800</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="p-1 bg-gray-100 rounded">
                    <MessageCircle className="h-3 w-3 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700">Suporte básico via FAQ</span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Supporter Plan */}
          <Card className="border-2 border-green-500 shadow-lg overflow-hidden relative">
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
              RECOMENDADO
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Plano Apoiador</h3>
                <span className="text-sm font-semibold text-green-100">R$ 29,90</span>
              </div>
            </div>
            <div className="p-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="p-1 bg-green-100 rounded">
                    <BookOpen className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Livros ilimitados por dia</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="p-1 bg-green-100 rounded">
                    <Target className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Saque a partir de R$ 50</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="p-1 bg-green-100 rounded">
                    <MessageCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Suporte prioritário via WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="p-1 bg-green-100 rounded">
                    <Heart className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Ajuda a manter o app para todos</span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Motivational Message */}
          <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
            <div className="flex items-start gap-2">
              <Heart className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-800 font-medium mb-1">
                  Por que se tornar um apoiador?
                </p>
                <p className="text-xs text-gray-600">
                  Além de desbloquear benefícios exclusivos, você ajuda a manter nossa plataforma acessível para estudantes, 
                  professores e amantes da leitura que não podem contribuir financeiramente. 
                  <span className="font-semibold"> Cada apoiador faz a diferença!</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Soft CTA Section */}
      <section className="px-5 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              A escolha é sua
            </h2>
            <p className="text-sm text-gray-600">
              Independente da sua decisão, agradecemos por fazer parte da nossa comunidade
            </p>
          </div>

          <div className="space-y-3">
            {/* Primary CTA - Become a Supporter */}
            <button
              onClick={() => generatePixMutation.mutate()}
              disabled={generatePixMutation.isPending}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              data-testid="button-become-supporter"
            >
              {generatePixMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <Heart className="h-5 w-5 group-hover:animate-pulse" />
                  Quero ser Apoiador
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Secondary CTA - Continue Standard */}
            <button
              onClick={handleContinueStandard}
              className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              data-testid="button-continue-standard"
            >
              Continuar no Plano Padrão
            </button>
          </div>

          {/* Reassurance Message */}
          <p className="text-xs text-center text-gray-500 mt-4">
            Você pode mudar de plano a qualquer momento
          </p>
        </div>
      </section>

      {/* PIX Payment Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] sm:w-auto mx-auto p-0 overflow-hidden max-h-[95vh] flex flex-col rounded-2xl" showCloseButton={false}>
          {/* Header with Timer */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Pagamento Seguro via PIX</h2>
                  <p className="text-xs text-green-100">Transação protegida e verificada</p>
                </div>
              </div>
              <button
                onClick={() => setShowPixModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                data-testid="button-close-pix"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            
            {/* Timer Bar */}
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-2">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-white" />
                <span className="text-white text-sm font-medium">
                  Tempo restante: <span className="font-bold text-lg">{formatTime(pixCountdown)}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            
            {/* Amount Display */}
            <div className="text-center mb-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Valor a pagar</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">R$ 29,90</p>
              <div className="inline-flex items-center gap-1 mt-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                <AlertCircle className="h-3 w-3" />
                Valor reembolsado em 1h
              </div>
            </div>
            
            {/* QR Code */}
            {qrCodeUrl && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-4 border-2 border-gray-200">
                <p className="text-xs text-gray-600 text-center mb-3 font-semibold">Escaneie o QR Code</p>
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-full max-w-[180px] sm:max-w-[200px] mx-auto"
                  data-testid="img-qrcode"
                />
              </div>
            )}
            
            {/* PIX Code */}
            <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 border-2 border-green-200">
              <p className="text-xs text-gray-600 mb-2 sm:mb-3 text-center font-semibold">Ou use o código PIX copia e cola:</p>
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                <textarea
                  value={pixCode}
                  readOnly
                  className="w-full bg-transparent text-[10px] sm:text-xs font-mono text-gray-700 resize-none border-0 outline-none"
                  rows={2}
                  data-testid="input-pix-code"
                />
              </div>
              <Button
                onClick={copyPixCode}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3"
                size="lg"
                data-testid="button-copy-pix"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copiar Código PIX
              </Button>
            </div>
            
            {/* Status - removed annoying checking payment message */}
            
            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
              <h4 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Como fazer o pagamento:
              </h4>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Abra o app do seu banco</li>
                <li>Escolha a opção PIX</li>
                <li>Escaneie o QR Code ou use "Pix Copia e Cola"</li>
                <li>Confirme o pagamento de R$ 29,90</li>
              </ol>
            </div>
            
            {/* Security Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Pagamento 100% seguro e criptografado</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}