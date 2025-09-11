import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Check, CreditCard, Clock, Star, Trophy, Copy, CheckCheck, ChevronLeft, DollarSign, QrCode, Shield, Users, Info, ArrowRight, Book, CheckCircle } from "lucide-react";
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
  
  // Redirect if no plan selected
  useEffect(() => {
    if (!planFromUrl) {
      setLocation('/dashboard');
    }
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
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
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
        { icon: Book, text: '8 livros novos por dia' },
        { icon: DollarSign, text: 'Até R$ 240 por dia' },
        { icon: Clock, text: 'Leitura rápida (5-8 min)' },
        { icon: Trophy, text: 'Bônus de conclusão diário' },
        { icon: Shield, text: 'Suporte prioritário' }
      ],
      originalPrice: 39.90,
      color: 'blue'
    },
    unlimited: {
      name: 'Beta Reader Ilimitado',
      description: 'Ganhe até R$ 450 por dia lendo livros',
      features: [
        { icon: Book, text: '15 livros novos por dia' },
        { icon: DollarSign, text: 'Até R$ 450 por dia' },
        { icon: Clock, text: 'Leitura super rápida (3-5 min)' },
        { icon: Trophy, text: 'Bônus exclusivos diários' },
        { icon: Star, text: 'Acesso VIP completo' }
      ],
      originalPrice: 59.90,
      color: 'green'
    }
  };
  
  const currentPlan = planDetails[planFromUrl];
  const planPrice = getPlanPrice();
  const discount = isDiscounted ? (
    planFromUrl === 'premium' ? 25 : 35
  ) : 0;
  
  // Import icons
  const Book = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <img 
                src="/logo-beta-reader.png" 
                alt="Beta Reader Brasil" 
                className="h-8 w-auto object-contain"
              />
              <div>
                <h1 className="text-base font-bold text-gray-900">Beta Reader Brasil</h1>
                <p className="text-xs text-gray-600">Pagamento Seguro</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">100% Seguro</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Plan Details */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden border-gray-200 sticky top-20">
              {/* Plan Header */}
              <div className={`p-4 ${
                planFromUrl === 'unlimited' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              } text-white`}>
                <h2 className="text-xl font-bold">{currentPlan.name}</h2>
                <p className="text-sm opacity-90 mt-1">{currentPlan.description}</p>
              </div>
              
              {/* Price Section */}
              <div className="p-6 bg-white">
                <div className="flex items-baseline gap-2 mb-4">
                  {isDiscounted && (
                    <span className="text-lg text-gray-400 line-through">
                      R$ {currentPlan.originalPrice.toFixed(2)}
                    </span>
                  )}
                  <span className="text-3xl font-bold text-gray-900">
                    R$ {planPrice.toFixed(2)}
                  </span>
                  {isDiscounted && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      {discount}% OFF
                    </span>
                  )}
                </div>
                
                {/* Features */}
                <div className="space-y-3">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        planFromUrl === 'unlimited'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        <feature.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-gray-700">{feature.text}</span>
                    </div>
                  ))}
                </div>
                
                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <Users className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <p className="text-xs font-semibold text-gray-900">2.673</p>
                      <p className="text-xs text-gray-600">Leitores</p>
                    </div>
                    <div className="text-center">
                      <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                      <p className="text-xs font-semibold text-gray-900">4.9/5</p>
                      <p className="text-xs text-gray-600">Avaliação</p>
                    </div>
                    <div className="text-center">
                      <Shield className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <p className="text-xs font-semibold text-gray-900">100%</p>
                      <p className="text-xs text-gray-600">Seguro</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Right Column - Form or PIX */}
          <div className="lg:col-span-2">
            {!pixData ? (
              /* Payment Form */
              <Card className="p-6 border-gray-200">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Finalize seu pagamento
                  </h2>
                  <p className="text-sm text-gray-600">
                    Preencha seus dados para gerar o código PIX
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-700">
                      Nome completo
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Digite seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1"
                      data-testid="input-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1"
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cpf" className="text-gray-700">
                      CPF
                    </Label>
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      maxLength={14}
                      className="mt-1"
                      data-testid="input-cpf"
                    />
                  </div>
                  
                  {/* Security Info */}
                  <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Pagamento 100% seguro
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Seus dados estão protegidos com criptografia de ponta a ponta.
                        Processamento via PIX instantâneo.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleGeneratePix}
                    disabled={isProcessing}
                    className={`w-full py-6 text-base font-semibold ${
                      planFromUrl === 'unlimited'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                    } text-white`}
                    data-testid="button-generate-pix"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Gerando PIX...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Gerar Código PIX
                      </span>
                    )}
                  </Button>
                  
                  {/* Payment Methods */}
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg" 
                      alt="PIX" 
                      className="h-8 object-contain"
                    />
                    <span className="text-xs text-gray-500">Pagamento via PIX</span>
                  </div>
                </div>
              </Card>
            ) : (
              /* PIX Payment */
              <Card className="overflow-hidden border-gray-200">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="h-8 w-8" />
                    <div>
                      <h2 className="text-xl font-bold">PIX Gerado com Sucesso!</h2>
                      <p className="text-sm opacity-90">Escaneie o QR Code ou copie o código</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Amount */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Valor a pagar</p>
                    <p className="text-3xl font-bold text-gray-900">
                      R$ {pixData.amount.toFixed(2)}
                    </p>
                  </div>
                  
                  {/* QR Code */}
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-white rounded-lg">
                        <QRCodeSVG
                          value={pixData.pixQrCode}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                    
                    <p className="text-center text-sm text-gray-600 mb-4">
                      Aponte a câmera do seu celular para o QR Code
                    </p>
                    
                    {/* PIX Code Copy */}
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Ou copie o código PIX:</Label>
                      <div className="flex gap-2">
                        <Input
                          value={pixData.pixCode}
                          readOnly
                          className="flex-1 text-xs font-mono"
                        />
                        <Button
                          onClick={handleCopyPixCode}
                          variant="outline"
                          className="px-4"
                          data-testid="button-copy-pix"
                        >
                          {copied ? (
                            <CheckCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-2">
                          Como pagar com PIX:
                        </p>
                        <ol className="text-sm text-blue-800 space-y-1">
                          <li>1. Abra o app do seu banco</li>
                          <li>2. Escolha pagar com PIX</li>
                          <li>3. Escaneie o QR Code ou cole o código</li>
                          <li>4. Confirme o pagamento</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-amber-600">
                      <Clock className="h-5 w-5 animate-pulse" />
                      <span className="text-sm font-medium">
                        Aguardando pagamento...
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Após o pagamento, você será redirecionado automaticamente
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}