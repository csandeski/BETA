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
    return savedPricing ? 2 : 1;  // Start at pricing if already seen (step 2 now)
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
    if (currentStep === 3 && checkoutTimer > 0) {
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
    // Mark as seen when entering pricing step (now step 2)
    if (currentStep === 1) {
      setHasSeenPricing(true);
      localStorage.setItem('pricing_seen_v1', 'true');
    }
  };

  const handleActivateAccount = () => {
    setCurrentStep(3);
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
        value: 29.00,
        currency: 'BRL',
        content_name: 'Account Activation',
        num_items: 1
      });

      const utmParams = UtmTracker.getForOrinPay();
      const cleanCPF = userCPF.replace(/\D/g, '');
      const cleanPhone = userPhone.replace(/\D/g, '');
      
      const requestBody = {
        plan: 'supporter',
        amount: 29.00,
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
          value: 29.00,
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
            value: 29.00,
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
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
        {currentStep === 3 && (
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
        {/* Step 1: Are you enjoying Beta Reader? */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl mb-6">
                <Heart className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Você está gostando do Beta Reader?
              </h1>
              <p className="text-gray-600 mb-8">
                Nossa plataforma já ajudou milhares de leitores!
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
                    Você já completou 3 atividades e desbloqueou acesso a uma experiência ainda melhor
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

        {/* Step 2: Pricing Card */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ative sua conta agora
              </h2>
              <p className="text-sm text-gray-600">
                Pagamento único, benefícios para sempre
              </p>
            </div>

            {/* Limited Spots Alert - Compact Design */}
            <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-xl p-[2px] mb-6 shadow-lg">
              <div className="bg-white rounded-[10px] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center animate-pulse">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        🔥 Restam apenas <span className="text-red-600">26 vagas!</span>
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Oferta limitada • Garanta agora
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                      81%
                    </p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">ocupado</p>
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out animate-pulse" 
                         style={{ width: '81%' }}>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-gray-500">21 de 26 vagas preenchidas</p>
                    <p className="text-[10px] font-semibold text-red-600">Últimas 5!</p>
                  </div>
                </div>
              </div>
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
                        <span className="text-white text-2xl">,00</span>
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
                      <span className="text-gray-800 font-bold block">Atividades Ilimitadas</span>
                      <span className="text-xs text-gray-600">Leia quantos quiser, sem restrições</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-bold block">Saque sem valor mínimo</span>
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
                        <span className="text-white font-bold text-lg drop-shadow-md">Ativar minha Conta</span>
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

            {/* Testimonials Section */}
            <div className="space-y-3">
              {/* Testimonials Header with Stats */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base">Avaliações dos Usuários</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-yellow-400">4.9/5.0</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-300">Total de feedbacks</p>
                    <p className="text-sm font-bold">884 comentários</p>
                    <p className="text-xs text-gray-400">533 avaliações</p>
                  </div>
                </div>
              </div>

              {/* Individual Testimonials */}
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {/* Testimonial 1 */}
                <Card className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      MS
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Maria Silva</span>
                        <span className="text-xs text-gray-500">• há 2 anos</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Vale cada centavo! Agora leio sem limites e ainda ganho muito mais rápido!"
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 2 */}
                <Card className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      PC
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Pedro Costa</span>
                        <span className="text-xs text-gray-500">• há 8 meses</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Melhor investimento que fiz! Já recuperei o valor no primeiro mês."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 3 */}
                <Card className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      AF
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Ana Ferreira</span>
                        <span className="text-xs text-gray-500">• há 1 ano</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Suporte VIP faz toda a diferença! Respondem em minutos."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 4 */}
                <Card className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      JO
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">João Oliveira</span>
                        <span className="text-xs text-gray-500">• há 3 meses</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Saque sem valor mínimo é perfeito! Posso sacar quando quiser."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 5 */}
                <Card className="p-3 bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      LS
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Lucia Santos</span>
                        <span className="text-xs text-gray-500">• há 6 meses</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 4].map((star, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Ótima plataforma! Só gostaria de mais livros de romance."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 6 */}
                <Card className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      RM
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Rafael Mendes</span>
                        <span className="text-xs text-gray-500">• há 2 semanas</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Impressionante! Já li 15 livros esse mês e ganhei R$ 450!"
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 7 */}
                <Card className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      BG
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Beatriz Gomes</span>
                        <span className="text-xs text-gray-500">• há 5 meses</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Pagamento único é ótimo! Sem mensalidades me preocupando."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 8 */}
                <Card className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      CS
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Carlos Souza</span>
                        <span className="text-xs text-gray-500">• há 1 mês</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Recomendo! Atividades ilimitadas e ganhos reais comprovados."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 9 */}
                <Card className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      FB
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Fernanda Barbosa</span>
                        <span className="text-xs text-gray-500">• há 4 meses</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 italic">
                        "Plataforma séria e confiável. Pagamentos sempre em dia!"
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
        {/* Step 3: Checkout Form */}
        {currentStep === 3 && (
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
                  <p className="text-2xl font-bold text-green-600">R$ 29,00</p>
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

      {/* PIX Payment Modal - Full Screen for Mobile */}
      {showPixModal && (
        <div className="fixed inset-0 z-[9999] bg-white" data-payment-flow="true">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
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
            <div className="bg-white/20 rounded-lg px-3 py-2">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-white animate-pulse" />
                <span className="text-white text-sm font-medium">
                  Tempo restante: <span className="font-bold text-lg">{formatTime(pixCountdown)}</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="overflow-y-auto h-[calc(100vh-140px)] px-4 py-6">
            
            {/* Amount Display */}
            <div className="text-center mb-6">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Valor a pagar</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">R$ 29,00</p>
            </div>
            
            {/* QR Code */}
            {pixCode && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
                <p className="text-sm text-gray-600 text-center mb-4 font-semibold">Escaneie o QR Code</p>
                <div className="bg-white p-4 rounded-xl mx-auto" style={{ maxWidth: '220px' }}>
                  <QRCode
                    value={pixCode}
                    size={188}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 188 188`}
                    level="M"
                    data-testid="img-qrcode"
                  />
                </div>
              </div>
            )}
            
            {/* PIX Code */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 mb-5 shadow-sm">
              <p className="text-sm text-gray-700 mb-3 text-center font-semibold">Ou use o código PIX copia e cola:</p>
              <div className="bg-white rounded-xl p-3 mb-3 border border-green-200">
                <textarea
                  value={pixCode || ''}
                  readOnly
                  className="w-full bg-transparent text-xs font-mono text-gray-700 resize-none border-0 outline-none"
                  rows={3}
                  style={{ minHeight: '60px' }}
                  data-testid="input-pix-code"
                />
              </div>
              <Button
                onClick={copyPixCode}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg"
                size="lg"
                data-testid="button-copy-pix"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copiar Código PIX
              </Button>
            </div>
            
            {/* Instructions */}
            <div className="bg-blue-50 rounded-2xl p-4 mb-5 shadow-sm">
              <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Como fazer o pagamento:
              </h4>
              <ol className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Abra o app do seu banco</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Escolha a opção PIX</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Escaneie o QR Code ou use "Pix Copia e Cola"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Confirme o pagamento de R$ 29,00</span>
                </li>
              </ol>
            </div>
            
            {/* Security Badge */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-center gap-2 text-sm text-gray-600">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-medium">Pagamento 100% seguro e criptografado</span>
            </div>
            
            {/* Bottom Spacing */}
            <div className="h-6"></div>
          </div>
        </div>
      )}
    </div>
  );
}