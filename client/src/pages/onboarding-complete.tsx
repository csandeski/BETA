import { useState } from "react";
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
import QRCode from "react-qr-code";
import {
  X,
  Clock,
  Copy,
  AlertCircle,
  Check,
  CheckCircle,
  Loader2
} from "lucide-react";

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userFullName, setUserFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userCPF, setUserCPF] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [pixExpiration, setPixExpiration] = useState("");
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [isPixExpired, setIsPixExpired] = useState(false);

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

  const startPaymentCheck = () => {
    setIsCheckingPayment(true);
    const interval = setInterval(async () => {
      if (paymentOrderId) {
        checkPaymentStatus();
      }
    }, 3000); // Check every 3 seconds

    // Stop after 2 minutes
    setTimeout(() => {
      clearInterval(interval);
      setIsCheckingPayment(false);
    }, 120000);
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
    
    fbPixel.trackPurchase({
      value: 29.00,
      currency: 'BRL',
      content_name: 'Account Activation'
    });

    // Update user data
    const currentData = userDataManager.getUserData() || {};
    userDataManager.updateUserData({
      ...currentData,
      plan: 'premium',
      email: userEmail,
      phone: userPhone,
      name: userFullName
    });

    toast({
      title: "Pagamento confirmado!",
      description: "Sua conta Premium foi ativada com sucesso!",
    });

    playSound('success');
    
    // Redirect to dashboard
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setIsCheckingPayment(false);
    setPixCode("");
    setPixExpiration("");
    setIsPixExpired(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ativar Conta Premium
          </h1>
          <p className="text-gray-600">
            Desbloqueie todos os benefícios da plataforma
          </p>
        </div>

        {/* Simple Benefits */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Benefícios Premium:</h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Leitura ilimitada sem restrições</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Ganhe 36x mais rápido</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Suporte prioritário via WhatsApp</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Saque sem limite mínimo</span>
            </li>
          </ul>
        </Card>

        {/* Simple Form */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg mb-4">Dados para ativação</h3>
          
          <div>
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Seu nome completo"
              value={userFullName}
              onChange={(e) => setUserFullName(e.target.value)}
              data-testid="input-full-name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              data-testid="input-email"
            />
          </div>

          <div>
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 98765-4321"
              value={userPhone}
              onChange={(e) => setUserPhone(formatPhone(e.target.value))}
              data-testid="input-phone"
              maxLength={15}
            />
          </div>

          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              type="text"
              placeholder="123.456.789-00"
              value={userCPF}
              onChange={(e) => setUserCPF(formatCPF(e.target.value))}
              data-testid="input-cpf"
              maxLength={14}
            />
          </div>

          <div className="pt-4 space-y-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-2xl font-bold text-green-600 text-center">R$ 29,00</p>
              <p className="text-xs text-gray-600 text-center">Pagamento único</p>
            </div>

            <Button
              onClick={handleGeneratePix}
              disabled={generatePixMutation.isPending}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              data-testid="button-generate-pix"
            >
              {generatePixMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                'Gerar código PIX'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setLocation('/dashboard')}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </Card>

        {/* PIX Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-md max-h-screen overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Pagamento PIX</h3>
                  <p className="text-xs text-gray-600">Escaneie ou copie o código</p>
                </div>
                <button
                  onClick={handleClosePayment}
                  className="p-2 hover:bg-gray-100 rounded-lg"
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
                        <span className="text-sm font-semibold">Expira em:</span>
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
                        <p className="text-sm font-semibold text-red-900">Código expirado</p>
                        <p className="text-xs text-red-600">Feche e gere um novo código</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Valor</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">R$ 29,00</p>
                </div>
                
                {/* QR Code */}
                {!isPixExpired && (
                  <>
                    <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
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
                        Ou copie o código PIX:
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3 relative">
                        <p className="text-xs text-gray-600 font-mono break-all pr-10">
                          {pixCode}
                        </p>
                        <button
                          onClick={copyToClipboard}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow hover:shadow-md"
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

                    {/* Payment Status */}
                    {isCheckingPayment && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                          <div>
                            <p className="font-semibold text-sm">Aguardando pagamento...</p>
                            <p className="text-xs text-gray-600">Confirmação automática</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}