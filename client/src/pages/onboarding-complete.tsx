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
  RefreshCw
} from "lucide-react";

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
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
        
        // After 10 checks (30 seconds), show the modal
        if (newCount === 10 && !showPixConfirmation) {
          setShowPixConfirmation(true);
        }
        
        // After 40 checks (2 minutes), stop checking
        if (newCount >= 40) {
          clearInterval(interval);
          setIsCheckingPayment(false);
          setIsTimeoutReached(true);
        }
        
        return newCount;
      });
    }, 3000); // Check every 3 seconds
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

  const handlePaymentSuccess = () => {
    setIsCheckingPayment(false);
    setShowPaymentModal(false);
    setShowPixConfirmation(false);
    
    fbPixel.trackPurchase({
      value: 29.00,
      currency: 'BRL',
      content_name: 'Account Activation'
    });

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
      
      setShowPaymentModal(true);
      setShowCheckoutForm(false);
      playSound('success');
      
      // Track checkout initiation
      fbPixel.trackInitiateCheckout({
        value: 29.00,
        currency: 'BRL',
        content_name: 'Account Activation',
        num_items: 1
      });
      
      // Start checking for payment
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
    setShowCheckoutForm(true);
    
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
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg`}
                >
                  <Check className="h-4 w-4" />
                </div>
                {index < 4 && (
                  <div
                    className={`w-full h-1 mx-1 transition-all bg-gradient-to-r from-green-500 to-emerald-500`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Activation Screen */}
        {!showCheckoutForm && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ative sua conta agora
              </h2>
              <p className="text-sm text-gray-600">
                Pagamento único, benefícios para sempre
              </p>
            </div>

            {/* Offer Banner */}
            <Card className="p-4 bg-gradient-to-r from-orange-100 to-red-100 border-orange-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white rounded-full">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-red-600">🔥</span>
                    <span className="font-bold text-gray-900">Restam apenas <span className="text-orange-600">26 vagas!</span></span>
                    <span className="text-3xl font-bold text-gray-900">81%</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-600">OCUPADO</span>
              </div>
              
              {/* Offer countdown */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">Oferta termina em: Garanta agora</span>
                </div>
                <div className="w-full bg-orange-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full animate-pulse"
                    style={{ width: '81%' }}
                  />
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-600">21 de 26 vagas preenchidas</p>
                <p className="text-xs font-bold text-red-600 mt-1">Últimas 5!</p>
              </div>
            </Card>

            {/* Special Offer Badge */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                <Sparkles className="h-4 w-4" />
                <span>OFERTA ESPECIAL</span>
              </div>
            </div>

            {/* Plan Card */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-xl">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ativação Premium</h3>
                <p className="text-sm text-gray-600">Acesso completo e ilimitado</p>
              </div>
              
              {/* Price */}
              <div className="text-center mb-6">
                <p className="text-xs text-gray-500 line-through">R$ 49,90</p>
                <p className="text-sm text-red-600 font-bold mb-1">-40%</p>
                <p className="text-5xl font-bold text-green-600">R$ 29<span className="text-2xl">,00</span></p>
                <p className="text-xs text-gray-600 mt-2 uppercase tracking-wide">Pagamento Único</p>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-500 rounded-full flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">Atividades ilimitadas</p>
                    <p className="text-xs text-gray-600">Leia quantos quiser, sem restrições</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-500 rounded-full flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">Saque sem valor mínimo</p>
                    <p className="text-xs text-gray-600">36x mais rápido que usuários free</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-500 rounded-full flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">Suporte VIP WhatsApp</p>
                    <p className="text-xs text-gray-600">Atendimento prioritário e exclusivo</p>
                  </div>
                </div>
              </div>

              {/* Limited Time Offer */}
              <Card className="p-3 bg-red-50 border-red-200 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-900">Oferta por tempo limitado!</p>
                    <p className="text-xs text-red-700">Preço normal: R$ 49,90</p>
                  </div>
                </div>
              </Card>
            </Card>

            {/* Action Button */}
            <Button 
              onClick={handleActivateAccount}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 text-base shadow-xl animate-pulse"
              data-testid="button-activate"
            >
              <Zap className="mr-2 h-5 w-5" />
              Ativar minha Conta
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>

            {/* Payment Methods */}
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Pagamento 100% seguro via PIX</p>
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-400">Pagamento 100% seguro via PIX</span>
              </div>
            </div>

            {/* Guarantee */}
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center gap-3">
                <Shield className="h-10 w-10 text-blue-600" />
                <div>
                  <p className="font-bold text-sm text-gray-900">Garantia Total</p>
                  <p className="text-xs text-gray-600">Reembolso sem burocracia</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Checkout Form */}
        {showCheckoutForm && (
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
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </Card>

            {/* Submit Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleGeneratePix}
                disabled={generatePixMutation.isPending}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 text-base shadow-xl"
                data-testid="button-generate-pix"
              >
                {generatePixMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    Gerar código PIX
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <button
                onClick={() => setShowCheckoutForm(false)}
                className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
              >
                <ChevronLeft className="inline h-4 w-4 mr-1" />
                Voltar
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span>Seguro</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Instantâneo</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                <span>Garantido</span>
              </div>
            </div>
          </div>
        )}

        {/* PIX Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
            <div className="bg-white w-full h-full max-w-md overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
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
              <div className="p-6 space-y-6">
                {/* Timer */}
                {!isPixExpired ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
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
                <div className="text-center mb-6">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Valor a pagar</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">R$ 29,00</p>
                </div>
                
                {/* QR Code */}
                {!isPixExpired && (
                  <>
                    <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-inner">
                      <QRCode
                        value={pixCode}
                        size={240}
                        className="w-full h-auto"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </div>

                    {/* Copy Code */}
                    <div className="space-y-3">
                      <p className="text-center text-xs text-gray-500">
                        Ou copie o código PIX abaixo:
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3 relative group">
                        <p className="text-xs text-gray-600 font-mono break-all pr-10">
                          {pixCode}
                        </p>
                        <button
                          onClick={copyToClipboard}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                          data-testid="button-copy-pix"
                        >
                          {copiedToClipboard ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-sm text-blue-900 mb-3">Como pagar:</h4>
                      <ol className="space-y-2 text-xs text-blue-700">
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">1.</span>
                          <span>Abra o app do seu banco</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">2.</span>
                          <span>Escolha pagar com PIX</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">3.</span>
                          <span>Escaneie o QR Code ou copie o código</span>
                        </li>
                        <li className="flex items-start gap-2">
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
                        setShowCheckoutForm(true);
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
                data-testid="button-success-continue"
              >
                Começar a ler agora
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}