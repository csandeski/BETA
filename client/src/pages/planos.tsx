import { useState, useEffect } from "react";
import { Check, X, Shield, Clock, Zap, Award, DollarSign, AlertCircle, ChevronRight, Copy, CheckCheck, Loader, Server, Headphones, ShieldCheck, TrendingUp, Calculator, Sparkles, Edit2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';
import { UtmTracker } from '@/utils/utmTracker';
import { fbPixel } from '@/utils/facebookPixel';
import { useToast } from "@/hooks/use-toast";

export default function Planos() {
  const [selectedPlan, setSelectedPlan] = useState<'inicial' | 'oficial'>('oficial');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [sessionTimeLeft, setSessionTimeLeft] = useState(900); // 15 minutes session timer
  const [commitmentChecked, setCommitmentChecked] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // User data
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: ''
  });
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  }>({});

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
  }, []);

  // Session timer for price lock
  useEffect(() => {
    if (sessionTimeLeft > 0) {
      const timer = setTimeout(() => setSessionTimeLeft(sessionTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [sessionTimeLeft]);

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
      if (!authData.userId) {
        console.error('User not authenticated');
        return;
      }
      
      // Load user data from API
      const userResponse = await fetch(`/api/users/${authData.userId}/data`);
      if (userResponse.ok) {
        const data = await userResponse.json();
        setUserData({
          fullName: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          cpf: data.cpf || ''
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectPlan = (plan: 'inicial' | 'oficial') => {
    setSelectedPlan(plan);
    fbPixel.trackViewContent({
      content_name: plan === 'inicial' ? 'Plano Inicial' : 'Beta Reader Oficial',
      content_category: 'plan',
      value: plan === 'inicial' ? 29.90 : 37.00,
      currency: 'BRL'
    });
  };

  const handleContinue = () => {
    setShowConfirmModal(true);
    fbPixel.trackInitiateCheckout({
      value: selectedPlan === 'inicial' ? 29.90 : 37.70,
      currency: 'BRL',
      content_name: selectedPlan === 'inicial' ? 'Plano Inicial' : 'Beta Reader Oficial',
      content_category: 'subscription',
      content_ids: [selectedPlan + '_plan'],
      content_type: 'product',
      num_items: 1,
      plan: selectedPlan,
      paymentMethod: 'pix'
    });
  };

  const handleGeneratePix = async () => {
    // Clear previous errors
    setFieldErrors({});
    
    // Validate fields
    const errors: typeof fieldErrors = {};
    let hasError = false;
    
    if (!userData.fullName || userData.fullName.trim().length < 3) {
      errors.fullName = 'Nome completo é obrigatório (mínimo 3 caracteres)';
      hasError = true;
    }
    
    if (!userData.email || !userData.email.includes('@')) {
      errors.email = 'E-mail válido é obrigatório';
      hasError = true;
    }
    
    if (!userData.cpf || userData.cpf.replace(/\D/g, '').length !== 11) {
      errors.cpf = 'CPF válido é obrigatório (11 dígitos)';
      hasError = true;
    }
    
    if (hasError) {
      setFieldErrors(errors);
      setIsEditing(true); // Enable editing automatically
      
      // Focus on first error field
      setTimeout(() => {
        if (errors.fullName) {
          document.getElementById('input-fullname')?.focus();
        } else if (errors.email) {
          document.getElementById('input-email')?.focus();
        } else if (errors.cpf) {
          document.getElementById('input-cpf')?.focus();
        }
      }, 100);
      
      toast({
        title: "Dados incompletos",
        description: "Por favor, corrija os campos destacados em vermelho.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Get user ID
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      if (!authData.userId) {
        toast({
          title: "Erro de autenticação",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        setLocation('/');
        return;
      }

      // Get UTM parameters
      const utmParams = UtmTracker.getForOrinPay();

      // Generate PIX
      const response = await fetch('/api/payment/generate-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': authData.userId
        },
        body: JSON.stringify({
          plan: selectedPlan === 'inicial' ? 'inicial' : 'premium',
          fullName: userData.fullName,
          email: userData.email,
          cpf: userData.cpf,
          utmParams
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate PIX');
      }

      const data = await response.json();

      // Track Facebook Pixel events
      const planPrice = selectedPlan === 'inicial' ? 29.90 : 37.70;
      const planName = selectedPlan === 'inicial' ? 'Plano Inicial' : 'Beta Reader Oficial';

      fbPixel.trackAddPaymentInfo({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_category: 'subscription',
        content_ids: [selectedPlan + '_plan'],
        content_type: 'product',
        success: true
      });

      fbPixel.trackCustom('PixGerado', {
        value: planPrice,
        currency: 'BRL',
        plan: selectedPlan,
        planName: planName,
        pixCode: data.pixCode,
        orderId: data.orderId
      });

      // Save PIX data and show modal
      setPixData({
        pixCode: data.pixQrCode,
        pixQrCode: data.pixQrCode,
        amount: data.amount,
        orderId: data.orderId
      });
      
      setShowConfirmModal(false);
      setShowPixModal(true);
      setTimeLeft(300); // Reset timer
      
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
          // Track purchase
          const planPrice = selectedPlan === 'inicial' ? 29.90 : 37.70;
          const planName = selectedPlan === 'inicial' ? 'Plano Inicial' : 'Beta Reader Oficial';
          
          fbPixel.trackPurchase({
            value: planPrice,
            currency: 'BRL',
            content_name: planName,
            content_category: 'subscription',
            content_ids: [selectedPlan + '_plan'],
            content_type: 'product',
            num_items: 1,
            email: userData.email,
            firstName: userData.fullName.split(' ')[0],
            lastName: userData.fullName.split(' ').slice(1).join(' '),
            transactionId: orderId,
            plan: selectedPlan,
            paymentMethod: 'pix'
          });

          toast({
            title: "Pagamento confirmado!",
            description: "Seu plano foi ativado com sucesso. Redirecionando...",
          });
          
          setTimeout(() => {
            setLocation('/acelerador');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-beta-reader.png" 
                alt="Beta Reader Brasil" 
                className="h-8 w-auto object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Escolha seu Plano</h1>
                <p className="text-xs text-gray-600">Desbloqueie todo o potencial</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setLocation('/dashboard')}
              className="text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Why We Charge Section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-blue-200 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Por que cobramos esse valor?
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Servidores Premium</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Mantemos servidores de alta performance para garantir que você consiga acessar o app 24/7 sem travamentos.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Segurança Total</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Investimos em segurança de ponta para proteger seus dados e garantir pagamentos seguros.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Headphones className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Suporte Ativo</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Equipe de suporte dedicada e competente para resolver qualquer dúvida ou problema rapidamente.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Melhorias Constantes</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Atualizações frequentes com novos recursos e correções para melhorar sua experiência.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-700 text-center">
              <span className="font-semibold">💡 Importante:</span> Este valor único garante acesso vitalício ao plano escolhido, 
              sem mensalidades ou taxas ocultas. É um investimento único no seu sucesso!
            </p>
          </div>
        </div>

        {/* Plans Section */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Plano Inicial */}
          <div className="relative">
            <div 
              className={`relative rounded-2xl transition-all duration-300 hover:shadow-2xl ${
                selectedPlan === 'inicial' 
                  ? 'shadow-2xl ring-2 ring-green-500 ring-offset-2' 
                  : 'shadow-lg'
              }`}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                border: '1px solid rgba(34, 197, 94, 0.15)'
              }}
            >
              <div className="p-4 sm:p-6">
              <div className="mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Plano Inicial</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Para começar a ganhar</p>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <p className="text-lg text-gray-400 line-through">R$ 49,90</p>
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-40%</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  R$ 29,90
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Pagamento único</p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">Até 2 saques por mês</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">Saque mínimo de R$ 50,00</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">Até 10 atividades diárias</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-500 line-through">
                    Processamento rápido
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-500 line-through">
                    Suporte prioritário
                  </p>
                </div>
              </div>
              
              {/* CTA Button inside card */}
              <button
                onClick={() => {
                  setSelectedPlan('inicial');
                  handleContinue();
                }}
                className="w-full mt-6 py-3.5 px-4 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgb(34,197,94,0.5)] hover:shadow-[0_2px_0_0_rgb(34,197,94,0.5)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0_0_0_rgb(34,197,94,0.5)] transition-all duration-150 text-sm sm:text-base"
                data-testid="button-select-inicial"
              >
                Ativar Plano Inicial
              </button>
              </div>
            </div>
          </div>

          {/* Beta Reader Oficial */}
          <div className="relative">
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
              <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg animate-pulse">
                🏆 MAIS ESCOLHIDO
              </span>
            </div>
            
            <div 
              className={`relative rounded-2xl transition-all duration-300 hover:shadow-2xl ${
                selectedPlan === 'oficial' 
                  ? 'shadow-2xl ring-2 ring-green-500 ring-offset-2' 
                  : 'shadow-lg'
              }`}
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '2px solid rgba(34, 197, 94, 0.3)'
              }}
            >
              <div className="p-4 sm:p-6">
              <div className="mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Beta Reader Oficial</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Máximo potencial de ganhos</p>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <p className="text-lg text-gray-400 line-through">R$ 89,90</p>
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-58%</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  R$ 37,70
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Pagamento único</p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">Até 50 atividades diárias</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">Sem valor mínimo de saque</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">Saques em até 15 minutos</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">Saques ilimitados</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">Suporte prioritário 24/7</span>
                  </p>
                </div>
              </div>
              
              {/* CTA Button inside card */}
              <button
                onClick={() => {
                  setSelectedPlan('oficial');
                  handleContinue();
                }}
                className="w-full mt-6 py-3.5 px-4 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgb(34,197,94,0.5)] hover:shadow-[0_2px_0_0_rgb(34,197,94,0.5)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0_0_0_rgb(34,197,94,0.5)] transition-all duration-150 text-sm sm:text-base"
                data-testid="button-select-oficial"
              >
                Ativar Beta Reader Oficial
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Guarantee Card */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 border border-amber-200 mb-6">
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

      {/* Confirmation Modal - Custom Mobile-First Design */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl">
            {/* Header with Welcome Message */}
            <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-5 rounded-t-2xl border-b border-green-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="absolute right-4 top-4 p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Próximo Passo para Seu Sucesso!</h2>
              </div>
              <p className="text-xs text-gray-600">Você já conhece nosso app e tem uma conta ativa. Agora é hora de maximizar seus ganhos!</p>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* ROI Calculator Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <Calculator className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <h3 className="text-sm font-bold text-gray-900">Seu Retorno do Investimento</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Com 10 atividades/dia:</span>
                        <span className="text-xs font-bold text-green-600">R$ 125/dia</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Investimento se paga em:</span>
                        <span className="text-xs font-bold text-blue-600">
                          {selectedPlan === 'inicial' ? '~3 atividades' : '~4 atividades'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-blue-100">
                        <span className="text-xs text-gray-600">Ganho semanal estimado:</span>
                        <span className="text-xs font-bold text-green-600">R$ 875</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Reframing */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-gray-700">
                    <span className="font-bold text-gray-900">
                      {selectedPlan === 'inicial' ? 'Menos de R$ 1,00' : 'Apenas R$ 1,25'}
                    </span>
                    {' '}por dia • Equivale a{' '}
                    <span className="font-bold text-gray-900">
                      {selectedPlan === 'inicial' ? '2 leituras' : '3 leituras'}
                    </span>
                    {' '}• Menos que um café!
                  </p>
                </div>
              </div>

              {/* Urgency Timer */}
              <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <p className="text-xs font-medium text-gray-700">
                      Preço especial travado por:
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-600 animate-pulse">
                    {formatTime(sessionTimeLeft)}
                  </span>
                </div>
              </div>

              {/* Form Fields Title */}
              <div className="pt-2">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Confirme seus dados para ativação</h3>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome Completo</label>
                <input
                  id="input-fullname"
                  type="text"
                  value={userData.fullName}
                  onChange={(e) => {
                    setUserData({ ...userData, fullName: e.target.value });
                    if (fieldErrors.fullName) {
                      setFieldErrors({ ...fieldErrors, fullName: undefined });
                    }
                  }}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
                    fieldErrors.fullName 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-green-500 focus:border-transparent'
                  }`}
                  placeholder="Digite seu nome completo"
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">E-mail</label>
                <input
                  id="input-email"
                  type="email"
                  value={userData.email}
                  onChange={(e) => {
                    setUserData({ ...userData, email: e.target.value });
                    if (fieldErrors.email) {
                      setFieldErrors({ ...fieldErrors, email: undefined });
                    }
                  }}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
                    fieldErrors.email 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-green-500 focus:border-transparent'
                  }`}
                  placeholder="seu@email.com"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Telefone</label>
                <input
                  id="input-phone"
                  type="tel"
                  value={userData.phone}
                  onChange={(e) => {
                    setUserData({ ...userData, phone: e.target.value });
                    if (fieldErrors.phone) {
                      setFieldErrors({ ...fieldErrors, phone: undefined });
                    }
                  }}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
                    fieldErrors.phone 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-green-500 focus:border-transparent'
                  }`}
                  placeholder="(11) 98765-4321"
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">CPF</label>
                <input
                  id="input-cpf"
                  type="text"
                  value={userData.cpf}
                  onChange={(e) => {
                    setUserData({ ...userData, cpf: formatCPF(e.target.value) });
                    if (fieldErrors.cpf) {
                      setFieldErrors({ ...fieldErrors, cpf: undefined });
                    }
                  }}
                  disabled={!isEditing}
                  maxLength={14}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
                    fieldErrors.cpf 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-green-500 focus:border-transparent'
                  }`}
                  placeholder="000.000.000-00"
                />
                {fieldErrors.cpf && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.cpf}
                  </p>
                )}
              </div>

              {/* Micro-commitment Checkbox */}
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commitmentChecked}
                    onChange={(e) => setCommitmentChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900">
                      Comprometo-me a completar pelo menos{' '}
                      <span className="font-bold text-green-600">
                        {selectedPlan === 'inicial' ? '5 leituras' : '10 leituras'}
                      </span>
                      {' '}hoje para recuperar meu investimento rapidamente
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setFieldErrors({});
                    }}
                    className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
                  >
                    <Edit2 className="inline-block h-4 w-4 mr-2" />
                    Editar Dados
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFieldErrors({});
                    }}
                    className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
                  >
                    <Check className="inline-block h-4 w-4 mr-2" />
                    Salvar Alterações
                  </button>
                )}

                <button
                  onClick={handleGeneratePix}
                  disabled={isProcessing || !commitmentChecked}
                  className="w-full py-3.5 px-4 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgb(34,197,94,0.5)] hover:shadow-[0_2px_0_0_rgb(34,197,94,0.5)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0_0_0_rgb(34,197,94,0.5)] disabled:shadow-none disabled:translate-y-0 transition-all duration-150 text-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="inline-block h-4 w-4 mr-2 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    <>
                      Liberar Meus Ganhos Agora
                      <TrendingUp className="inline-block h-4 w-4 ml-2" />
                    </>
                  )}
                </button>
                {!commitmentChecked && (
                  <p className="text-xs text-center text-gray-500 mt-2">
                    ✓ Marque a caixa acima para continuar
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIX Modal - Custom Mobile-First Design */}
      {showPixModal && pixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPixModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl">
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
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                <QRCodeSVG
                  value={pixData.pixQrCode}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Amount */}
              <div className="text-center py-2">
                <p className="text-xs text-gray-600">Valor a pagar</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  R$ {pixData.amount.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* PIX Code */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Código PIX</label>
                <div className="p-3 bg-gray-50 rounded-lg break-all">
                  <p className="text-xs text-gray-600 font-mono leading-relaxed">
                    {pixData.pixCode}
                  </p>
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopyPixCode}
                className="w-full py-3.5 px-4 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgb(34,197,94,0.5)] hover:shadow-[0_2px_0_0_rgb(34,197,94,0.5)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0_0_0_rgb(34,197,94,0.5)] transition-all duration-150 text-sm"
              >
                {copied ? (
                  <>
                    <CheckCheck className="inline-block h-4 w-4 mr-2" />
                    Código Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="inline-block h-4 w-4 mr-2" />
                    Copiar Código PIX
                  </>
                )}
              </button>

              {/* Info Alert */}
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <p className="text-xs text-blue-700 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  Quando o pagamento for confirmado, você será automaticamente redirecionado.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}