import { useState, useEffect } from "react";
import { Check, X, Shield, Clock, Copy, CheckCircle2, Loader, TrendingUp, Wallet, Star, Sparkles, BookOpen, ChevronRight, ArrowRight, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { QRCodeSVG } from 'qrcode.react';
import { UtmTracker } from '@/utils/utmTracker';
import { fbPixel } from '@/utils/facebookPixel';
import { useToast } from "@/hooks/use-toast";

export default function Planos() {
  const [showPixModal, setShowPixModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [userBalance, setUserBalance] = useState(125.00); // User's accumulated balance
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // User data
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: ''
  });

  // PIX data
  const [pixData, setPixData] = useState<{
    pixCode: string;
    pixQrCode: string;
    amount: number;
    orderId: string;
  } | null>(null);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
    fbPixel.trackViewContent({
      content_name: 'Plans Page',
      content_category: 'page',
      content_type: 'plans_selection'
    });
    
    // Track Add to Cart when viewing the plan
    fbPixel.trackAddToCart({
      value: 29.90,
      currency: 'BRL',
      content_name: 'Beta Reader Premium',
      content_ids: ['premium'],
      content_type: 'product',
      plan: 'premium'
    });
  }, []);

  // Timer for PIX
  useEffect(() => {
    if (showPixModal && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && showPixModal) {
      toast({
        title: "Tempo expirado",
        description: "O código PIX expirou. Por favor, gere um novo código.",
        variant: "destructive",
      });
      setShowPixModal(false);
      setPixData(null);
      setTimeLeft(300);
    }
  }, [showPixModal, timeLeft, toast]);

  const loadUserData = async () => {
    try {
      // Get user ID from auth status
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      
      if (authData.isAuthenticated && authData.user?.id) {
        // Get user details including full name
        const userResponse = await fetch(`/api/users/${authData.user.id}`);
        if (userResponse.ok) {
          const userDetails = await userResponse.json();
          
          setUserData(prev => ({
            ...prev,
            fullName: userDetails.fullName || userDetails.username || '',
            email: userDetails.email || '',
            phone: userDetails.phone || '',
            cpf: userDetails.cpf || ''
          }));
        }
      }

      // Also check localStorage
      const savedData = localStorage.getItem('userData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setUserData(prev => ({
          fullName: prev.fullName || parsed.fullName || '',
          email: prev.email || parsed.email || '',
          phone: prev.phone || parsed.phone || '',
          cpf: prev.cpf || parsed.cpf || ''
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const generateRandomValidCPF = () => {
    const randomDigit = () => Math.floor(Math.random() * 10);
    let cpf = Array.from({ length: 9 }, randomDigit);
    
    // Calculate first verification digit using the same logic as backend
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += cpf[i] * (10 - i);
    }
    let firstVerifier = 11 - (sum % 11);
    if (firstVerifier > 9) firstVerifier = 0;
    cpf.push(firstVerifier);
    
    // Calculate second verification digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += cpf[i] * (11 - i);
    }
    let secondVerifier = 11 - (sum % 11);
    if (secondVerifier > 9) secondVerifier = 0;
    cpf.push(secondVerifier);
    
    return cpf.join('');
  };

  const handleActivatePlan = async () => {
    setIsProcessing(true);
    
    // Track Initiate Checkout when user clicks to activate
    fbPixel.trackInitiateCheckout({
      value: 29.90,
      currency: 'BRL',
      content_name: 'Beta Reader Premium',
      content_category: 'plan_upgrade',
      content_ids: ['premium'],
      content_type: 'product',
      num_items: 1,
      plan: 'premium',
      paymentMethod: 'pix'
    });

    // Generate PIX directly
    await handleGeneratePix();
  };

  const handleGeneratePix = async () => {
    try {
      // Use fixed CPF as requested
      const fixedCpf = '09092192651'; // 090.921.926-51 without formatting
      
      const requestBody = {
        plan: 'premium',
        amount: 29.90,
        email: userData.email || 'user@example.com',
        cpf: fixedCpf,
        fullName: userData.fullName || 'Usuário Beta Reader',
      };
      
      const response = await fetch('/api/payment/generate-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PIX');
      }

      const data = await response.json();
      
      // Use paymentId instead of orderId, and qrCodeUrl for QR code
      const paymentId = data.paymentId || data.orderId;
      const qrCodeData = data.qrCodeUrl || data.pixQrCode || data.pixCode;
      
      setPixData({
        pixCode: data.pixCode,
        pixQrCode: qrCodeData,
        amount: data.amount,
        orderId: paymentId
      });
      
      setShowPixModal(true);
      setTimeLeft(300); // Reset timer

      // Track PIX generation
      fbPixel.trackAddPaymentInfo({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Beta Reader Premium',
        content_category: 'plan_upgrade'
      });
      
      // Track PIX generation

      // Start payment polling
      startPaymentPolling(paymentId);
    } catch (error) {
      console.error('Error generating PIX:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startPaymentPolling = (paymentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/check-status?paymentId=${paymentId}`);
        const data = await response.json();
        
        if (data.status === 'paid') {
          clearInterval(pollInterval);
          
          // Track successful payment
          fbPixel.trackPurchase({
            value: 29.90,
            currency: 'BRL',
            content_name: 'Beta Reader Premium',
            content_category: 'plan_upgrade',
            content_ids: ['premium'],
            content_type: 'product'
          });
          
          // Payment confirmed
          
          toast({
            title: "Pagamento confirmado!",
            description: "Seu plano foi ativado com sucesso. Redirecionando...",
          });
          
          setShowPixModal(false);
          
          // Redirect to accelerator page
          setTimeout(() => {
            setLocation('/acelerador');
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Clear interval after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  const copyToClipboard = async () => {
    if (pixData?.pixCode) {
      await navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamento.",
      });
      setTimeout(() => setCopied(false), 3000);

      // Track copy action
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-12">
        
        {/* Welcome Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Parabéns pela jornada até aqui!
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Você já deu o primeiro passo!
          </h1>
          
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Agora você já conhece nosso app e tem uma conta ativa em nossos sistemas.
          </p>

          {/* Balance Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 max-w-md mx-auto mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Wallet className="h-6 w-6 text-green-600" />
              <span className="text-sm text-gray-600">Saldo Acumulado</span>
            </div>
            <div className="text-4xl font-bold text-gray-900">
              R$ {userBalance.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              disponível em nossa plataforma
            </p>
          </div>

          <p className="text-xl font-medium text-gray-800 mb-2">
            Mas é hora de dar um passo para frente rumo ao seu sucesso financeiro!
          </p>
          <p className="text-gray-600">
            Libere todo o potencial do Beta Reader Brasil e maximize seus ganhos.
          </p>
        </div>

        {/* Single Plan Card */}
        <div className="max-w-md mx-auto">
          <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-gray-100 hover:border-green-400 transition-all duration-300">
            {/* Plan Header with Logo */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                  <BookOpen className="h-12 w-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center mb-2">
                Beta Reader Premium
              </h2>
              <div className="flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-yellow-300" />
                <span className="text-sm">Acesso Total Ilimitado</span>
                <Crown className="h-5 w-5 text-yellow-300" />
              </div>
            </div>

            {/* Plan Benefits */}
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Atividades ilimitadas por dia</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Saques ilimitados sem valor mínimo</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Acesso imediato após ativação</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Suporte prioritário 24/7</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Garantia de 30 dias</span>
                </li>
              </ul>

              {/* Price Section */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Pagamento único</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold text-gray-900">R$ 29,90</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sem mensalidades</p>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleActivatePlan}
                disabled={isProcessing}
                className="w-full py-4 px-6 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl shadow-[0_4px_0_0_rgb(34,197,94,0.5)] hover:shadow-[0_2px_0_0_rgb(34,197,94,0.5)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0_0_0_rgb(34,197,94,0.5)] disabled:shadow-none disabled:translate-y-0 transition-all duration-150"
              >
                {isProcessing ? (
                  <>
                    <Loader className="inline-block h-5 w-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Ativar Plano Premium
                    <ArrowRight className="inline-block h-5 w-5 ml-2" />
                  </>
                )}
              </button>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                <Shield className="h-4 w-4" />
                <span>Pagamento 100% seguro via PIX</span>
              </div>
            </div>
          </div>

          {/* Guarantee Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 border border-amber-200 mt-6">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Garantia de 30 dias
                </h3>
                <p className="text-sm text-gray-700">
                  Você tem <span className="font-semibold">30 dias de garantia total</span> para solicitar o reembolso completo e imediato do valor, 
                  caso não queira ou não goste do Beta Reader Brasil por qualquer motivo, desde que não tenha recebido nenhum saque do app.
                  Sua satisfação é nossa prioridade!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PIX Modal */}
      {showPixModal && pixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPixModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header with Timer */}
            <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-5 rounded-t-2xl border-b border-green-100">
              <button
                onClick={() => setShowPixModal(false)}
                className="absolute right-4 top-4 p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center justify-between pr-8">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">PIX Gerado!</h2>
                  <p className="text-xs text-gray-600 mt-0.5">Escaneie o QR Code ou copie o código</p>
                </div>
                <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                  timeLeft > 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
              {/* QR Code */}
              <div className="flex justify-center p-3 sm:p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                {pixData.pixQrCode.startsWith('http') ? (
                  <img 
                    src={pixData.pixQrCode}
                    alt="QR Code PIX"
                    className="w-[150px] h-[150px] sm:w-[180px] sm:h-[180px]"
                  />
                ) : (
                  <div className="w-[150px] h-[150px] sm:w-[180px] sm:h-[180px]">
                    <QRCodeSVG
                      value={pixData.pixQrCode}
                      size={180}
                      level="H"
                      includeMargin={false}
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
              
              {/* Amount */}
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">Valor a pagar</p>
                <p className="text-2xl font-bold text-gray-900">R$ {pixData.amount.toFixed(2)}</p>
              </div>
              
              {/* PIX Code */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Código PIX (copia e cola)</label>
                <div className="space-y-2 sm:space-y-3">
                  <textarea
                    readOnly
                    value={pixData.pixCode}
                    className="w-full p-2 sm:p-3 text-[10px] sm:text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg resize-none"
                    rows={3}
                  />
                  <button
                    onClick={copyToClipboard}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm sm:text-base font-medium rounded-lg transition-all transform hover:scale-[1.02]"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Código Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-5 w-5" />
                        Copiar Código PIX
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-900">Como pagar:</p>
                <ol className="text-xs text-blue-800 space-y-1 ml-4">
                  <li>1. Abra o app do seu banco</li>
                  <li>2. Escolha pagar com PIX</li>
                  <li>3. Escaneie o QR Code ou copie o código</li>
                  <li>4. Confirme o pagamento</li>
                </ol>
              </div>
              
              {/* Removed annoying status message */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}