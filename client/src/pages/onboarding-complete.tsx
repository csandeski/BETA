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
  Loader2,
  RefreshCw,
  User,
  Mail,
  Phone,
  CreditCard as CardIcon,
  FileText
} from "lucide-react";

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [currentStep, setCurrentStep] = useState(5);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [userFullName, setUserFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userCPF, setUserCPF] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [pixExpiration, setPixExpiration] = useState("");
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [checkPaymentCount, setCheckPaymentCount] = useState(0);
  const [isPixExpired, setIsPixExpired] = useState(false);
  const [showPixConfirmation, setShowPixConfirmation] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [isTimeoutReached, setIsTimeoutReached] = useState(false);

  const totalSteps = 8;

  useEffect(() => {
    const savedData = userDataManager.getUserData();
    if (savedData?.userId && savedData?.isLoggedIn) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success') {
        setShowSuccessModal(true);
      }
    }
  }, []);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const copyToClipboard = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopiedToClipboard(true);
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco para pagar",
      });
      
      fbPixel.trackAddToCart({
        content_name: 'PIX Code Copied',
        value: 29.00,
        currency: 'BRL'
      });
      
      setTimeout(() => setCopiedToClipboard(false), 3000);
    }
  };

  const startPaymentCheck = () => {
    setIsCheckingPayment(true);
    setCheckPaymentCount(0);
    setShowPixConfirmation(false);
    setIsTimeoutReached(false);
    checkPaymentLoop();
  };

  const checkPaymentLoop = () => {
    const interval = setInterval(async () => {
      setCheckPaymentCount(prev => {
        const newCount = prev + 1;
        
        // Check payment status every iteration
        if (paymentOrderId) {
          checkPaymentStatus();
        }
        
        // After 60 checks (5 minutes), stop checking
        if (newCount >= 60) {
          clearInterval(interval);
          setIsCheckingPayment(false);
          setIsTimeoutReached(true);
        }
        
        return newCount;
      });
    }, 5000); // Check every 5 seconds
  };

  const checkPaymentStatus = async () => {
    if (!paymentOrderId) return;
    
    try {
      const response = await fetch(`/api/payment/check-status/${paymentOrderId}`);
      const data = await response.json();
      
      if (data.status === 'paid' || data.status === 'approved') {
        // Payment confirmed!
        handlePaymentSuccess();
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    }
  };

  const handlePaymentSuccess = async () => {
    setIsCheckingPayment(false);
    setShowPaymentModal(false);
    setShowPixConfirmation(false);
    
    // Get stored UTM parameters from UtmTracker
    const utmData = UtmTracker.getStoredUTMParams();
    
    // Fire Facebook Pixel Purchase event with UTM parameters
    fbPixel.trackPurchase({
      value: 29.00,
      currency: 'BRL',
      content_name: 'Account Activation',
      content_category: 'Premium Subscription',
      content_ids: ['premium_account'],
      num_items: 1,
      // Include UTM parameters
      utm_source: utmData.utm_source || undefined,
      utm_medium: utmData.utm_medium || undefined,
      utm_campaign: utmData.utm_campaign || undefined,
      utm_content: utmData.utm_content || undefined,
      utm_term: utmData.utm_term || undefined
    });
    
    // Send Lira tracking event through backend
    try {
      if (paymentOrderId) {
        await fetch('/api/payment/track-conversion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_id: paymentOrderId,
            value: 29.00,
            customer: {
              email: userEmail,
              phone: userPhone,
              name: userFullName
            },
            utm_params: utmData
          })
        });
      }
    } catch (error) {
      console.error('Error sending Lira tracking:', error);
    }

    // Update user data
    const currentData = userDataManager.getUserData() || {};
    userDataManager.updateUserData({
      ...currentData,
      isPremium: true,
      premiumSince: new Date().toISOString(),
      email: userEmail,
      phone: userPhone,
      name: userFullName
    });

    // Show success modal
    setShowSuccessModal(true);
    playSound('success');
  };

  const validateForm = () => {
    if (!userFullName || userFullName.length < 3) {
      toast({
        title: "Nome inválido",
        description: "Por favor, insira seu nome completo",
        variant: "destructive",
      });
      return false;
    }

    if (!userEmail || !userEmail.includes('@')) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido",
        variant: "destructive",
      });
      return false;
    }

    const phoneNumbers = userPhone.replace(/\D/g, '');
    if (!userPhone || phoneNumbers.length < 10) {
      toast({
        title: "WhatsApp inválido",
        description: "Por favor, insira um número válido com DDD",
        variant: "destructive",
      });
      return false;
    }

    const cpfNumbers = userCPF.replace(/\D/g, '');
    if (!userCPF || cpfNumbers.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido com 11 dígitos",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const generatePixMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/payment/generate-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate PIX");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setPixCode(data.pixCode);
      setPaymentOrderId(data.orderId);
      
      // Calculate expiration (5 minutes from now)
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + 5);
      setPixExpiration(expiration.toISOString());
      
      setCurrentStep(8); // Go to PIX display step
      playSound('success');
      
      // Start automatic payment checking
      startPaymentCheck();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar PIX",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGeneratePix = () => {
    if (!validateForm()) return;

    playSound('click');
    
    fbPixel.trackInitiateCheckout({
      value: 29.00,
      currency: 'BRL',
      content_name: 'Account Activation',
      num_items: 1
    });
    
    // Save UTM params
    // Save UTM params
    
    const cleanPhone = userPhone.replace(/\D/g, '');
    
    const requestBody = {
      plan: 'supporter',
      amount: 29.00,
      fullName: userFullName,
      email: userEmail,
      phone: cleanPhone,
      cpf: userCPF.replace(/\D/g, '')
    };

    generatePixMutation.mutate(requestBody);
  };

  const handleActivateAccount = () => {
    playSound('click');
    setCurrentStep(7);
    
    fbPixel.trackAddToCart({
      value: 29.00,
      currency: 'BRL',
      content_name: 'Account Activation'
    });
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setIsCheckingPayment(false);
    setPixCode("");
    setPixExpiration("");
    setIsPixExpired(false);
    setShowPixConfirmation(false);
    
    fbPixel.trackAddPaymentInfo({
      value: 29.00,
      currency: 'BRL',
      content_name: 'Account Activation'
    });
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setLocation('/dashboard');
  };

  const pixExpirationTimer = () => {
    if (!pixExpiration) return null;
    
    const now = new Date();
    const expiry = new Date(pixExpiration);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      if (!isPixExpired) {
        setIsPixExpired(true);
        setIsCheckingPayment(false);
      }
      return "00:00";
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pixExpiration && showPaymentModal) {
      interval = setInterval(() => {
        const timer = pixExpirationTimer();
        if (timer === "00:00") {
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pixExpiration, showPaymentModal]);

  const checkPaymentStatusMutation = useMutation({
    mutationFn: async () => {
      if (!paymentOrderId) throw new Error("No order ID");
      
      const response = await fetch(`/api/payment/check-status/${paymentOrderId}`);
      if (!response.ok) throw new Error("Failed to check payment");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === 'paid' || data.status === 'approved') {
        handlePaymentSuccess();
      } else if (showPixConfirmation) {
        toast({
          title: "Pagamento pendente",
          description: "Continue aguardando a confirmação do pagamento...",
        });
      }
    },
    onError: () => {
      if (showPixConfirmation) {
        toast({
          title: "Erro ao verificar",
          description: "Não foi possível verificar o status do pagamento",
          variant: "destructive",
        });
      }
    }
  });

  const handleConfirmPayment = () => {
    checkPaymentStatusMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6 px-4">
      <div className="max-w-md mx-auto">

        {/* Step 1: Benefits Overview */}
        {false && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4 shadow-xl">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Parabéns pela decisão!
              </h2>
              <p className="text-sm text-gray-600">
                Você está a um passo de transformar sua leitura em renda
              </p>
            </div>

            {/* Quick Benefits */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <BookOpen className="h-6 w-6 text-green-600 mb-2" />
                <p className="font-semibold text-sm text-gray-900">Leia Ilimitado</p>
                <p className="text-xs text-gray-600">Sem restrições</p>
              </Card>
              <Card className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <Target className="h-6 w-6 text-blue-600 mb-2" />
                <p className="font-semibold text-sm text-gray-900">Ganhe Mais</p>
                <p className="text-xs text-gray-600">36x mais rápido</p>
              </Card>
              <Card className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <Award className="h-6 w-6 text-purple-600 mb-2" />
                <p className="font-semibold text-sm text-gray-900">Seja VIP</p>
                <p className="text-xs text-gray-600">Benefícios exclusivos</p>
              </Card>
              <Card className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                <Users className="h-6 w-6 text-orange-600 mb-2" />
                <p className="font-semibold text-sm text-gray-900">Comunidade</p>
                <p className="text-xs text-gray-600">Suporte premium</p>
              </Card>
            </div>

            <Button 
              onClick={() => {
                playSound('click');
                setCurrentStep(2);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 text-base shadow-xl"
            >
              Continuar para ativação
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 2: Success Timeline */}
        {false && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sua jornada de sucesso
              </h2>
              <p className="text-sm text-gray-600">
                Veja o que nossos membros conquistaram
              </p>
            </div>

            {/* Success Stories */}
            <div className="space-y-3">
              <Card className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">📅</div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">1º Mês</p>
                    <p className="text-xs text-gray-600">Ana Paula - São Paulo</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  "Recuperei o investimento e ainda lucrei R$ 234"
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">📈</div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">3º Mês</p>
                    <p className="text-xs text-gray-600">Carlos - Rio de Janeiro</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  "Já fiz R$ 1.200 apenas lendo no tempo livre!"
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">6º Mês</p>
                    <p className="text-xs text-gray-600">Juliana - Belo Horizonte</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  "Consegui pagar todas as contas só com a plataforma"
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </Card>
            </div>

            <Button 
              onClick={() => {
                playSound('click');
                setCurrentStep(3);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 text-base shadow-xl"
            >
              Quero começar agora
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 3: Special Bonus */}
        {false && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4 shadow-xl animate-bounce">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bônus Exclusivo Hoje!
              </h2>
              <p className="text-sm text-gray-600">
                Por ser um dos primeiros 26 membros
              </p>
            </div>

            {/* Bonus Items */}
            <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-500 rounded-full">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Acesso Vitalício</p>
                    <p className="text-xs text-gray-600">Pague uma vez, use para sempre</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-500 rounded-full">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Suporte VIP WhatsApp</p>
                    <p className="text-xs text-gray-600">Atendimento prioritário 24/7</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-500 rounded-full">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Sem Taxa de Saque</p>
                    <p className="text-xs text-gray-600">100% do valor é seu</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-500 rounded-full">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Garantia de 7 Dias</p>
                    <p className="text-xs text-gray-600">Não gostou? Devolvemos 100%</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Urgency */}
            <Card className="p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-bold">Oferta limitada!</span>
                </div>
                <span className="text-xs">Restam 5 vagas</span>
              </div>
            </Card>

            <Button 
              onClick={() => {
                playSound('click');
                setCurrentStep(4);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 text-base shadow-xl"
            >
              Garantir minha vaga
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 4: Social Proof */}
        {false && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Junte-se a 3.847 leitores
              </h2>
              <p className="text-sm text-gray-600">
                Que já estão ganhando todos os dias
              </p>
            </div>

            {/* Live Activity */}
            <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-green-600">ATIVIDADE AO VIVO</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-600">Agora</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <ThumbsUp className="h-3 w-3 text-blue-500" />
                  <span>João acabou de ativar a conta Premium</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <Smile className="h-3 w-3 text-yellow-500" />
                  <span>Maria ganhou R$ 26 lendo "O Poder do Hábito"</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <Star className="h-3 w-3 text-purple-500" />
                  <span>Pedro sacou R$ 450 essa semana</span>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <Card className="p-3 border-green-200">
                <p className="text-2xl font-bold text-green-600">3.8K</p>
                <p className="text-xs text-gray-600">Membros ativos</p>
              </Card>
              <Card className="p-3 border-blue-200">
                <p className="text-2xl font-bold text-blue-600">R$ 2.1M</p>
                <p className="text-xs text-gray-600">Já pagos</p>
              </Card>
              <Card className="p-3 border-purple-200">
                <p className="text-2xl font-bold text-purple-600">4.9★</p>
                <p className="text-xs text-gray-600">Avaliação</p>
              </Card>
            </div>

            <Button 
              onClick={() => {
                playSound('click');
                setCurrentStep(5);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 text-base shadow-xl"
            >
              Ativar minha conta agora
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 5: Congratulations */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            {/* Success Icon */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4 shadow-xl">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Parabéns por concluir suas atividades!
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                Agora é hora de oficializar a sua conta no Beta Reader Brasil
              </p>
            </div>

            {/* Limited Spots Warning */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-1">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center animate-pulse">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-gray-900">
                      ⚠️ Atenção: Restam apenas <span className="text-red-600">5 vagas!</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Garanta seu lugar antes que acabe. As vagas estão sendo preenchidas rapidamente!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits Preview */}
            <Card className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <h3 className="font-bold text-base text-gray-900 mb-3">Ao oficializar sua conta você terá:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Acesso vitalício à plataforma</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Atividades ilimitadas para sempre</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Saque sem valor mínimo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">Suporte VIP no WhatsApp</span>
                </div>
              </div>
            </Card>

            {/* Continue Button */}
            <Button 
              onClick={() => {
                playSound('click');
                setCurrentStep(6);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 text-lg shadow-xl"
              data-testid="button-continue-to-pricing"
            >
              Continuar para ativação
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 6: Pricing Card */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Ative sua conta agora
              </h2>
              <p className="text-base text-gray-600">
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
                      <p className="text-base font-bold text-gray-900 leading-tight">
                        🔥 Restam apenas <span className="text-red-600">26 vagas!</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Oferta limitada • Garanta agora
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                      81%
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">ocupado</p>
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out animate-pulse" 
                         style={{ width: '81%' }}>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500">21 de 26 vagas preenchidas</p>
                    <p className="text-sm font-semibold text-red-600">Últimas 5!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Card - Mobile Optimized */}
            <div className="relative">
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="h-3 w-3" />
                  <span>OFERTA ESPECIAL</span>
                </div>
              </div>

              <Card className="relative mt-2 overflow-hidden border-2 border-green-300 shadow-2xl">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 opacity-50" />
                
                {/* Header */}
                <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-4">
                  <div className="text-center">
                    <h3 className="text-white font-bold text-xl mb-1">Ativação Premium</h3>
                    <p className="text-green-100 text-sm">Acesso completo e ilimitado</p>
                    
                    {/* Price */}
                    <div className="mt-3">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-green-100 text-sm line-through">R$ 49,90</span>
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          -40%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-white text-base">R$</span>
                        <span className="text-white text-3xl font-bold">29</span>
                        <span className="text-white text-lg">,00</span>
                      </div>
                      <p className="text-green-100 text-sm font-semibold mt-1">
                        PAGAMENTO ÚNICO
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="relative p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 rounded-md">
                      <BookOpen className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-bold text-base block">Atividades Ilimitadas</span>
                      <span className="text-sm text-gray-600">Leia quantos quiser, sem restrições</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 rounded-md">
                      <CreditCard className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-bold text-base block">Saque sem valor mínimo</span>
                      <span className="text-sm text-gray-600">36x mais rápido que usuários free</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 rounded-md">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-800 font-bold text-base block">Suporte VIP WhatsApp</span>
                      <span className="text-sm text-gray-600">Atendimento prioritário e exclusivo</span>
                    </div>
                  </div>

                  {/* Urgency Box */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-sm font-bold text-red-700">Oferta por tempo limitado!</p>
                        <p className="text-sm text-red-600">Preço normal: R$ 49,90</p>
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
                    <div className="absolute inset-0 bg-gradient-to-b from-green-700 to-green-900 rounded-xl translate-y-1 blur-sm opacity-50"></div>
                    
                    <div 
                      className="relative py-3.5 px-4 rounded-xl transform transition-all duration-200 group-hover:translate-y-0.5 group-active:translate-y-1"
                      style={{
                        background: 'linear-gradient(180deg, #22c55e 0%, #10b981 50%, #059669 100%)',
                        boxShadow: `
                          0 6px 0 #047857,
                          0 6px 15px rgba(34, 197, 94, 0.3),
                          inset 0 2px 0 rgba(255, 255, 255, 0.3),
                          inset 0 -2px 0 rgba(0, 0, 0, 0.2)
                        `
                      }}
                    >
                      <div className="absolute inset-0 rounded-xl opacity-20 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>
                      
                      <div className="relative flex items-center justify-center gap-2">
                        <Zap className="h-5 w-5 text-white drop-shadow-md" />
                        <span className="text-white font-bold text-base drop-shadow-md">Ativar minha Conta</span>
                        <ChevronRight className="h-4 w-4 text-white drop-shadow-md group-hover:translate-x-1 transition-transform" />
                      </div>
                      
                      <div 
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%)',
                          animation: 'shine 0.8s ease-in-out'
                        }}
                      ></div>
                    </div>
                  </button>

                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 mt-3">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Pagamento 100% seguro via PIX</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Warranty/Guarantee Section */}
            <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl p-[1.5px] shadow-lg">
              <Card className="relative bg-white rounded-[10px] p-4 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{ 
                    backgroundImage: `repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 10px,
                      rgba(59, 130, 246, 0.1) 10px,
                      rgba(59, 130, 246, 0.1) 20px
                    )`
                  }}></div>
                </div>
                
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">Garantia Total</h3>
                      <p className="text-[10px] text-gray-500">Reembolso sem burocracia</p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-semibold text-blue-600">Aqui, seu dinheiro não é perdido.</span> 
                      Você tem total direito de solicitar o seu reembolso total caso não goste por qualquer motivo do Beta Reader. 
                      <span className="font-medium text-indigo-600">Confiança e transparência</span> é o destaque principal do grupo Beta Reader.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-[10px] font-medium text-gray-600">7 dias de garantia</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[10px] font-medium text-gray-600">100% reembolsável</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Testimonials Section */}
            <div className="space-y-3">
              {/* Testimonials Header with Stats */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-gray-900">Avaliações Verificadas</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-900">4.9</span>
                      <span className="text-xs text-gray-500">(884 avaliações)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">98%</p>
                    <p className="text-[10px] text-gray-500">Aprovação</p>
                  </div>
                </div>
              </div>

              {/* Individual Testimonials */}
              <div className="space-y-2">
                {/* Testimonial 1 */}
                <Card className="p-3 bg-white border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                      MS
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Maria Silva</span>
                        <span className="text-xs text-gray-500">• há 2 anos</span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700">
                        "Vale cada centavo! Agora leio sem limites e ainda ganho muito mais rápido!"
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 2 */}
                <Card className="p-3 bg-white border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                      PC
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Pedro Costa</span>
                        <span className="text-xs text-gray-500">• há 8 meses</span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700">
                        "Melhor investimento que fiz! Já recuperei o valor no primeiro mês."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 3 */}
                <Card className="p-3 bg-white border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                      AF
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">Ana Ferreira</span>
                        <span className="text-xs text-gray-500">• há 1 ano</span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700">
                        "Suporte VIP faz toda a diferença! Respondem em minutos."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Testimonial 4 */}
                <Card className="p-3 bg-white border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                      JO
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">João Oliveira</span>
                        <span className="text-xs text-gray-500">• há 3 meses</span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700">
                        "Saque sem valor mínimo é perfeito! Posso sacar quando quiser."
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Button to view more */}
                <button 
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2 transition-colors"
                  onClick={() => {
                    toast({
                      title: "Carregando mais avaliações...",
                      description: "Mais 880 avaliações disponíveis após ativação",
                    });
                  }}
                >
                  Ver todas as 884 avaliações →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Checkout Form */}
        {currentStep === 7 && (
          <div className="space-y-5 animate-fade-in">
            {/* Enhanced Header */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur-xl opacity-30"></div>
              <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2">
                  Finalização Segura
                </h2>
                <p className="text-center text-green-100 text-sm">
                  Seus dados estão protegidos com criptografia
                </p>
              </div>
            </div>

            {/* Enhanced Checkout Summary */}
            <div className="relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  <span>ECONOMIA DE 40%</span>
                </div>
              </div>
              <Card className="relative overflow-hidden border-2 border-green-200 shadow-lg mt-3">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 opacity-60"></div>
                <div className="relative p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <Zap className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-base">Ativação Premium</p>
                          <p className="text-[10px] text-gray-600">Acesso ilimitado vitalício</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 line-through mb-1">R$ 49,90</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-green-600">R$</span>
                        <span className="text-3xl font-bold text-green-600">29</span>
                        <span className="text-lg font-bold text-green-600">,00</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Benefits Pills */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-green-100">
                    <div className="bg-green-100 text-green-700 text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Sem mensalidade</span>
                    </div>
                    <div className="bg-blue-100 text-blue-700 text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Acesso vitalício</span>
                    </div>
                    <div className="bg-purple-100 text-purple-700 text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Garantia 7 dias</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Enhanced User Data Form */}
            <Card className="relative overflow-hidden border-0 shadow-xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400"></div>
              <div className="p-6 space-y-5">
                <h3 className="font-bold text-base text-gray-900 mb-4">Seus Dados</h3>
                
                {/* Name Field */}
                <div className="relative">
                  <Label htmlFor="fullName" className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wide">
                    Nome Completo
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="João da Silva"
                      value={userFullName}
                      onChange={(e) => setUserFullName(e.target.value)}
                      className="h-12 pl-10 text-base border-2 border-gray-200 focus:border-green-500 rounded-xl transition-all"
                      data-testid="input-full-name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="relative">
                  <Label htmlFor="email" className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wide">
                    Email
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="h-12 pl-10 text-base border-2 border-gray-200 focus:border-green-500 rounded-xl transition-all"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                {/* WhatsApp Field */}
                <div className="relative">
                  <Label htmlFor="phone" className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wide">
                    WhatsApp
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 98765-4321"
                      value={userPhone}
                      onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                      className="h-12 pl-10 text-base border-2 border-gray-200 focus:border-green-500 rounded-xl transition-all"
                      data-testid="input-phone"
                      maxLength={15}
                    />
                  </div>
                </div>

                {/* CPF Field */}
                <div className="relative">
                  <Label htmlFor="cpf" className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wide">
                    CPF
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="123.456.789-00"
                      value={userCPF}
                      onChange={(e) => setUserCPF(formatCPF(e.target.value))}
                      className="h-12 pl-10 text-base border-2 border-gray-200 focus:border-green-500 rounded-xl transition-all"
                      data-testid="input-cpf"
                      maxLength={14}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Method Card - Compact Version */}
            <Card className="p-3 border-green-200 bg-gradient-to-br from-green-50/30 to-emerald-50/30">
              <div className="flex items-center gap-3">
                {/* PIX Logo */}
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-sm">
                  <div className="text-white font-bold text-xs">PIX</div>
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Pagamento via PIX</p>
                  <p className="text-xs text-gray-600">Aprovação instantânea • 100% seguro</p>
                </div>
                
                {/* Approved Badge */}
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Aprovado</span>
                </div>
              </div>
              
              {/* Benefits Row */}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-green-100">
                <div className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-gray-600">Sem taxas</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-gray-600">Instantâneo</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-gray-600">Seguro</span>
                </div>
              </div>
            </Card>

            {/* Enhanced Submit Buttons */}
            <div className="space-y-4">
              {/* Main CTA Button */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <button
                  onClick={handleGeneratePix}
                  disabled={generatePixMutation.isPending}
                  className="relative w-full group overflow-hidden rounded-2xl"
                  data-testid="button-generate-pix"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 py-5 px-6 flex items-center justify-center gap-3">
                    {generatePixMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                        <span className="text-white font-bold text-lg">Gerando PIX...</span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <img 
                              src="https://logodownload.org/wp-content/uploads/2020/02/pix-bc-logo.png" 
                              alt="PIX" 
                              className="h-6 w-auto"
                            />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-white font-bold text-lg">Gerar Código PIX</span>
                            <span className="text-green-100 text-[10px]">Pagamento instantâneo</span>
                          </div>
                          <ChevronRight className="h-6 w-6 text-white ml-auto group-hover:translate-x-1 transition-transform" />
                        </div>
                      </>
                    )}
                  </div>
                  {/* Shine Effect */}
                  <div className="absolute inset-0 -top-2 h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
              </div>

              {/* Back Button */}
              <button
                onClick={() => setCurrentStep(6)}
                className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors py-2"
              >
                <ChevronLeft className="inline h-4 w-4 mr-1" />
                Voltar ao resumo
              </button>
            </div>

            {/* Enhanced Trust Badges */}
            <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">100% Seguro</span>
                  <span className="text-[9px] text-gray-500">Criptografado</span>
                </div>
                <div className="w-px h-16 bg-gray-200"></div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">Instantâneo</span>
                  <span className="text-[9px] text-gray-500">Aprova na hora</span>
                </div>
                <div className="w-px h-16 bg-gray-200"></div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">Garantido</span>
                  <span className="text-[9px] text-gray-500">7 dias</span>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-500 font-medium">
                  🔒 Todos os seus dados são protegidos com a tecnologia PIX do Banco Central
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: PIX Payment Screen */}
        {currentStep === 8 && (
          <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white space-y-4 animate-fade-in">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl text-gray-900">Pagamento PIX</h3>
                <p className="text-sm text-gray-600">Escaneie ou copie o código</p>
              </div>
              <button
                onClick={() => setCurrentStep(7)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="button-back-to-checkout"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Timer */}
              {!isPixExpired ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm font-semibold text-gray-900">Código expira em:</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">
                      {pixExpirationTimer()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">Código PIX expirado</p>
                      <p className="text-xs text-red-600">Gere um novo código para continuar</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 uppercase font-semibold tracking-wide">Valor a pagar</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">R$ 29,00</p>
              </div>
              
              {/* QR Code */}
              {!isPixExpired && (
                <>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 flex justify-center shadow-sm">
                    <QRCode
                      value={pixCode}
                      size={220}
                      className="w-auto h-auto"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>

                  {/* Copy Code Button */}
                  <Button
                    onClick={copyToClipboard}
                    className="w-full h-14 font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    data-testid="button-copy-pix"
                  >
                    {copiedToClipboard ? (
                      <>
                        <Check className="h-6 w-6 mr-2 text-white" />
                        Código copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-6 w-6 mr-2" />
                        Copiar código PIX
                      </>
                    )}
                  </Button>
                  
                  {/* PIX Code Text */}
                  <div className="space-y-3">
                    <p className="text-center text-sm text-gray-600">
                      Ou copie o código PIX abaixo:
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-600 font-mono break-all leading-relaxed">
                        {pixCode}
                      </p>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-blue-900 mb-3">Como pagar:</h4>
                    <ol className="space-y-2 text-sm text-blue-700">
                      <li className="flex items-center gap-3">
                        <span className="font-bold text-blue-600 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">1</span>
                        <span>Abra o app do seu banco</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="font-bold text-blue-600 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">2</span>
                        <span>Escolha pagar com PIX</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="font-bold text-blue-600 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">3</span>
                        <span>Escaneie o QR Code ou copie o código</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="font-bold text-blue-600 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">4</span>
                        <span>Confirme o pagamento de R$ 29,00</span>
                      </li>
                    </ol>
                  </div>

                  {/* Payment Status */}
                  {isCheckingPayment && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center gap-4">
                        <Loader2 className="h-6 w-6 text-green-600 animate-spin" />
                        <div className="flex-1">
                          <p className="font-semibold text-lg text-gray-900">
                            Aguardando pagamento...
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Aprovação automática após confirmação
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Expired State */}
              {isPixExpired && (
                <div className="text-center py-12">
                  <AlertCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
                  <h4 className="text-2xl font-semibold text-gray-900 mb-3">
                    Tempo esgotado
                  </h4>
                  <p className="text-lg text-gray-600 mb-8">
                    O código PIX expirou. Gere um novo código para continuar.
                  </p>
                  <Button
                    onClick={() => setCurrentStep(7)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold h-12 px-8"
                  >
                    Gerar novo código
                  </Button>
                </div>
              )}

              {/* Footer Actions */}
              {!isPixExpired && !isTimeoutReached && (
                <div className="pt-6 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-500">
                    Não recebemos seu pagamento ainda
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PIX Payment Modal - DEPRECATED, now using Step 8 */}
        {false && showPaymentModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl z-10">
                <div>
                  <h3 className="font-bold text-lg">Pagamento PIX</h3>
                  <p className="text-xs text-gray-600">Escaneie ou copie o código</p>
                </div>
                <button
                  onClick={handleClosePayment}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  data-testid="button-close-payment"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Timer */}
                {!isPixExpired ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-xs font-semibold text-gray-900">Código expira em:</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-600">
                        {pixExpirationTimer()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-semibold text-red-900">Código PIX expirado</p>
                        <p className="text-xs text-red-600">Gere um novo código para continuar</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="text-center mb-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Valor a pagar</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">R$ 29,00</p>
                </div>
                
                {/* QR Code */}
                {!isPixExpired && (
                  <>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-center">
                      <QRCode
                        value={pixCode}
                        size={180}
                        className="w-auto h-auto"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </div>

                    {/* Copy Code Button */}
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="w-full h-12 font-semibold border-2 hover:bg-gray-50"
                      data-testid="button-copy-pix"
                    >
                      {copiedToClipboard ? (
                        <>
                          <Check className="h-5 w-5 mr-2 text-green-600" />
                          Código copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5 mr-2" />
                          Copiar código PIX
                        </>
                      )}
                    </Button>
                    
                    {/* PIX Code Text */}
                    <div className="space-y-2">
                      <p className="text-center text-xs text-gray-500">
                        Ou copie o código PIX abaixo:
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-600 font-mono break-all leading-relaxed">
                          {pixCode}
                        </p>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h4 className="font-semibold text-xs text-blue-900 mb-2">Como pagar:</h4>
                      <ol className="space-y-1 text-xs text-blue-700">
                        <li className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">1.</span>
                          <span>Abra o app do seu banco</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">2.</span>
                          <span>Escolha pagar com PIX</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">3.</span>
                          <span>Escaneie o QR Code ou copie o código</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">4.</span>
                          <span>Confirme o pagamento de R$ 29,00</span>
                        </li>
                      </ol>
                    </div>

                    {/* Payment Status */}
                    {isCheckingPayment && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-900">
                              Aguardando pagamento...
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Aprovação automática após confirmação
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Expired State */}
                {isPixExpired && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Tempo esgotado
                    </h4>
                    <p className="text-sm text-gray-600 mb-6">
                      O código PIX expirou. Gere um novo código para continuar.
                    </p>
                    <Button
                      onClick={() => {
                        handleClosePayment();
                        setCurrentStep(7);
                      }}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
                    >
                      Gerar novo código
                    </Button>
                  </div>
                )}

                {/* Footer Actions */}
                {!isPixExpired && !isTimeoutReached && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-center text-xs text-gray-500">
                      Não recebemos seu pagamento ainda
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PIX Confirmation Modal */}
        {showPixConfirmation && !isPixExpired && (
          <Dialog open={showPixConfirmation} onOpenChange={setShowPixConfirmation}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Você já fez o PIX?
                  </h3>
                  <p className="text-sm text-gray-600">
                    Se você já realizou o pagamento, clique em confirmar para verificarmos
                  </p>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <Button
                  onClick={handleConfirmPayment}
                  disabled={checkPaymentStatusMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
                  data-testid="button-confirm-payment"
                >
                  {checkPaymentStatusMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Já fiz o pagamento
                    </>
                  )}
                </Button>

                <button
                  onClick={() => setShowPixConfirmation(false)}
                  className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
                  data-testid="button-continue-waiting"
                >
                  Ainda não paguei
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Parabéns! 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                Sua conta Premium foi ativada com sucesso!
              </p>
              <div className="space-y-3 text-left bg-green-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Acesso ilimitado liberado</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Suporte VIP ativado</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Saque sem limite mínimo</span>
                </div>
              </div>
              <Button
                onClick={handleSuccessClose}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
                data-testid="button-go-to-dashboard"
              >
                Ir para o Dashboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}