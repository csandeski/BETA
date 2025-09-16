import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { userDataManager } from "@/utils/userDataManager";
import { useSound } from "@/hooks/useSound";
import { fbPixel } from "@/utils/facebookPixel";
import { UtmTracker } from "@/utils/utmTracker";
import QRCode from "react-qr-code";
import {
  Heart,
  ChevronRight,
  ChevronLeft,
  Shield,
  X,
  Clock,
  Copy,
  AlertCircle,
  BookOpen,
  Target,
  Users,
  Award,
  Zap,
  MessageCircle,
  Sparkles,
  Check,
  CheckCircle,
  Star,
  ThumbsUp,
  Smile,
  Gift,
  CreditCard,
  Loader2
} from "lucide-react";

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { playSound } = useSound();
  
  // Step management - restore state from localStorage
  const [currentStep, setCurrentStep] = useState(() => {
    const savedPricing = localStorage.getItem('pricing_seen_v1') === 'true';
    return savedPricing ? 5 : 1;  // Start at pricing if already seen (step 5 now)
  });
  const [hasSeenPricing, setHasSeenPricing] = useState(() => {
    return localStorage.getItem('pricing_seen_v1') === 'true';
  });
  
  // User data
  const [userFullName, setUserFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userCPF, setUserCPF] = useState("");
  
  // Payment state
  const [showPixModal, setShowPixModal] = useState(false);
  const [showGeneratingPix, setShowGeneratingPix] = useState(false);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixCountdown, setPixCountdown] = useState(600);
  const [isPixExpired, setIsPixExpired] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [checkoutTimer, setCheckoutTimer] = useState(600);

  // Check if user has completed 3 activities
  useEffect(() => {
    const checkAccess = async () => {
      // Check if logged in user
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      
      let userData = null;
      
      if (authData.isLoggedIn && authData.userId) {
        // Logged in user
        userData = userDataManager.getUserData();
      } else {
        // Guest user - check localStorage
        const guestDataStr = localStorage.getItem('guestUserData');
        if (guestDataStr) {
          userData = JSON.parse(guestDataStr);
        }
      }
      
      // If no user data or less than 5 books completed, redirect to dashboard
      if (!userData || !userData.stats?.totalBooksRead || userData.stats.totalBooksRead < 5) {
        setLocation('/dashboard');
        toast({
          title: "Acesso negado",
          description: "Você precisa completar 5 atividades antes de acessar esta página.",
          variant: "destructive"
        });
      }
    };
    
    checkAccess();
  }, [setLocation, toast]);

  // Block navigation once pricing is seen
  useEffect(() => {
    if (hasSeenPricing) {
      const handleBlockedAction = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        // Always redirect to pricing step
        setCurrentStep(5);
        toast({
          title: "Ação bloqueada",
          description: "Complete o pagamento para continuar usando o app",
          variant: "destructive"
        });
      };
      
      // Intercept all clicks outside the payment flow
      const handleGlobalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isPaymentFlow = target.closest('[data-payment-flow="true"]');
        if (!isPaymentFlow) {
          handleBlockedAction(e);
        }
      };
      
      document.addEventListener('click', handleGlobalClick, true);
      window.addEventListener('popstate', handleBlockedAction);
      
      return () => {
        document.removeEventListener('click', handleGlobalClick, true);
        window.removeEventListener('popstate', handleBlockedAction);
      };
    }
  }, [hasSeenPricing, toast]);

  // Countdown timer for checkout
  useEffect(() => {
    if (currentStep === 6 && checkoutTimer > 0) {
      const interval = setInterval(() => {
        setCheckoutTimer((prev) => {
          if (prev <= 1) {
            toast({
              title: "Tempo esgotado!",
              description: "Reiniciando processo de pagamento...",
              variant: "destructive"
            });
            setCurrentStep(5);
            setCheckoutTimer(600);
            return 600;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentStep, checkoutTimer, toast]);

  // PIX countdown
  useEffect(() => {
    if (showPixModal && pixCountdown > 0 && !isPixExpired) {
      const interval = setInterval(() => {
        setPixCountdown((prev) => {
          if (prev <= 1) {
            setIsPixExpired(true);
            setShowPixModal(false);
            toast({
              title: "PIX expirado",
              description: "O código PIX expirou. Gere um novo código para continuar.",
              variant: "destructive"
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showPixModal, pixCountdown, isPixExpired, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
    // Mark as seen when entering pricing step (now step 4)
    if (currentStep === 4) {
      setHasSeenPricing(true);
      localStorage.setItem('pricing_seen_v1', 'true');
    }
  };

  const handleActivateAccount = () => {
    setCurrentStep(6);
  };

  const validateForm = () => {
    if (!userFullName || userFullName.length < 3) {
      toast({
        title: "Nome inválido",
        description: "Por favor, insira seu nome completo",
        variant: "destructive"
      });
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userEmail || !emailRegex.test(userEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido",
        variant: "destructive"
      });
      return false;
    }
    
    const cleanPhone = userPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, insira um telefone válido",
        variant: "destructive"
      });
      return false;
    }
    
    const cleanCPF = userCPF.replace(/\D/g, '');
    if (!cleanCPF || cleanCPF.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido com 11 dígitos",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const generatePixMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error('Formulário inválido');
      }
      
      setShowGeneratingPix(true);
      playSound('click');
      
      fbPixel.trackInitiateCheckout({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Account Activation',
        num_items: 1
      });

      const utmParams = UtmTracker.getForOrinPay();
      const cleanCPF = userCPF.replace(/\D/g, '');
      const cleanPhone = userPhone.replace(/\D/g, '');
      
      const requestBody = {
        plan: 'supporter',
        amount: 29.90,
        fullName: userFullName,
        email: userEmail,
        phone: cleanPhone,
        cpf: cleanCPF,
        ...utmParams
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
        throw new Error('Falha ao gerar PIX');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setShowGeneratingPix(false);
      if (data.pixCode && data.paymentId) {
        setPixCode(data.pixCode);
        setPixPaymentId(data.paymentId);
        setShowPixModal(true);
        setPixCountdown(600);
        setIsPixExpired(false);
        
        fbPixel.trackAddPaymentInfo({
          value: 29.90,
          currency: 'BRL',
          content_name: 'Account Activation'
        });
        
        startPollingPaymentStatus(data.paymentId);
      }
    },
    onError: (error: any) => {
      setShowGeneratingPix(false);
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível gerar o PIX. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const startPollingPaymentStatus = (paymentId: string) => {
    let pollCount = 0;
    const maxPolls = 120;
    
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
            content_name: 'Account Activation',
            content_type: 'product'
          });
          
          await userDataManager.loadUserData();
          queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
          queryClient.invalidateQueries({ queryKey: ['/api/users/data'] });
          
          // Clear the pricing seen flag since they've paid
          localStorage.removeItem('pricing_seen_v1');
          
          toast({
            title: "Pagamento confirmado! 🎉",
            description: "Sua conta foi ativada com sucesso!",
          });
          
          playSound('reward');
          setShowPixModal(false);
          
          // Force full page reload to re-evaluate global guards
          setTimeout(() => {
            window.location.href = '/dashboard';
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
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      playSound('click');
      toast({
        title: "Código copiado!",
        description: "Cole o código no app do seu banco",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white" data-payment-flow="true">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="h-2 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>
        {currentStep === 6 && (
          <div className="bg-red-50 border-b border-red-200 py-2 px-4">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-red-600 animate-pulse" />
              <span className="text-sm font-bold text-red-600">
                Tempo restante: {formatTime(checkoutTimer)}
              </span>
              <span className="text-xs text-red-500">
                Complete o pagamento antes que o tempo acabe
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 py-16">
        {/* Step 1: Congratulations for completing activities */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-3xl mb-6">
                <Award className="h-12 w-12 text-orange-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Parabéns por concluir suas atividades! 🎉
              </h1>
              <p className="text-gray-600 mb-4">
                Você completou com sucesso as 5 primeiras atividades em nosso app.
              </p>
              <p className="text-gray-700 font-medium mb-6">
                Agora você conheceu e aprendeu de fato como o Beta Reader funciona!
              </p>
            </div>

            <Card className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">Apenas 26 vagas</p>
                  <p className="text-sm text-gray-600">disponíveis no momento</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-2">Vagas limitadas!</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">21 de 26 vagas já preenchidas</p>
              </div>
            </Card>

            <div className="space-y-3">
              <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Você está qualificado!</p>
                  <p className="text-sm text-gray-600">Demonstrou dedicação e comprometimento</p>
                </div>
              </Card>
              
              <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                <Sparkles className="h-6 w-6 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Acesso exclusivo</p>
                  <p className="text-sm text-gray-600">Entre agora para o grupo seleto de leitores</p>
                </div>
              </Card>
            </div>

            <button
              onClick={handleNextStep}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-xl flex items-center justify-center gap-2 animate-pulse-slow"
              data-payment-flow="true"
              data-testid="button-continue"
            >
              Continuar
              <ChevronRight className="h-5 w-5" />
            </button>

            <p className="text-center text-xs text-gray-500">
              Garanta sua vaga antes que acabe!
            </p>
          </div>
        )}

        {/* Step 2: Are you enjoying our app? */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl mb-6">
                <Heart className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Você está gostando do nosso app?
              </h1>
              <p className="text-gray-600 mb-8">
                Sua opinião é muito importante para nós!
              </p>
            </div>

            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className="p-2 hover:scale-110 transition-transform"
                  data-testid={`button-star-${star}`}
                >
                  <Star className="h-10 w-10 text-yellow-400 fill-yellow-400" />
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card className="p-4 text-center hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500">
                <ThumbsUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">Adorei!</p>
              </Card>
              <Card className="p-4 text-center hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500">
                <Smile className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">Muito bom</p>
              </Card>
            </div>

            <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <Gift className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-800 font-semibold mb-1">
                    Obrigado pelo feedback!
                  </p>
                  <p className="text-xs text-gray-600">
                    Você já completou 5 atividades e desbloqueou acesso a uma experiência ainda melhor
                  </p>
                </div>
              </div>
            </Card>

            <Button
              onClick={handleNextStep}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              data-testid="button-continue-step2"
            >
              Continuar
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 3: Who We Are */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl mb-4">
                <BookOpen className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Quem Somos
              </h2>
              <p className="text-sm text-gray-600">
                Conheça nossa missão e comunidade
              </p>
            </div>

            <div className="space-y-4">
              <Card className="p-5 bg-white/90 backdrop-blur border-2 border-green-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Nossa Missão</h3>
                    <p className="text-sm text-gray-600">
                      Conectamos leitores apaixonados com escritores talentosos, oferecendo feedback valioso antes do lançamento oficial dos livros.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-white/90 backdrop-blur border-2 border-purple-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Comunidade Ativa</h3>
                    <p className="text-sm text-gray-600">
                      Mais de 2.600 leitores ativos que já testaram mais de 500 livros em 6 anos de atividade.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-white/90 backdrop-blur border-2 border-orange-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <Heart className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Sistema Colaborativo</h3>
                    <p className="text-sm text-gray-600">
                      Mantido por uma comunidade de apoiadores que acreditam no poder da leitura.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">2.600+</p>
                <p className="text-xs text-gray-600">Leitores ativos</p>
              </Card>

              <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <Award className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">6+ anos</p>
                <p className="text-xs text-gray-600">De atividade</p>
              </Card>
            </div>

            <Button
              onClick={handleNextStep}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              data-testid="button-continue-step2"
            >
              Continuar
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 4: Maintenance Fee Message */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl mb-4">
                <Zap className="h-10 w-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Continue sua jornada de leitura
              </h2>
              <p className="text-gray-600 mb-2">
                Para continuar usando o Beta Reader sem limites, cobramos uma 
                <span className="font-bold text-green-600"> taxa única de manutenção </span>
                para ativação da sua conta em nossos sistemas.
              </p>
            </div>

            <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-6 w-6 text-orange-500" />
                <h3 className="font-bold text-gray-900">Por que cobramos?</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Manter servidores e infraestrutura funcionando 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Garantir suporte prioritário via WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Desenvolver novos recursos e melhorias</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Manter o app gratuito para quem não pode pagar</span>
                </li>
              </ul>
            </Card>

            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 text-center">
              <p className="text-sm text-green-800 font-semibold">
                💚 Junte-se a mais de 1.200 apoiadores que mantêm nossa comunidade viva!
              </p>
            </div>

            <Button
              onClick={handleNextStep}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              data-testid="button-continue-step3"
            >
              Ver valor da ativação
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 5: Pricing Card */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ative sua conta agora
              </h2>
              <p className="text-sm text-gray-600">
                Pagamento único, benefícios para sempre
              </p>
            </div>

            {/* Price Card - Mobile Optimized */}
            <div className="relative">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>OFERTA ESPECIAL</span>
                </div>
              </div>

              <Card className="relative mt-2 overflow-hidden border-2 border-green-300 shadow-2xl">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 opacity-50" />
                
                {/* Header */}
                <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-8">
                  <div className="text-center">
                    <h3 className="text-white font-bold text-2xl mb-2">Ativação Premium</h3>
                    <p className="text-green-100 text-sm">Acesso completo e ilimitado</p>
                    
                    {/* Price */}
                    <div className="mt-6">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-green-100 text-sm line-through">R$ 49,90</span>
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          -40%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-white text-lg">R$</span>
                        <span className="text-white text-5xl font-bold">29</span>
                        <span className="text-white text-2xl">,90</span>
                      </div>
                      <p className="text-green-100 text-xs font-semibold mt-2">
                        PAGAMENTO ÚNICO
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="relative p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                      <BookOpen className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-bold block">Livros ilimitados</span>
                      <span className="text-xs text-gray-600">Leia quantos quiser, sem restrições</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-bold block">Saque desde R$ 50</span>
                      <span className="text-xs text-gray-600">36x mais rápido que usuários free</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-bold block">Suporte VIP WhatsApp</span>
                      <span className="text-xs text-gray-600">Atendimento prioritário e exclusivo</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-3 border-t border-green-100">
                    <div className="p-1.5 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
                      <Heart className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-bold block">Apoie a comunidade</span>
                      <span className="text-xs text-gray-600">Ajude outros leitores a ter acesso</span>
                    </div>
                  </div>

                  {/* Urgency Box */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-xs font-bold text-red-700">Oferta por tempo limitado!</p>
                        <p className="text-xs text-red-600">Preço normal: R$ 49,90</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={handleActivateAccount}
                    className="relative w-full group"
                    style={{
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                    data-testid="button-activate-account"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-green-700 to-green-900 rounded-2xl translate-y-2 blur-sm opacity-50"></div>
                    
                    <div 
                      className="relative py-5 px-6 rounded-2xl transform transition-all duration-200 group-hover:translate-y-0.5 group-active:translate-y-1"
                      style={{
                        background: 'linear-gradient(180deg, #22c55e 0%, #10b981 50%, #059669 100%)',
                        boxShadow: `
                          0 8px 0 #047857,
                          0 8px 20px rgba(34, 197, 94, 0.4),
                          inset 0 2px 0 rgba(255, 255, 255, 0.3),
                          inset 0 -2px 0 rgba(0, 0, 0, 0.2)
                        `
                      }}
                    >
                      <div className="absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>
                      
                      <div className="relative flex items-center justify-center gap-3">
                        <Zap className="h-6 w-6 text-white drop-shadow-md" />
                        <span className="text-white font-bold text-lg drop-shadow-md">Quero ativar minha conta</span>
                        <ChevronRight className="h-5 w-5 text-white drop-shadow-md group-hover:translate-x-1 transition-transform" />
                      </div>
                      
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%)',
                          animation: 'shine 0.8s ease-in-out'
                        }}
                      ></div>
                    </div>
                  </button>

                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Pagamento 100% seguro via PIX</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Testimonial */}
            <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 italic mb-2">
                "Vale cada centavo! Agora leio sem limites e ainda ganho muito mais rápido!"
              </p>
              <p className="text-xs text-gray-500 font-semibold">- Maria Silva, membro há 2 anos</p>
            </Card>
          </div>
        )}

        {/* Step 6: Checkout Form */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Finalize sua ativação
              </h2>
              <p className="text-sm text-gray-600">
                Preencha seus dados para gerar o PIX
              </p>
            </div>

            {/* Checkout Summary */}
            <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">Ativação Premium</p>
                  <p className="text-xs text-gray-600">Acesso ilimitado vitalício</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 line-through">R$ 49,90</p>
                  <p className="text-2xl font-bold text-green-600">R$ 29,90</p>
                </div>
              </div>
              <div className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                <Gift className="h-3 w-3" />
                <span>Economia de R$ 20,00</span>
              </div>
            </Card>

            {/* User Data Form */}
            <Card className="p-4 space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-semibold mb-1.5 block">
                  Nome Completo
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="João da Silva"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  className="h-12 text-base"
                  data-testid="input-full-name"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-semibold mb-1.5 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="h-12 text-base"
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-semibold mb-1.5 block">
                  WhatsApp
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={userPhone}
                  onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                  className="h-12 text-base"
                  data-testid="input-phone"
                  maxLength={15}
                />
              </div>

              <div>
                <Label htmlFor="cpf" className="text-sm font-semibold mb-1.5 block">
                  CPF
                </Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="123.456.789-00"
                  value={userCPF}
                  onChange={(e) => setUserCPF(formatCPF(e.target.value))}
                  className="h-12 text-base"
                  data-testid="input-cpf"
                  maxLength={14}
                />
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-4 border-2 border-green-300 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <img 
                    src="https://logodownload.org/wp-content/uploads/2020/02/pix-bc-logo.png" 
                    alt="PIX" 
                    className="h-8 w-auto"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Pagamento via PIX</p>
                  <p className="text-xs text-gray-600">Aprovação instantânea</p>
                </div>
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </Card>

            {/* Generate PIX Button */}
            <Button
              onClick={() => generatePixMutation.mutate()}
              disabled={generatePixMutation.isPending}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
              data-testid="button-generate-pix"
            >
              {generatePixMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Gerar PIX de Inscrição
                </>
              )}
            </Button>

            {/* Security Note */}
            <div className="text-center text-xs text-gray-500">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Ambiente 100% seguro e criptografado</span>
              </div>
              <p>Seus dados estão protegidos e não serão compartilhados</p>
            </div>
          </div>
        )}
      </div>

      {/* Generating PIX Popup */}
      {showGeneratingPix && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-sm w-full">
            <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">GERANDO PIX</h3>
            <p className="text-sm text-gray-600">Aguarde enquanto preparamos seu pagamento...</p>
          </Card>
        </div>
      )}

      {/* PIX Payment Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh]" data-payment-flow="true">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4">
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
            </div>
            
            {/* QR Code */}
            {pixCode && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-4 border-2 border-gray-200">
                <p className="text-xs text-gray-600 text-center mb-3 font-semibold">Escaneie o QR Code</p>
                <div className="bg-white p-4 rounded-lg mx-auto max-w-[200px]">
                  <QRCode
                    value={pixCode}
                    size={172}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 172 172`}
                    level="M"
                    data-testid="img-qrcode"
                  />
                </div>
              </div>
            )}
            
            {/* PIX Code */}
            <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 border-2 border-green-200">
              <p className="text-xs text-gray-600 mb-2 sm:mb-3 text-center font-semibold">Ou use o código PIX copia e cola:</p>
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                <textarea
                  value={pixCode || ''}
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