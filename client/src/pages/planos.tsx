import { useState, useEffect } from "react";
import { Check, X, Shield, Clock, Zap, Award, DollarSign, AlertCircle, ChevronRight, Copy, CheckCheck, Loader } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const user = await response.json();
        setUserData({
          fullName: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          cpf: user.cpf || ''
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
      value: selectedPlan === 'inicial' ? 29.90 : 37.00,
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
    // Validate fields
    if (!userData.fullName || !userData.email || !userData.cpf) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos obrigatórios.",
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
      const planPrice = selectedPlan === 'inicial' ? 29.90 : 37.00;
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
          const planPrice = selectedPlan === 'inicial' ? 29.90 : 37.00;
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

      {/* Plans Section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Plano Inicial */}
          <div 
            className={`relative rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
              selectedPlan === 'inicial' 
                ? 'border-green-500 shadow-xl' 
                : 'border-gray-200'
            }`}
          >
            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Plano Inicial</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Para começar a ganhar</p>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
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
                    <span className="font-semibold">Até 5 atividades diárias</span>
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

          {/* Beta Reader Oficial */}
          <div 
            className={`relative rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
              selectedPlan === 'oficial' 
                ? 'border-green-500 shadow-xl' 
                : 'border-gray-200'
            }`}
          >
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
              <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg">
                RECOMENDADO
              </span>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Beta Reader Oficial</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Máximo potencial de ganhos</p>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  R$ 37,00
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

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirme seus dados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={userData.fullName}
                onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={userData.phone}
                onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={userData.cpf}
                onChange={(e) => setUserData({ ...userData, cpf: formatCPF(e.target.value) })}
                disabled={!isEditing}
                maxLength={14}
                className="mt-1"
              />
            </div>

            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full"
              >
                Editar Dados
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="w-full"
              >
                Salvar Alterações
              </Button>
            )}

            <Button
              onClick={handleGeneratePix}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  Gerar PIX e Ativar Plano
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIX Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>PIX Gerado!</span>
              <span className={`text-sm px-3 py-1 rounded-full ${
                timeLeft > 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {formatTime(timeLeft)}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {pixData && (
            <div className="space-y-4 mt-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white border-2 border-gray-200 rounded-xl">
                <QRCodeSVG
                  value={pixData.pixQrCode}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Amount */}
              <div className="text-center">
                <p className="text-sm text-gray-600">Valor</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {pixData.amount.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* PIX Code */}
              <div>
                <Label className="text-xs">Código PIX</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg break-all">
                  <p className="text-xs text-gray-600 font-mono">
                    {pixData.pixCode}
                  </p>
                </div>
              </div>

              {/* Copy Button */}
              <Button
                onClick={handleCopyPixCode}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
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

              {/* Info */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  Quando o pagamento for confirmado, você será automaticamente redirecionado.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}