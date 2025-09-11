import { useState, useEffect } from "react";
import { X, Check, Shield, Lock, CreditCard, TrendingUp, Zap, Award, ChevronRight, ArrowRight, DollarSign, Clock, Users, Star, Infinity, Trophy, AlertTriangle, TrendingDown, Hand, Info, CheckCircle, QrCode, User, Mail, FileText, Copy, CheckCheck, Headphones, Book } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { QRCodeSVG } from 'qrcode.react';
import { UtmTracker } from '@/utils/utmTracker';
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock';
import { fbPixel } from '@/utils/facebookPixel';

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalEarned?: number;
  onUpgrade?: (plan: 'premium' | 'unlimited') => Promise<void>;
  isDiscounted?: boolean;
}

export function PlanUpgradeModal({ isOpen, onClose, totalEarned = 0, onUpgrade, isDiscounted = false }: PlanUpgradeModalProps) {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'unlimited'>('unlimited');
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);
  const [showPremiumInfo, setShowPremiumInfo] = useState(false);
  const [showUnlimitedInfo, setShowUnlimitedInfo] = useState(false);
  const [, setLocation] = useLocation();
  
  // Form fields for step 4
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  
  // PIX data for step 5
  const [pixData, setPixData] = useState<{
    pixCode: string;
    pixQrCode: string;
    amount: number;
    orderId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      setStep(1);
      // Animate values
      const timer = setTimeout(() => {
        setAnimatedValue(totalEarned);
      }, 100);
      return () => {
        clearTimeout(timer);
        unlockBodyScroll();
      };
    } else {
      setAnimatedValue(0);
    }
  }, [isOpen, totalEarned]);

  // Track InitiateCheckout when arriving at payment form (step 5)
  // This must be before the early return to avoid hooks order issues
  useEffect(() => {
    if (isOpen && step === 5 && selectedPlan !== 'free') {
      const planPrice = selectedPlan === 'unlimited' ? 
        (isDiscounted ? 38.94 : 59.90) : 
        (isDiscounted ? 29.93 : 39.90);
      const planName = selectedPlan === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado';
      
      fbPixel.trackInitiateCheckout({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_category: 'subscription',
        content_ids: [selectedPlan + '_plan'],
        content_type: 'product',
        num_items: 1,
        plan: selectedPlan,
        paymentMethod: 'pix'
      });
    }
  }, [isOpen, step, selectedPlan, isDiscounted]);

  // Scroll to top when step changes
  useEffect(() => {
    if (isOpen && step) {
      // Scroll the modal content container to top
      const modalContent = document.querySelector('.modal-scroll-content');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
      // Also scroll the window to top for mobile
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [step, isOpen]);

  if (!isOpen) return null;

  const getDiscountedPrice = (originalPrice: number, plan: 'premium' | 'unlimited') => {
    if (!isDiscounted) return originalPrice;
    if (plan === 'premium') return originalPrice * 0.75; // 25% OFF
    if (plan === 'unlimited') return originalPrice * 0.65; // 35% OFF
    return originalPrice;
  };

  const handleUpgrade = async () => {
    if (selectedPlan === 'free') {
      // User chose free plan - close modal
      onClose();
      return;
    }
    
    // Go to step 5 to confirm data and generate PIX
    setStep(5);
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
          const planName = selectedPlan === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado';
          
          fbPixel.trackPurchase({
            value: planPrice,
            currency: 'BRL',
            content_name: planName,
            content_category: 'subscription',
            content_ids: [selectedPlan + '_plan'],
            content_type: 'product',
            num_items: 1,
            email: email,
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' '),
            transactionId: orderId,
            plan: selectedPlan,
            paymentMethod: 'pix'
          });

          // Plan update will be handled by payment webhook
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
    setIsProcessing(true);
    try {
      // Get user ID from auth status
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      if (!authData.userId) {
        console.error('User not authenticated');
        alert('Erro ao processar pagamento. Por favor, faça login novamente.');
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
          plan: selectedPlan,
          fullName,
          email,
          cpf,
          utmParams // Include UTM parameters for OrinPay tracking
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate PIX');
      }
      
      const data = await response.json();
      
      // Track Facebook Pixel events when PIX is generated
      const planPrice = getPlanPrice();
      const planName = selectedPlan === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado';
      
      // Track AddPaymentInfo
      fbPixel.trackAddPaymentInfo({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_category: 'subscription',
        content_ids: [selectedPlan + '_plan'],
        content_type: 'product',
        success: true
      });
      
      // Track custom PixGerado event
      fbPixel.trackCustom('PixGerado', {
        value: planPrice,
        currency: 'BRL',
        plan: selectedPlan,
        planName: planName,
        pixCode: data.pixCode,
        orderId: data.orderId
      });
      
      // Also track AddToCart for consistency
      fbPixel.trackAddToCart({
        value: planPrice,
        currency: 'BRL',
        content_name: planName,
        content_ids: [selectedPlan + '_plan'],
        content_type: 'product',
        plan: selectedPlan
      });

      // Save PIX data and go to step 5
      setPixData({
        pixCode: data.pixQrCode,
        pixQrCode: data.pixQrCode,
        amount: data.amount,
        orderId: data.orderId
      });
      setStep(6);
      
      // Start polling for payment status
      if (data.orderId) {
        pollPaymentStatus(data.orderId);
      }
      
    } catch (error) {
      console.error('Error generating PIX:', error);
      alert('Erro ao gerar PIX. Por favor, tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCopyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Format CPF with mask
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
  
  const getPlanPrice = () => {
    if (selectedPlan === 'premium') {
      const original = 39.90;
      return isDiscounted ? getDiscountedPrice(original, 'premium') : original;
    }
    if (selectedPlan === 'unlimited') {
      const original = 59.90;
      return isDiscounted ? getDiscountedPrice(original, 'unlimited') : original;
    }
    return 0;
  };

  // Comparison data for animated charts
  const earningsData = [
    { day: 'Seg', free: 45, premium: 320, unlimited: 580 },
    { day: 'Ter', free: 45, premium: 340, unlimited: 620 },
    { day: 'Qua', free: 45, premium: 310, unlimited: 590 },
    { day: 'Qui', free: 45, premium: 330, unlimited: 610 },
    { day: 'Sex', free: 45, premium: 350, unlimited: 640 },
    { day: 'Sáb', free: 0, premium: 360, unlimited: 680 },
    { day: 'Dom', free: 0, premium: 340, unlimited: 650 },
  ];

  const monthlyComparison = [
    { month: 'Mês 1', free: 270, premium: 7200, unlimited: 13500 },
    { month: 'Mês 2', free: 270, premium: 7400, unlimited: 14200 },
    { month: 'Mês 3', free: 270, premium: 7600, unlimited: 15100 },
  ];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Backdrop with enhanced blur */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal container for scroll */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal with sophisticated design - increased max-width */}
        <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl">
        {/* Clean Header - white background with subtle accent */}
        <div className="bg-white border-b border-gray-100 p-5 rounded-t-3xl">
          <div className="flex items-center justify-between mb-4">
            {/* Professional Logo - using real logo image */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo-beta-reader.png" 
                alt="Beta Reader Brasil" 
                className="h-8 w-auto object-contain"
              />
              <div>
                <h1 className="text-base font-bold text-gray-900">Beta Reader Brasil</h1>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              data-testid="button-close-modal"
            >
              <X className="h-5 w-5 text-gray-600" strokeWidth={2} />
            </button>
          </div>
          
          {/* Dynamic Step Title - clean design - hide for step >= 4 */}
          {step < 4 && (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {step === 1 && "Parabéns pelos 3 livros!"}
                  {step === 2 && "Sobre a Beta Reader Brasil"}
                  {step === 3 && "Análise do seu potencial"}
                </h2>
                <p className="text-sm text-gray-600">
                  {step === 1 && "Você alcançou um marco importante"}
                  {step === 2 && "Conheça nossa história de sucesso"}
                  {step === 3 && "Veja quanto você está perdendo"}
                </p>
              </div>

              {/* Step Indicator - subtle green */}
              <div className="flex gap-1.5 mt-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      i <= step ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Scrollable Content - clean white background */}
        <div className="modal-scroll-content max-h-[60vh] overflow-y-auto p-5 pb-20 bg-white rounded-b-3xl" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Step 1: Achievement Celebration */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Achievement Card - subtle design */}
              <div className="relative bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mb-4 shadow-lg">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    3 Livros Completados!
                  </h3>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm mb-3 border border-gray-200">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {animatedValue.toFixed(2)}
                    </p>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Saldo acumulado
                  </p>
                </div>
              </div>

              {/* Trust Indicators - clean design */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Shield, label: "Segurança", desc: "Bancária" },
                  { icon: Users, label: "2.673", desc: "Leitores" },
                  { icon: Star, label: "4.9/5", desc: "Avaliação" }
                ].map((item, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                    <item.icon className="h-6 w-6 mx-auto mb-2 text-gray-700" />
                    <p className="text-sm font-bold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-base shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                data-testid="button-next-step"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Step 2: About Beta Reader Brasil */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Company Info Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
                <div className="text-center mb-4">
                  <img 
                    src="/logo-beta-reader.png" 
                    alt="Beta Reader Brasil" 
                    className="h-10 w-auto object-contain mx-auto mb-3"
                  />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Uma Empresa Séria e Consolidada
                  </h3>
                  <p className="text-sm text-gray-700">
                    A Beta Reader Brasil é uma empresa estabelecida no mercado de leitura e avaliação de livros, com mais de <span className="font-bold">5 anos de atuação no Brasil</span> e <span className="font-bold">8 anos de experiência internacional</span>.
                  </p>
                </div>
              </div>

              {/* Trust Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">5+</div>
                  <p className="text-xs font-semibold text-gray-700">Anos no Brasil</p>
                  <p className="text-xs text-gray-600">Empresa consolidada</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">8+</div>
                  <p className="text-xs font-semibold text-gray-700">Anos Internacionais</p>
                  <p className="text-xs text-gray-600">Experiência global</p>
                </div>
              </div>

              {/* Important Message */}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Star className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">
                      Oportunidade Exclusiva
                    </h4>
                    <p className="text-sm text-gray-700">
                      Como muitos sabem, <span className="font-bold">2 vezes por ano</span> abrimos algumas vagas para nossa carteira de clientes. Esta é sua oportunidade de entrar agora e fazer parte do nosso seleto grupo de leitores profissionais!
                    </p>
                  </div>
                </div>
              </div>

              {/* Company Values */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Compromisso com a Qualidade</p>
                    <p className="text-xs text-gray-600">Valorizamos cada leitor e sua contribuição</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                  <Users className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Comunidade Ativa</p>
                    <p className="text-xs text-gray-600">Milhares de leitores satisfeitos em todo o Brasil</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                  <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Crescimento Sustentável</p>
                    <p className="text-xs text-gray-600">Oportunidade real de renda extra com leitura</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                data-testid="button-want-beta-reader"
              >
                QUERO SER BETA READER!
              </button>
              
              {/* Trust badges for mobile spacing */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-center items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 bg-green-100 px-3 py-1.5 rounded-full">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Empresa Verificada</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-100 px-3 py-1.5 rounded-full">
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">100% Seguro</span>
                  </div>
                </div>
                
                {/* Additional trust text */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" />
                    Cadastro rápido e protegido
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Compelling Analysis (formerly Step 5) */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Alert Banner - subtle warning */}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      Você está perdendo R$ 455 por dia!
                    </h3>
                    <p className="text-sm text-gray-700">
                      Com o plano gratuito, você deixa de ganhar até 91% do seu potencial diário.
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Comparison Chart */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Comparação Visual de Ganhos Diários</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">Gratuito</span>
                      <span className="font-bold text-red-600">R$ 45/dia</span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-full bg-red-500 rounded-lg" style={{ width: '9%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">Beta Reader Oficial</span>
                      <span className="font-bold text-green-600">R$ 250/dia</span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-full bg-green-500 rounded-lg" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">Beta Reader Ilimitado</span>
                      <span className="font-bold text-purple-600">R$ 500/dia</span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-lg" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Plan Analysis - clean card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Plano Gratuito</h3>
                    <p className="text-sm text-gray-600">Suas limitações atuais</p>
                  </div>
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-bold">
                    ATIVO
                  </span>
                </div>

                {/* Limitations with visual indicators - clean design */}
                <div className="space-y-3">
                  {[
                    { 
                      icon: Book, 
                      title: "APENAS 3 livros/dia", 
                      desc: "Plano pago: 20+ livros",
                      color: "text-red-600"
                    },
                    { 
                      icon: DollarSign, 
                      title: "Saque mínimo: R$ 1.800", 
                      desc: "Plano pago: R$ 50",
                      color: "text-orange-600"
                    },
                    { 
                      icon: TrendingDown, 
                      title: "Taxa de saque: R$ 15,90", 
                      desc: "Plano pago: SEM TAXA",
                      color: "text-red-600"
                    },
                    { 
                      icon: Clock, 
                      title: "Espera: 22 dias", 
                      desc: "Plano pago: IMEDIATO",
                      color: "text-red-600"
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <item.icon className={`h-5 w-5 ${item.color} mt-0.5`} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comparison Table */}
                <div className="mt-4 p-3 bg-gradient-to-br from-red-50 to-amber-50 border border-red-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-red-200">
                        <th className="text-left py-2 font-bold text-gray-900">Item</th>
                        <th className="text-center py-2 font-bold text-red-600">Gratuito</th>
                        <th className="text-center py-2 font-bold text-green-600">Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-red-100">
                        <td className="py-2 text-gray-700">Livros/dia</td>
                        <td className="text-center text-red-600 font-bold">3</td>
                        <td className="text-center text-green-600 font-bold">20+</td>
                      </tr>
                      <tr className="border-b border-red-100">
                        <td className="py-2 text-gray-700">Saque mínimo</td>
                        <td className="text-center text-red-600 font-bold">R$ 1.800</td>
                        <td className="text-center text-green-600 font-bold">R$ 50</td>
                      </tr>
                      <tr className="border-b border-red-100">
                        <td className="py-2 text-gray-700">Taxa de saque</td>
                        <td className="text-center text-red-600 font-bold">R$ 15,90</td>
                        <td className="text-center text-green-600 font-bold">GRÁTIS</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-700">Tempo de espera</td>
                        <td className="text-center text-red-600 font-bold">22 dias</td>
                        <td className="text-center text-green-600 font-bold">IMEDIATO</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Earnings Comparison - clean chart */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Projeção de Ganhos (30 dias)</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={monthlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                    />
                    <Area type="monotone" dataKey="free" stroke="#94a3b8" fill="#f1f5f9" name="Grátis" />
                    <Area type="monotone" dataKey="premium" stroke="#10b981" fill="#86efac" name="Oficial" />
                    <Area type="monotone" dataKey="unlimited" stroke="#8b5cf6" fill="#e9d5ff" name="Ilimitado" />
                  </AreaChart>
                </ResponsiveContainer>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Grátis</p>
                    <p className="text-sm font-bold text-gray-900">R$ 270</p>
                    <p className="text-[10px] text-gray-500">em 1 mês</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700">Oficial</p>
                    <p className="text-sm font-bold text-gray-900">R$ 4.800</p>
                    <p className="text-[10px] text-green-600 font-bold">+1.677%</p>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700">Ilimitado</p>
                    <p className="text-sm font-bold text-gray-900">R$ 8.800</p>
                    <p className="text-[10px] text-purple-600 font-bold">+3.159%</p>
                  </div>
                </div>
              </div>

              {/* Real User Testimonial - clean design */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">MC</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 italic">
                      "Depois de alguns meses trabalhando no Beta Reader defini de fato com a minha verdadeira profissão, onde eu tenho total liberdade e conforto para trabalhar de onde e como eu quiser!"
                    </p>
                    <p className="text-xs text-gray-600 mt-2 font-semibold">
                      Maria C. - São Paulo
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                data-testid="button-see-plans"
              >
                Ver Planos
              </button>

              {/* Trust badges for better mobile spacing */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-center items-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-1">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-[10px] text-gray-600">100% Seguro</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                      <Award className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-[10px] text-gray-600">Garantia</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-1">
                      <Headphones className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-[10px] text-gray-600">Suporte 24/7</p>
                  </div>
                </div>
                
                {/* Additional info text */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    <Lock className="h-3 w-3 inline mr-1" />
                    Seus dados estão protegidos
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Premium Plans Selection */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Plans Grid */}
              <div className="space-y-4">
                {/* Official Plan - clean design */}
                <div 
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedPlan === 'premium' 
                      ? 'border-green-500 bg-green-50/30 shadow-lg' 
                      : 'border-gray-200 hover:border-green-300 hover:shadow-md bg-white'
                  }`}
                  onClick={() => setSelectedPlan('premium')}
                  data-testid="plan-premium"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Beta Reader Oficial</h3>
                      <div className="flex items-baseline gap-2">
                        {isDiscounted ? (
                          <>
                            <p className="text-lg font-bold text-gray-400 line-through">R$ 39,90</p>
                            <p className="text-2xl font-bold text-green-600">R$ {getDiscountedPrice(39.90, 'premium').toFixed(2).replace('.', ',')}</p>
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">25% OFF</span>
                          </>
                        ) : (
                          <>
                            <p className="text-base font-bold text-gray-400 line-through">R$ 59,90</p>
                            <p className="text-2xl font-bold text-gray-900">R$ 39,90</p>
                            <span className="text-sm text-gray-500">único</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPlan === 'premium' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {selectedPlan === 'premium' && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* How it works button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPremiumInfo(true);
                    }}
                    className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    data-testid="button-info-premium"
                  >
                    <Hand className="h-4 w-4 text-gray-700 animate-scale" />
                    <span className="text-xs font-semibold text-gray-700">Veja como funciona (toque)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: TrendingUp, text: "80 atividades/dia" },
                      { icon: DollarSign, text: "Sem taxas" },
                      { icon: Zap, text: "Saque imediato" },
                      { icon: Shield, text: "Sem mínimo" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-700">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm font-bold text-gray-900">
                      Ganhe até R$ 280/dia
                    </p>
                  </div>
                </div>

                {/* Unlimited Plan - Most Popular - clean design */}
                <div 
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedPlan === 'unlimited' 
                      ? 'border-purple-500 bg-purple-50/30 shadow-lg' 
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md bg-white'
                  }`}
                  onClick={() => setSelectedPlan('unlimited')}
                  data-testid="plan-unlimited"
                >
                  {/* Popular Badge - clean */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full shadow-md flex items-center gap-1">
                      <Star className="h-3 w-3" fill="white" />
                      MAIS ESCOLHIDO
                    </span>
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Beta Reader Ilimitado</h3>
                      <div className="flex items-baseline gap-2">
                        {isDiscounted ? (
                          <>
                            <p className="text-lg font-bold text-gray-400 line-through">R$ 59,90</p>
                            <p className="text-2xl font-bold text-purple-600">R$ {getDiscountedPrice(59.90, 'unlimited').toFixed(2).replace('.', ',')}</p>
                            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">35% OFF</span>
                          </>
                        ) : (
                          <>
                            <p className="text-base font-bold text-gray-400 line-through">R$ 97,90</p>
                            <p className="text-2xl font-bold text-gray-900">R$ 59,90</p>
                            <span className="text-sm text-gray-500">único</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPlan === 'unlimited' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {selectedPlan === 'unlimited' && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* How it works button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUnlimitedInfo(true);
                    }}
                    className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    data-testid="button-info-unlimited"
                  >
                    <Hand className="h-4 w-4 text-gray-700 animate-scale" />
                    <span className="text-xs font-semibold text-gray-700">Veja como funciona (toque)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Infinity, text: "Sem limites" },
                      { icon: DollarSign, text: "Zero taxas" },
                      { icon: Zap, text: "Instantâneo" },
                      { icon: Trophy, text: "Máximo lucro" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-medium text-gray-700">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-sm font-bold text-gray-900">
                      Ganhe R$ 420+ por dia
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - clean design */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-300 ${
                    selectedPlan === 'unlimited'
                      ? 'bg-purple-600 text-white shadow-md hover:shadow-lg hover:bg-purple-700 animate-scale'
                      : selectedPlan === 'premium'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-600 animate-scale'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-600'
                  }`}
                  data-testid="button-confirm-plan"
                >
                  {isProcessing 
                    ? 'Processando...' 
                    : selectedPlan === 'unlimited' 
                    ? 'Ativar Plano Ilimitado'
                    : selectedPlan === 'premium'
                    ? 'Ativar Plano Oficial'
                    : 'Ativar Agora'}
                </button>
                <button
                  onClick={() => {
                    // User chose free plan
                    onClose();
                  }}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
                  data-testid="button-continue-free"
                >
                  Continuar com Plano Gratuito
                </button>
              </div>

              {/* Security Notice - clean */}
              <div className="flex items-center justify-center gap-5 pt-3 opacity-60">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500 font-medium">Pagamento Seguro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500 font-medium">SSL Criptografado</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 5: Payment Data Entry */}
          {step === 5 && (
            <div className="space-y-5">
              {/* Plan Summary */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedPlan === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado'}
                  </h3>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    selectedPlan === 'premium' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {selectedPlan === 'premium' ? 'OFICIAL' : 'ILIMITADO'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700">
                      {selectedPlan === 'premium' ? '80 atividades por dia' : 'Atividades ilimitadas'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700">Saque imediato sem taxas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700">
                      {selectedPlan === 'premium' ? 'Ganhe até R$ 320/dia' : 'Ganhe R$ 500+/dia'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm Account Data */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-700" />
                  Confirme seus dados
                </h4>
                
                <div className="space-y-3">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Digite seu nome completo"
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      data-testid="input-full-name"
                    />
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                  
                  {/* CPF */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      CPF
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        data-testid="input-cpf"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-700" />
                  Método de Pagamento
                </h4>
                
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-500 relative">
                  <div className="absolute -top-2 right-2">
                    <span className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded-full">
                      DISPONÍVEL
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <QrCode className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Pagamento via PIX</p>
                      <p className="text-xs text-gray-600 mt-1">Aprovação instantânea</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-white rounded-lg">
                    <p className="text-xs text-gray-600">
                      ✓ Sem taxas adicionais
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      ✓ Pagamento seguro via banco
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate PIX Button - Animated */}
              <button
                onClick={handleGeneratePix}
                disabled={isProcessing || !fullName || !email || !cpf}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                  !fullName || !email || !cpf
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                }`}
                data-testid="button-generate-pix"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <QrCode className="h-5 w-5" />
                    GERAR PIX R$ {getPlanPrice().toFixed(2)}
                  </span>
                )}
              </button>

              {/* Back Button */}
              <button
                onClick={() => setStep(4)}
                className="w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-all mx-auto block"
                disabled={isProcessing}
                data-testid="button-back-payment"
              >
                Voltar para planos
              </button>

              {/* Security Notice */}
              <div className="flex items-center justify-center gap-5 pt-2 opacity-60">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500 font-medium">Pagamento 100% Seguro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500 font-medium">Dados Criptografados</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 6: PIX QR Code Display */}
          {step === 6 && pixData && (
            <div className="space-y-4">
              {/* Logo Header */}
              <div className="flex justify-center mb-2">
                <img 
                  src="/logo-beta-reader.png" 
                  alt="Beta Reader Brasil" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              
              {/* Combined QR Code and Copy Section */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="text-center">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">
                    Escaneie o QR Code com seu app de banco
                  </h4>
                  
                  {/* QR Code */}
                  <div className="inline-block p-3 bg-white border-2 border-gray-300 rounded-xl">
                    <QRCodeSVG 
                      value={pixData.pixQrCode} 
                      size={160}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  
                  {/* Payment Value - smaller and below QR */}
                  <div className="mt-3 mb-3">
                    <p className="text-xs text-gray-600">Valor a pagar</p>
                    <p className="text-xl font-bold text-gray-900">
                      R$ {pixData.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedPlan === 'premium' ? 'Beta Reader Oficial' : 'Beta Reader Ilimitado'}
                    </p>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3">
                    Abra o app do seu banco e escaneie o código
                  </p>
                </div>

                {/* Divider */}
                <div className="my-3 border-t border-gray-200"></div>
                
                {/* Copy PIX Code Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">
                    Ou copie o código PIX
                  </h4>
                  
                  <div className="relative">
                    <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-700 font-mono break-all">
                      {pixData.pixCode.substring(0, 50)}...
                    </div>
                    
                    <button
                      onClick={handleCopyPixCode}
                      className={`mt-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                        copied 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                      data-testid="button-copy-pix"
                    >
                      {copied ? (
                        <>
                          <CheckCheck className="h-4 w-4" />
                          Código Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar Código PIX
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 mb-1">
                      Importante
                    </h4>
                    <ul className="text-xs text-gray-700 space-y-0.5">
                      <li>• O PIX expira em 30 minutos</li>
                      <li>• Após o pagamento, seu plano é ativado automaticamente</li>
                      <li>• Você receberá um e-mail de confirmação</li>
                      <li>• Em caso de dúvidas, contate nosso suporte</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Order ID */}
              <div className="text-center pt-1">
                <p className="text-xs text-gray-500">
                  ID do Pedido: #{pixData.orderId.slice(-16)}
                </p>
              </div>

              {/* Security Seals */}
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-[10px] font-semibold text-gray-700">Pagamento</p>
                    <p className="text-[10px] text-gray-600">100% Seguro</p>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-[10px] font-semibold text-gray-700">Dados</p>
                    <p className="text-[10px] text-gray-600">Criptografados</p>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-[10px] font-semibold text-gray-700">Aprovação</p>
                    <p className="text-[10px] text-gray-600">Instantânea</p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
                data-testid="button-close-pix"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Premium Info Popup */}
      {showPremiumInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowPremiumInfo(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 pb-8 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowPremiumInfo(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="button-close-premium-info"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-3">
                <Info className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Como funciona o Beta Reader Oficial</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-green-200">
                  <span className="text-green-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Ativação Imediata</p>
                  <p className="text-xs text-gray-600 mt-1">Assim que o pagamento for aprovado, você já pode ler até 80 livros por dia.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-green-200">
                  <span className="text-green-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Ganhos Multiplicados</p>
                  <p className="text-xs text-gray-600 mt-1">Cada livro lido rende entre R$ 4 e R$ 8. Com 80 livros/dia, você pode ganhar até R$ 320.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-green-200">
                  <span className="text-green-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Saque Livre</p>
                  <p className="text-xs text-gray-600 mt-1">Saque a qualquer momento, sem valor mínimo e sem taxas. O dinheiro cai na hora via PIX.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Garantia de 7 dias</p>
                  <p className="text-xs text-gray-600 mt-1">Se não ficar satisfeito, devolvemos seu dinheiro sem perguntas.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPremiumInfo(false)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Unlimited Info Popup */}
      {showUnlimitedInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowUnlimitedInfo(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 pb-8 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowUnlimitedInfo(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="button-close-unlimited-info"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mb-3">
                <Info className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Como funciona o Beta Reader Ilimitado</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-200">
                  <span className="text-purple-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Sem Limites Reais</p>
                  <p className="text-xs text-gray-600 mt-1">Leia quantos livros quiser, quando quiser. Sem restrições diárias, semanais ou mensais.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-200">
                  <span className="text-purple-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Ganhos Exponenciais</p>
                  <p className="text-xs text-gray-600 mt-1">Leitores dedicados ganham R$ 500 a R$ 800 por dia. Alguns chegam a R$ 1.000+ diários.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-200">
                  <span className="text-purple-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Prioridade Total</p>
                  <p className="text-xs text-gray-600 mt-1">Acesso antecipado a novos livros, bônus exclusivos e suporte prioritário 24/7.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-200">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Bônus de Performance</p>
                  <p className="text-xs text-gray-600 mt-1">Ganhe bônus extras ao atingir metas: +R$ 100 ao completar 50 livros em um dia!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowUnlimitedInfo(false)}
              className="w-full mt-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}