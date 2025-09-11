import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Check, CreditCard, Clock, Star, Trophy, Copy, CheckCheck, ChevronLeft, DollarSign, QrCode, Shield, Users, Info, ArrowRight, Book, CheckCircle, User, Mail, CreditCard as CardIcon, Lock, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from 'qrcode.react';
import { UtmTracker } from '@/utils/utmTracker';
import { fbPixel } from '@/utils/facebookPixel';
import { useToast } from "@/hooks/use-toast";
import Confetti from 'react-confetti';

export default function Payment() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  // Get plan from URL params
  const params = new URLSearchParams(window.location.search);
  const planFromUrl = params.get('plan') as 'premium' | 'unlimited' | null;
  const isDiscounted = params.get('discount') === 'true';
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get user data
  const [userName, setUserName] = useState('');
  
  // PIX data
  const [pixData, setPixData] = useState<{
    pixCode: string;
    pixQrCode: string;
    amount: number;
    orderId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Get user data and redirect if no plan selected
  useEffect(() => {
    const loadUserData = async () => {
      if (!planFromUrl) {
        setLocation('/dashboard');
        return;
      }
      
      // Get user info for personalized greeting
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (data.isLoggedIn && data.fullName) {
          const firstName = data.fullName.split(' ')[0];
          setUserName(firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase());
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, [planFromUrl, setLocation]);
  
  // Track InitiateCheckout when page loads
  useEffect(() => {
    if (planFromUrl) {
      const planPrice = getPlanPrice();
      const planName = planFromUrl === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado';
      
      fbPixel.trackInitiateCheckout({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_category: 'subscription',
        content_ids: [planFromUrl + '_plan'],
        content_type: 'product',
        num_items: 1,
        plan: planFromUrl,
        paymentMethod: 'pix'
      });
    }
  }, [planFromUrl, isDiscounted]);
  
  if (!planFromUrl) {
    return null;
  }
  
  const getDiscountedPrice = (originalPrice: number, plan: 'premium' | 'unlimited') => {
    if (!isDiscounted) return originalPrice;
    if (plan === 'premium') return originalPrice * 0.75; // 25% OFF
    if (plan === 'unlimited') return originalPrice * 0.65; // 35% OFF
    return originalPrice;
  };
  
  const getPlanPrice = () => {
    if (planFromUrl === 'premium') {
      const original = 39.90;
      return isDiscounted ? getDiscountedPrice(original, 'premium') : original;
    }
    if (planFromUrl === 'unlimited') {
      const original = 59.90;
      return isDiscounted ? getDiscountedPrice(original, 'unlimited') : original;
    }
    return 0;
  };
  
  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{3})(\d{1,2})/, '$1-$2');
    }
    return value;
  };
  
  const pollPaymentStatus = async (orderId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        return;
      }

      try {
        const response = await fetch(`/api/payments/status/${orderId}`);
        const data = await response.json();
        
        if (data.status === 'paid' || data.status === 'approved') {
          // Track Facebook Pixel Purchase event
          const planPrice = getPlanPrice();
          const planName = planFromUrl === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado';
          
          fbPixel.trackPurchase({
            value: planPrice,
            currency: 'BRL',
            content_name: planName,
            content_category: 'subscription',
            content_ids: [planFromUrl + '_plan'],
            content_type: 'product',
            num_items: 1,
            email: email,
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' '),
            transactionId: orderId,
            plan: planFromUrl,
            paymentMethod: 'pix'
          });

          // Show success message
          toast({
            title: "Pagamento confirmado!",
            description: "Seu plano foi ativado com sucesso.",
          });
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            setLocation('/dashboard');
          }, 3000);
        } else if (data.status === 'pending' || data.status === 'processing') {
          attempts++;
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        setTimeout(checkStatus, 5000);
      }
    };

    checkStatus();
  };
  
  const handleGeneratePix = async () => {
    // Validate form
    if (!fullName || !email || !cpf) {
      toast({
        title: "Preencha todos os campos",
        description: "Por favor, preencha todos os dados antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate CPF length
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      // Get user ID from auth status
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      if (!authData.userId) {
        console.error('User not authenticated');
        toast({
          title: "Erro de autenticação",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        setLocation('/');
        return;
      }
      const userId = authData.userId;
      
      // Get UTM parameters to send to OrinPay
      const utmParams = UtmTracker.getForOrinPay();
      
      // Call backend to generate PIX via OrinPay
      const response = await fetch('/api/payment/generate-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          plan: planFromUrl,
          fullName,
          email,
          cpf,
          utmParams
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate PIX');
      }
      
      const data = await response.json();
      
      // Track Facebook Pixel events when PIX is generated
      const planPrice = getPlanPrice();
      const planName = planFromUrl === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado';
      
      // Track AddPaymentInfo
      fbPixel.trackAddPaymentInfo({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_category: 'subscription',
        content_ids: [(planFromUrl || 'premium') + '_plan'],
        content_type: 'product',
        success: true
      });
      
      // Track custom PixGerado event
      fbPixel.trackCustom('PixGerado', {
        value: planPrice,
        currency: 'BRL',
        plan: planFromUrl,
        planName: planName,
        pixCode: data.pixCode,
        orderId: data.orderId
      });
      
      // Track AddToCart
      fbPixel.trackAddToCart({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_ids: [(planFromUrl || 'premium') + '_plan'],
        content_type: 'product',
        plan: planFromUrl || 'premium'
      });

      // Save PIX data
      setPixData({
        pixCode: data.pixQrCode,
        pixQrCode: data.pixQrCode,
        amount: data.amount,
        orderId: data.orderId
      });
      
      // Show confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      
      // Start polling for payment status
      if (data.orderId) {
        pollPaymentStatus(data.orderId);
      }
      
    } catch (error) {
      console.error('Error generating PIX:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCopyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no seu aplicativo de pagamentos.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const planDetails = {
    premium: {
      name: 'Beta Reader Oficial',
      description: 'Ganhe até R$ 240 por dia lendo livros',
      features: [
        'Leia 8 livros por dia',
        'Ganhe até R$ 240 diários',
        'Leitura rápida (5-8 min)',
        'Bônus de conclusão diário',
        'Suporte prioritário'
      ],
      originalPrice: 39.90,
      color: 'from-blue-500 to-indigo-500',
      icon: Book
    },
    unlimited: {
      name: 'Beta Reader Ilimitado',
      description: 'Ganhe até R$ 450 por dia lendo livros',
      features: [
        'Leia 15 livros por dia',
        'Ganhe até R$ 450 diários',
        'Leitura super rápida (3-5 min)',
        'Bônus exclusivos diários',
        'Acesso VIP completo'
      ],
      originalPrice: 59.90,
      color: 'from-green-500 to-emerald-500',
      icon: Sparkles
    }
  };
  
  const currentPlan = planDetails[planFromUrl];
  const planPrice = getPlanPrice();
  const discount = isDiscounted ? (
    planFromUrl === 'premium' ? 25 : 35
  ) : 0;
  
  // Get current date
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}
      
      {/* Header similar to dashboard */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setLocation('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <img 
                src="/logo-beta-reader.png" 
                alt="Beta Reader" 
                className="h-8 w-auto object-contain"
              />
              <span className="font-bold text-gray-900">Beta Reader</span>
            </div>
            <div className="w-9" />
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 capitalize">{currentDate}</p>
            {userName && (
              <h2 className="text-lg font-semibold text-gray-900 mt-1">
                Olá, {userName}! 👋
              </h2>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {!pixData ? (
          <>
            {/* Selected Plan Card */}
            <Card className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${currentPlan.color}`} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{currentPlan.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{currentPlan.description}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${currentPlan.color} text-white`}>
                    <currentPlan.icon className="h-5 w-5" />
                  </div>
                </div>
                
                {/* Price with anchoring */}
                <div className="flex items-baseline gap-2 mb-4">
                  {isDiscounted && (
                    <>
                      <span className="text-sm text-gray-400 line-through">
                        R$ {currentPlan.originalPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-2xl font-bold text-gray-900">
                        R$ {planPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        {discount}% OFF
                      </span>
                    </>
                  )}
                  {!isDiscounted && (
                    <span className="text-2xl font-bold text-gray-900">
                      R$ {planPrice.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
                
                {/* Features */}
                <div className="space-y-2">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            
            {/* Payment Method Card */}
            <Card className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Método de Pagamento</h3>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <QrCode className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">PIX</p>
                    <p className="text-xs text-gray-600">Pagamento instantâneo</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  DISPONÍVEL
                </span>
              </div>
            </Card>
            
            {/* Form Card */}
            <Card className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Dados para pagamento</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Nome completo
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Digite seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-11 py-3.5 px-4 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                      data-testid="input-name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 py-3.5 px-4 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="cpf" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    CPF
                  </Label>
                  <div className="relative">
                    <CardIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      maxLength={14}
                      className="pl-11 py-3.5 px-4 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                      data-testid="input-cpf"
                    />
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleGeneratePix}
                disabled={isProcessing}
                className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                data-testid="button-generate-pix"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Gerando PIX...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Gerar código PIX
                  </span>
                )}
              </Button>
            </Card>
            
            {/* Security badges */}
            <div className="flex items-center justify-center gap-6 py-4">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-xs text-gray-600">100% Seguro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-gray-600" />
                <span className="text-xs text-gray-600">Dados Protegidos</span>
              </div>
            </div>
          </>
        ) : (
          /* PIX Generated */
          <div className="space-y-4">
            <Card className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-3">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  PIX Gerado com Sucesso!
                </h2>
                <p className="text-sm text-gray-600">
                  Escaneie o QR Code ou copie o código PIX
                </p>
              </div>
              
              {/* QR Code */}
              <div className="bg-gray-50 rounded-xl p-6 mb-4 flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={pixData.pixCode}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>
              
              {/* PIX Code */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-gray-700">
                  Ou copie o código PIX:
                </Label>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 font-mono break-all mb-3">
                    {pixData.pixCode}
                  </p>
                  <Button
                    onClick={handleCopyPixCode}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 rounded-xl"
                    data-testid="button-copy-pix"
                  >
                    {copied ? (
                      <span className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4" />
                        Código copiado!
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Copiar código PIX
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Instructions */}
              <div className="mt-6 space-y-2">
                <p className="text-sm font-semibold text-gray-900">Como pagar:</p>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600">1.</span>
                    Abra o app do seu banco
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600">2.</span>
                    Escolha pagar com PIX
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600">3.</span>
                    Escaneie o QR Code ou cole o código
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-green-600">4.</span>
                    Confirme o pagamento
                  </li>
                </ol>
              </div>
              
              {/* Amount */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Valor a pagar:</span>
                  <span className="text-xl font-bold text-gray-900">
                    R$ {pixData.amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </Card>
            
            {/* Loading status card */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Aguardando pagamento...
                  </p>
                  <p className="text-xs text-gray-600">
                    Você será redirecionado automaticamente
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Back button */}
            <Button
              onClick={() => setLocation('/dashboard')}
              variant="outline"
              className="w-full py-3 rounded-xl border-gray-200"
              data-testid="button-back-dashboard"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}