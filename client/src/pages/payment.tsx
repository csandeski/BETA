import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Copy, CheckCircle, User, Mail, FileText, Loader2, Shield, Clock, TrendingUp, CheckCheck, QrCode } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from 'qrcode.react';
import { UtmTracker } from '@/utils/utmTracker';
import { fbPixel } from '@/utils/facebookPixel';
import { useToast } from "@/hooks/use-toast";

export default function Payment() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get plan from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const planParam = urlParams.get('plan') as 'premium' | 'unlimited' | null;
  
  // Redirect if no plan or invalid plan
  useEffect(() => {
    if (!planParam || (planParam !== 'premium' && planParam !== 'unlimited')) {
      setLocation('/dashboard');
    }
  }, [planParam, setLocation]);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixData, setPixData] = useState<{
    pixCode: string;
    pixQrCode: string;
    amount: number;
    orderId: string;
  } | null>(null);
  
  // Check if user has discount
  const [isDiscounted, setIsDiscounted] = useState(false);
  
  useEffect(() => {
    // Check for discount from localStorage or API
    const checkDiscount = async () => {
      try {
        const authResponse = await fetch('/api/auth/status');
        const authData = await authResponse.json();
        if (authData.isLoggedIn) {
          // Could check user's book count or other criteria for discount
          const userResponse = await fetch('/api/users/me');
          const userData = await userResponse.json();
          if (userData.stats?.totalBooksRead >= 3) {
            setIsDiscounted(true);
          }
        }
      } catch (error) {
        console.error('Error checking discount:', error);
      }
    };
    checkDiscount();
  }, []);
  
  // Track page view
  useEffect(() => {
    if (planParam) {
      const planName = planParam === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado';
      const planPrice = getPlanPrice();
      
      fbPixel.trackViewContent({
        content_name: `Payment Page - ${planName}`,
        content_category: 'payment',
        content_type: 'page',
        value: planPrice,
        currency: 'BRL'
      });
      
      // Track InitiateCheckout when page loads
      fbPixel.trackInitiateCheckout({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_category: 'subscription',
        content_ids: [planParam + '_plan'],
        content_type: 'product',
        num_items: 1,
        plan: planParam,
        paymentMethod: 'pix'
      });
    }
  }, [planParam]);
  
  const getPlanPrice = () => {
    if (!planParam) return 0;
    
    if (planParam === 'premium') {
      const original = 39.90;
      return isDiscounted ? (original * 0.75) : original; // 25% OFF
    }
    if (planParam === 'unlimited') {
      const original = 59.90;
      return isDiscounted ? (original * 0.65) : original; // 35% OFF
    }
    return 0;
  };
  
  const getPlanName = () => {
    if (planParam === 'premium') return 'Beta Reader Oficial';
    if (planParam === 'unlimited') return 'Beta Reader Ilimitado';
    return '';
  };
  
  const getPlanBenefits = () => {
    if (planParam === 'premium') {
      return [
        'Leia 15 livros por mês',
        'Ganhe até R$ 675 mensais',
        'Bônus de R$ 100 no primeiro saque',
        'Suporte prioritário via WhatsApp',
        'Acesso a livros exclusivos',
        'Sem anúncios'
      ];
    }
    if (planParam === 'unlimited') {
      return [
        'Livros ilimitados por mês',
        'Ganhos ilimitados',
        'Bônus de R$ 150 no primeiro saque',
        'Suporte VIP 24/7',
        'Acesso antecipado a novos livros',
        'Sem anúncios',
        'Convites ilimitados de amigos',
        'Cashback em compras futuras'
      ];
    }
    return [];
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
  
  const validateForm = () => {
    if (!fullName || fullName.length < 3) {
      toast({
        title: "Nome inválido",
        description: "Por favor, insira seu nome completo",
        variant: "destructive"
      });
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido",
        variant: "destructive"
      });
      return false;
    }
    
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido com 11 dígitos",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };
  
  const handleGeneratePix = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    try {
      // Get user ID from auth status
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      if (!authData.userId) {
        toast({
          title: "Erro de autenticação",
          description: "Por favor, faça login novamente",
          variant: "destructive"
        });
        setLocation('/');
        return;
      }
      const userId = authData.userId;
      
      // Get UTM parameters
      const utmParams = UtmTracker.getForOrinPay();
      
      // Call backend to generate PIX
      const response = await fetch('/api/payment/generate-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          plan: planParam,
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
      
      // Track Facebook Pixel events
      const planPrice = getPlanPrice();
      const planName = getPlanName();
      
      fbPixel.trackAddPaymentInfo({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_category: 'subscription',
        content_ids: [planParam + '_plan'],
        content_type: 'product',
        success: true
      });
      
      fbPixel.trackCustom('PixGerado', {
        value: planPrice,
        currency: 'BRL',
        plan: planParam,
        planName: planName,
        pixCode: data.pixCode,
        orderId: data.orderId
      });
      
      fbPixel.trackAddToCart({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_ids: [planParam + '_plan'],
        content_type: 'product',
        plan: planParam
      });
      
      // Save PIX data
      setPixData({
        pixCode: data.pixQrCode,
        pixQrCode: data.pixQrCode,
        amount: data.amount,
        orderId: data.orderId
      });
      
      // Start polling for payment status
      if (data.orderId) {
        pollPaymentStatus(data.orderId);
      }
      
    } catch (error) {
      console.error('Error generating PIX:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: "Por favor, tente novamente",
        variant: "destructive"
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
          const planPrice = getPlanPrice();
          const planName = getPlanName();
          
          fbPixel.trackPurchase({
            value: planPrice,
            currency: 'BRL',
            content_name: planName,
            content_category: 'subscription',
            content_ids: [planParam + '_plan'],
            content_type: 'product',
            num_items: 1,
            email: email,
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' '),
            transactionId: orderId,
            plan: planParam,
            paymentMethod: 'pix'
          });
          
          // Redirect to confirmation page
          setTimeout(() => {
            setLocation('/confirm');
          }, 2000);
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
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamento",
      });
    }
  };
  
  if (!planParam) return null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Voltar</span>
            </button>
            
            <img 
              src="/logo-beta-reader.png" 
              alt="Beta Reader Brasil" 
              className="h-8 w-auto object-contain"
            />
            
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!pixData ? (
          <>
            {/* Plan Card */}
            <Card className="mb-6 overflow-hidden border-0 shadow-xl">
              <div className={`p-6 text-white bg-gradient-to-r ${
                planParam === 'premium' 
                  ? 'from-violet-600 to-purple-600' 
                  : 'from-emerald-600 to-green-600'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">{getPlanName()}</h1>
                    <p className="text-white/90 text-sm">
                      {planParam === 'premium' ? 'Até 15 livros por mês' : 'Livros ilimitados'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {isDiscounted && (
                        <span className="text-sm line-through text-white/70">
                          R$ {planParam === 'premium' ? '39,90' : '59,90'}
                        </span>
                      )}
                      <span className="text-3xl font-bold">
                        R$ {getPlanPrice().toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {isDiscounted && (
                      <span className="inline-block px-2 py-1 bg-white/20 rounded-full text-xs font-semibold mt-1">
                        {planParam === 'premium' ? '25% OFF' : '35% OFF'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  {getPlanBenefits().map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-white flex-shrink-0" />
                      <span className="text-sm text-white/95">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            
            {/* Payment Form */}
            <Card className="p-6 shadow-lg border-0">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Dados para Pagamento
              </h2>
              
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <Label htmlFor="fullName" className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="João da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full"
                    data-testid="input-fullname"
                  />
                </div>
                
                {/* Email */}
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                    data-testid="input-email"
                  />
                </div>
                
                {/* CPF */}
                <div>
                  <Label htmlFor="cpf" className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    className="w-full"
                    data-testid="input-cpf"
                  />
                </div>
                
                {/* Security Badge */}
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Seus dados estão seguros. Pagamento processado via PIX com segurança bancária.
                  </p>
                </div>
                
                {/* Generate PIX Button */}
                <Button
                  onClick={handleGeneratePix}
                  disabled={isProcessing}
                  className="w-full py-6 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                  data-testid="button-generate-pix"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-5 w-5 mr-2" />
                      Gerar PIX
                    </>
                  )}
                </Button>
              </div>
            </Card>
            
            {/* Trust Indicators */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-xs text-gray-600 font-medium">Pagamento Seguro</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-xs text-gray-600 font-medium">Ativação Imediata</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-xs text-gray-600 font-medium">Ganhos Garantidos</p>
              </div>
            </div>
          </>
        ) : (
          /* PIX Payment Screen */
          <Card className="p-6 shadow-xl border-0">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">PIX Gerado com Sucesso!</h2>
              <p className="text-gray-600">Escaneie o QR Code ou copie o código PIX</p>
            </div>
            
            {/* QR Code */}
            <div className="flex flex-col items-center mb-6">
              <div className="p-4 bg-white rounded-xl shadow-inner border-2 border-gray-200">
                <QRCodeSVG
                  value={pixData.pixQrCode}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              
              {/* Amount */}
              <div className="mt-4 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Valor a pagar:</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {pixData.amount.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
            
            {/* PIX Code */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Código PIX Copia e Cola:</p>
              <div className="relative">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 pr-12">
                  <p className="text-xs text-gray-600 font-mono break-all">
                    {pixData.pixCode}
                  </p>
                </div>
                <button
                  onClick={handleCopyPixCode}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  data-testid="button-copy-pix"
                >
                  {copied ? (
                    <CheckCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="space-y-3 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-900 text-sm">Como pagar:</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">1.</span>
                  Abra o app do seu banco ou carteira digital
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">2.</span>
                  Escolha pagar com PIX e escaneie o QR Code
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">3.</span>
                  Ou copie o código acima e cole no app
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">4.</span>
                  Confirme o pagamento
                </li>
              </ol>
            </div>
            
            {/* Waiting for payment */}
            <div className="text-center py-4 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Aguardando confirmação do pagamento...</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Após o pagamento, você será redirecionado automaticamente
              </p>
            </div>
            
            {/* Back button */}
            <Button
              onClick={() => setLocation('/dashboard')}
              variant="outline"
              className="w-full mt-4"
              data-testid="button-back-dashboard"
            >
              Voltar ao Dashboard
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}