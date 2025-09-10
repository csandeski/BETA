import { useState, useEffect } from 'react';
import { X, Zap, CreditCard, Copy, CheckCheck, QrCode, User, Mail, FileText, ArrowRight, Clock, DollarSign, Trophy } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { UtmTracker } from '@/utils/utmTracker';
import { useToast } from '@/hooks/use-toast';
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock';
import { fbPixel } from '@/utils/facebookPixel';

interface AcceleratorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AcceleratorPaymentModal({ isOpen, onClose, onSuccess }: AcceleratorPaymentModalProps) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [pixData, setPixData] = useState<{
    pixCode: string;
    pixQrCode: string;
    amount: number;
    orderId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      // Reset step to 1 when modal opens
      setStep(1);
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  // Track Facebook Pixel InitiateCheckout when arriving at payment form
  useEffect(() => {
    if (isOpen && step === 1) {
      fbPixel.trackInitiateCheckout({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Acelerador de Ganhos',
        content_category: 'subscription',
        content_ids: ['accelerator_plan'],
        content_type: 'product',
        num_items: 1,
        plan: 'accelerator',
        paymentMethod: 'pix'
      });
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value.slice(0, 14);
  };

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Validate first digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(9))) return false;
    
    // Validate second digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(10))) return false;
    
    return true;
  };

  const handleGeneratePix = async () => {
    if (!fullName || !email || !cpf) {
      toast({
        title: "Preencha todos os campos",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!validateCPF(cpf)) {
      toast({
        title: "CPF Inválido",
        description: "Por favor, insira um CPF válido",
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
        throw new Error('User not authenticated');
      }
      const userId = authData.userId;

      // Get UTM parameters
      const utmParams = UtmTracker.getStoredUtmParams();

      // Make payment request
      const response = await fetch('/api/payments/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        userId,
        plan: 'accelerator',
        amount: 29.90,
        customerData: {
          name: fullName,
          email: email,
          cpf: cpf.replace(/\D/g, ''),
        },
        ...utmParams,
        }),
      });

      const data = await response.json();

      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to create PIX payment');
      }

      // Track Facebook Pixel events when PIX is generated
      // Track AddPaymentInfo
      fbPixel.trackAddPaymentInfo({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Acelerador de Ganhos',
        content_category: 'subscription',
        content_ids: ['accelerator_plan'],
        content_type: 'product',
        success: true
      });
      
      // Track custom PixGerado event
      fbPixel.trackCustom('PixGerado', {
        value: 29.90,
        currency: 'BRL',
        plan: 'accelerator',
        planName: 'Acelerador de Ganhos',
        pixCode: data.pixCode,
        orderId: data.orderId
      });
      
      // Also track AddToCart for consistency
      fbPixel.trackAddToCart({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Acelerador de Ganhos',
        content_ids: ['accelerator_plan'],
        content_type: 'product',
        plan: 'accelerator'
      });

      setPixData({
        pixCode: data.pixCode,
        pixQrCode: data.pixCode,
        amount: 29.90,
        orderId: data.orderId,
      });

      setStep(2);
      
      // Start polling for payment status
      pollPaymentStatus(data.orderId);
    } catch (error: any) {
      console.error('Error creating PIX payment:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: error.message || "Tente novamente mais tarde",
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
        toast({
          title: "Tempo Expirado",
          description: "O pagamento expirou. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await fetch(`/api/payments/status/${orderId}`);
        const data = await response.json();
        
        if (data.status === 'paid' || data.status === 'approved') {
          // Accelerator activation will be handled by payment webhook

          // Track Facebook Pixel Purchase event
          fbPixel.trackPurchase({
            value: 29.90,
            currency: 'BRL',
            content_name: 'Acelerador de Ganhos',
            content_category: 'subscription',
            content_ids: ['accelerator_plan'],
            content_type: 'product',
            num_items: 1,
            transactionId: orderId,
            plan: 'accelerator',
            paymentMethod: 'pix'
          });

          toast({
            title: "Pagamento Confirmado!",
            description: "Acelerador de Ganhos ativado com sucesso",
          });
          onSuccess();
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

  const copyToClipboard = async () => {
    if (pixData?.pixCode) {
      try {
        await navigator.clipboard.writeText(pixData.pixCode);
        setCopied(true);
        toast({
          title: "Código PIX copiado!",
          description: "Cole no seu app de banco",
        });
        setTimeout(() => setCopied(false), 3000);
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Tente copiar manualmente",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            data-testid="button-close-accelerator-payment"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === 1 ? 'Ativar Acelerador de Ganhos' : 'Pagamento PIX'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 1 ? 'Confirme seus dados para gerar o PIX' : 'Escaneie ou copie o código PIX'}
            </p>
          </div>
        </div>

        {step === 1 ? (
          // Step 1: Confirm Data
          <div className="p-6 pb-8 space-y-4">
            {/* Product Summary */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">
                  Acelerador de Ganhos
                </h3>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700">
                  14 DIAS
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCheck className="h-4 w-4 text-green-600" />
                  <span>Dobre seus ganhos por 3 horas/dia</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCheck className="h-4 w-4 text-green-600" />
                  <span>Ativação flexível quando quiser</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCheck className="h-4 w-4 text-green-600" />
                  <span>Retorno médio de R$ 348,10</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-xl font-bold text-gray-900">R$ 29,90</span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="João da Silva"
                  data-testid="input-fullname-accelerator"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="joao@email.com"
                  data-testid="input-email-accelerator"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4" />
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="123.456.789-00"
                  maxLength={14}
                  data-testid="input-cpf-accelerator"
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-600 text-center">
                🔒 Seus dados estão seguros e protegidos. Usamos criptografia de ponta a ponta.
              </p>
            </div>

            {/* Generate PIX Button */}
            <button
              onClick={handleGeneratePix}
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="button-generate-pix-accelerator"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gerando PIX...
                </span>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Gerar PIX de R$ 29,90
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        ) : (
          // Step 2: PIX Payment
          <div className="p-6 pb-8 space-y-4">
            {/* Amount Display */}
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-2">Valor a pagar</p>
              <p className="text-3xl font-bold text-gray-900">
                R$ 29,90
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Acelerador de Ganhos - 14 dias
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="text-center">
                <h4 className="text-sm font-bold text-gray-900 mb-4">
                  Escaneie o QR Code com seu app de banco
                </h4>
                <div className="bg-white p-4 rounded-xl inline-block border-2 border-gray-200">
                  {pixData?.pixQrCode && (
                    <QRCodeSVG value={pixData.pixQrCode} size={200} />
                  )}
                </div>
              </div>
            </div>

            {/* PIX Code */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 text-center">
                Ou copie o código PIX
              </h4>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pixData?.pixCode || ''}
                    readOnly
                    className="flex-1 bg-transparent text-xs text-gray-700 outline-none truncate"
                    data-testid="input-pix-code-accelerator"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    data-testid="button-copy-pix-accelerator"
                  >
                    {copied ? (
                      <CheckCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-bold text-blue-900">Como pagar:</h4>
              <ol className="space-y-1 text-xs text-blue-700">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escolha pagar com PIX</li>
                <li>3. Escaneie o QR Code ou cole o código</li>
                <li>4. Confirme o pagamento</li>
                <li>5. Aguarde a confirmação automática</li>
              </ol>
            </div>

            {/* Status */}
            <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />
                <p className="text-xs text-yellow-700 font-medium">
                  Aguardando pagamento...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}