import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Check, Clock, Copy, CheckCheck, ChevronLeft, QrCode, Shield, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from 'qrcode.react';
import { UtmTracker } from '@/utils/utmTracker';
import { fbPixel } from '@/utils/facebookPixel';
import { useToast } from "@/hooks/use-toast";
import Confetti from 'react-confetti';
import { lockBodyScroll, unlockBodyScroll } from "@/utils/scrollLock";

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
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  
  // PIX data
  const [pixData, setPixData] = useState<{
    pixCode: string;
    pixQrCode: string;
    amount: number;
    orderId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Countdown timer (10 minutes = 600 seconds)
  const [timeRemaining, setTimeRemaining] = useState(600);
  
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
  
  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (pixData && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Timer expired
            toast({
              title: "Tempo expirado",
              description: "O código PIX expirou. Por favor, gere um novo código.",
              variant: "destructive",
            });
            setPixData(null);
            setTimeRemaining(600);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pixData, timeRemaining, toast]);
  
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
  
  const isValidCPF = (cpf: string): boolean => {
    const cleanCpf = cpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false; // All digits are the same
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return digit1 === parseInt(cleanCpf[9]) && digit2 === parseInt(cleanCpf[10]);
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const pollPaymentStatus = async (orderId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        return;
      }

      try {
        // Using LiraPay status endpoint
        const response = await fetch(`/api/payments/lira/status/${orderId}`);
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

          // Show confetti
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);

          // Show success message
          toast({
            title: "Pagamento confirmado! 🎉",
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
    
    // Validate CPF
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValidCPF(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido.",
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
    setShowLoadingPopup(true);
    lockBodyScroll();
    
    // Simulate loading time for better UX
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
      
      // Get UTM parameters to send to LiraPay
      const utmParams = UtmTracker.getForOrinPay();
      
      // Call backend to generate PIX via LiraPay
      const response = await fetch('/api/payments/lira/create', {
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
        pixCode: data.copyPasteCode,
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
        pixCode: data.copyPasteCode,
        pixQrCode: data.qrCodeText || data.copyPasteCode,
        amount: data.amount,
        orderId: data.orderId
      });
      
      // Reset timer
      setTimeRemaining(600);
      
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
      setShowLoadingPopup(false);
      unlockBodyScroll();
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
      originalPrice: 39.90,
    },
    unlimited: {
      name: 'Beta Reader Ilimitado',
      originalPrice: 59.90,
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
      
      {/* Loading Popup */}
      {showLoadingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  Gerando seu pagamento
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  e confirmando sua conta...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Header - Simplified without date/time */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
              <span className="text-lg font-semibold text-gray-900">Beta Reader Brasil</span>
            </div>
            <div className="w-9" />
          </div>
        </div>
      </div>
      
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {!pixData ? (
          <>
            {/* Plan Banner (Simplified) */}
            <Card className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{currentPlan.name}</h3>
                </div>
                <div className="text-right">
                  {isDiscounted && (
                    <p className="text-sm text-gray-400 line-through">
                      R$ {currentPlan.originalPrice.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <p className="text-xl font-bold text-gray-900">
                    R$ {planPrice.toFixed(2).replace('.', ',')}
                  </p>
                  {isDiscounted && (
                    <span className="text-xs text-green-600 font-semibold">
                      {discount}% OFF
                    </span>
                  )}
                </div>
              </div>
            </Card>
            
            {/* User Data Form with more spacing */}
            <Card className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">Confirme seus dados</h3>
              
              <div className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
                    Nome completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-green-500 focus:ring-green-500"
                    data-testid="input-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-green-500 focus:ring-green-500"
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cpf" className="text-sm font-medium text-gray-700 mb-2 block">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-green-500 focus:ring-green-500"
                    data-testid="input-cpf"
                  />
                </div>
              </div>
            </Card>
            
            {/* PIX Payment Method Card - More beautiful */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <QrCode className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Pagamento via PIX</p>
                    <p className="text-sm text-gray-600">Aprovação instantânea</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total a pagar</span>
                  <span className="text-2xl font-bold text-gray-900">
                    R$ {planPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleGeneratePix}
                disabled={isProcessing || !fullName || !email || !cpf}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_6px_0_0_rgb(22,101,52)] hover:shadow-[0_4px_0_0_rgb(22,101,52)] hover:translate-y-[2px] active:shadow-[0_2px_0_0_rgb(22,101,52)] active:translate-y-[4px] transform text-base"
                data-testid="button-generate-pix"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Gerar PIX
                  </span>
                )}
              </button>
            </Card>
            
            {/* Info section similar to the image */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-xs text-gray-600 leading-relaxed">
                Ao clicar em <span className="font-semibold">Comprar agora</span>, eu declaro que li e concordo que a <span className="font-semibold">Beta Reader</span> está processando este pedido a serviço do vendedor e não possui responsabilidade pelo conteúdo e/ou uso, controle prévio deste, com os <span className="text-green-600 underline cursor-pointer">Termos de Uso</span>, <span className="text-green-600 underline cursor-pointer">Política de Privacidade</span> e <span className="text-green-600 underline cursor-pointer">Políticas da Beta Reader</span> e que sou maior de idade ou autorizado e acompanhado por um responsável.
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <img 
                      src="/logo-beta-reader.png" 
                      alt="Beta Reader" 
                      className="h-6 w-auto object-contain"
                    />
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Protegido por</p>
                      <p className="text-xs font-bold text-gray-700 -mt-0.5">BETA READER TECNOLOGIA</p>
                      <p className="text-[10px] text-gray-500">Políticas de Privacidade e dados protegidos</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Crédito</p>
                    <p className="text-xs font-bold text-gray-700 -mt-0.5">Proteção digital</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* PIX Generated Screen with Timer */
          <div className="space-y-4">
            {/* Timer Card at the top */}
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Tempo restante</span>
                </div>
                <span className="text-lg font-bold text-orange-600">{formatTime(timeRemaining)}</span>
              </div>
            </Card>
            
            {/* QR Code Card */}
            <Card className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  PIX Gerado!
                </h2>
                <p className="text-sm text-gray-600">
                  Escaneie o código ou copie e cole no seu banco
                </p>
              </div>
              
              {/* QR Code */}
              <div className="bg-gray-50 rounded-lg p-6 mb-4 flex justify-center">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <QRCodeSVG
                    value={pixData.pixQrCode}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>
              
              {/* Amount with discrete anchoring */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Valor</span>
                  <div className="text-right">
                    {isDiscounted && (
                      <span className="text-xs text-gray-400 line-through mr-2">
                        R$ {currentPlan.originalPrice.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    <span className="text-lg font-bold text-gray-900">
                      R$ {pixData.amount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* PIX Code */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Código PIX copia e cola
                </Label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-mono break-all mb-3 line-clamp-3">
                    {pixData.pixCode}
                  </p>
                  <Button
                    onClick={handleCopyPixCode}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold h-11 rounded-lg"
                    data-testid="button-copy-pix"
                  >
                    {copied ? (
                      <span className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4" />
                        Copiado!
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
            </Card>
            
            {/* Status Card */}
            <Card className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-center gap-3">
                <div className="animate-pulse">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Aguardando pagamento
                  </p>
                  <p className="text-xs text-gray-600">
                    Você será redirecionado automaticamente
                  </p>
                </div>
              </div>
            </Card>
            
            {/* New PIX button */}
            <Button
              onClick={() => {
                setPixData(null);
                setTimeRemaining(600);
              }}
              variant="outline"
              className="w-full h-11 rounded-lg border-gray-200"
              data-testid="button-new-pix"
            >
              Gerar novo código PIX
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}