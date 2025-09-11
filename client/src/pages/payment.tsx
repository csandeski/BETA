import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Copy, CheckCheck, ChevronLeft, QrCode, Shield, Clock, CheckCircle, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from 'qrcode.react';
import { UtmTracker } from '@/utils/utmTracker';
import { fbPixel } from '@/utils/facebookPixel';
import { useToast } from "@/hooks/use-toast";
import Confetti from 'react-confetti';
import PixLoadingModal from "@/components/PixLoadingModal";
import PixCountdown from "@/components/PixCountdown";

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
  const [showPixLoading, setShowPixLoading] = useState(false);
  
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
            description: "Seu plano foi ativado com sucesso. Redirecionando...",
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
    setShowPixLoading(true);
    
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
      
      // Hide loading after a short delay
      setTimeout(() => {
        setShowPixLoading(false);
        // Scroll to top when showing PIX payment
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Show confetti when PIX screen appears
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }, 2000);
      
      // Start polling for payment status
      if (data.orderId) {
        pollPaymentStatus(data.orderId);
      }
      
    } catch (error) {
      console.error('Error generating PIX:', error);
      setShowPixLoading(false);
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
      setTimeout(() => setCopied(false), 3000);
    }
  };
  
  const handlePixExpire = () => {
    toast({
      title: "Tempo expirado",
      description: "O código PIX expirou. Por favor, gere um novo código.",
      variant: "destructive",
    });
    setPixData(null);
  };
  
  const planDetails = {
    premium: {
      name: 'Beta Reader Oficial',
      originalPrice: 59.90,
      anchorPrice: 59.90,
      finalPrice: 39.90,
      color: 'blue'
    },
    unlimited: {
      name: 'Beta Reader Ilimitado',
      originalPrice: 97.90,
      anchorPrice: 97.90,
      finalPrice: 59.90,
      color: 'green'
    }
  };
  
  const currentPlan = planDetails[planFromUrl];
  const planPrice = getPlanPrice();
  const discount = isDiscounted ? (
    planFromUrl === 'premium' ? 25 : 35
  ) : 0;
  
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
      
      {/* Loading Modal */}
      <PixLoadingModal isOpen={showPixLoading} />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
              <h1 className="text-base font-semibold text-gray-900">Beta Reader Brasil</h1>
              <p className="text-xs text-gray-600">Pagamento Seguro</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {!pixData ? (
          <div className="space-y-6">
            {/* Plan Banner */}
            <Card className="border border-gray-100 bg-white shadow-sm">
              <div className="px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <img 
                      src="/logo-beta-reader.png" 
                      alt="Beta Reader Brasil" 
                      className="h-7 sm:h-9 w-auto object-contain flex-shrink-0"
                    />
                    <div className="border-l border-gray-200 pl-2 sm:pl-4">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                        {currentPlan.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] sm:text-[11px] text-gray-400 line-through leading-none mb-0.5 sm:mb-1">
                      R$ {currentPlan.anchorPrice.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-none whitespace-nowrap">
                      R$ {planPrice.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* User Data Form */}
            <Card className="p-6 border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  1
                </div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  DADOS PESSOAIS
                </h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-xs font-normal text-gray-600 mb-1.5 block">
                    Seu Nome
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-14 text-base px-4 border-gray-200 focus:border-gray-300 bg-white placeholder:text-gray-400"
                    data-testid="input-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-xs font-normal text-gray-600 mb-1.5 block">
                    E-mail que receberá a compra
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite seu E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 text-base px-4 border-gray-200 focus:border-gray-300 bg-white placeholder:text-gray-400"
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cpf" className="text-xs font-normal text-gray-600 mb-1.5 block">
                    Seu CPF/CNPJ
                  </Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    className="h-14 text-base px-4 border-gray-200 focus:border-gray-300 bg-white placeholder:text-gray-400"
                    data-testid="input-cpf"
                  />
                </div>
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-6 border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  2
                </div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  MÉTODO DE PAGAMENTO
                </h3>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg" 
                      alt="PIX" 
                      className="h-6 sm:h-7 object-contain"
                    />
                    <span className="text-sm font-medium text-gray-700">Pagamento via PIX</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-600">100% Seguro</span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleGeneratePix}
                disabled={isProcessing}
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 6px 0 0 rgba(34, 197, 94, 0.7)',
                }}
                data-testid="button-generate-pix"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Gerar Código PIX
              </Button>

              {/* Security Badges */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Protegido por
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    BETA READER BRASIL
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    © 2025. Todos os direitos reservados
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          /* PIX Payment Screen */
          <div className="space-y-6">
            {/* Countdown Timer */}
            <PixCountdown 
              initialMinutes={10} 
              onExpire={handlePixExpire}
            />
            
            {/* PIX Card */}
            <Card className="overflow-hidden border-gray-200">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6" />
                    <div>
                      <h2 className="text-lg font-bold">PIX Gerado!</h2>
                      <p className="text-sm opacity-90">Escaneie ou copie o código</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPixData(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    data-testid="button-close-pix"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                    <QRCodeSVG
                      value={pixData.pixQrCode}
                      size={220}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>
                
                {/* Amount */}
                <div className="text-center pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Valor</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {pixData.amount.toFixed(2)}
                  </p>
                </div>
                
                {/* PIX Code */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">Código PIX</Label>
                  <div className="p-3 bg-gray-50 rounded-lg break-all">
                    <p className="text-xs text-gray-600 font-mono">
                      {pixData.pixCode}
                    </p>
                  </div>
                  <Button
                    onClick={handleCopyPixCode}
                    className="w-full h-12 font-medium bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 border-b-4 border-green-700 active:translate-y-0 active:border-b-2"
                    data-testid="button-copy-pix"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Código Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Código PIX
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Instructions */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900">Como pagar:</h4>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li>1. Abra o app do seu banco ou carteira digital</li>
                    <li>2. Escolha pagar com PIX</li>
                    <li>3. Escaneie o QR Code ou copie e cole o código</li>
                    <li>4. Confirme o pagamento</li>
                  </ol>
                </div>
                
                {/* Auto Redirect Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Aguardando pagamento
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Quando o pagamento for confirmado, você será automaticamente 
                        redirecionado para a tela inicial com seu plano ativo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}