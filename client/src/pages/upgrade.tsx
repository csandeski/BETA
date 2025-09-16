import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Heart, Star, Users, Shield, TrendingUp, ChevronRight, Check, Clock, Copy, Loader2, CheckCircle, AlertCircle, Trophy, BookOpen, Sparkles, Award, DollarSign, Zap, ArrowRight, Gift, Crown, Phone, Mail, User, CreditCard, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/useSound";
import { fbPixel } from "@/utils/facebookPixel";
import { UtmTracker } from "@/utils/utmTracker";
import { userDataManager } from "@/utils/userDataManager";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import QRCode from "react-qr-code";

// Form validation schema
const checkoutSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(14, "Telefone inválido").max(15),
  cpf: z.string().min(14, "CPF inválido").max(14)
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

// Step configurations
const STEPS = {
  satisfaction: { index: 0, path: "/upgrade/satisfaction", title: "Satisfação" },
  community: { index: 1, path: "/upgrade/community", title: "Comunidade" },
  pricing: { index: 2, path: "/upgrade/pricing", title: "Planos" },
  checkout: { index: 3, path: "/upgrade/checkout", title: "Ativação" }
};

export default function UpgradeFlow() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<keyof typeof STEPS>("satisfaction");
  const [isProcessing, setIsProcessing] = useState(false);
  const [rating, setRating] = useState(0);
  const [pixData, setPixData] = useState<any>(null);
  const [pixCountdown, setPixCountdown] = useState(600); // 10 minutes
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const { toast } = useToast();
  const { playSound } = useSound();

  // Route matches for each step
  const [matchSatisfaction] = useRoute("/upgrade/satisfaction");
  const [matchCommunity] = useRoute("/upgrade/community");
  const [matchPricing] = useRoute("/upgrade/pricing");
  const [matchCheckout] = useRoute("/upgrade/checkout");

  // Determine current step based on route
  useEffect(() => {
    if (matchSatisfaction) setCurrentStep("satisfaction");
    else if (matchCommunity) setCurrentStep("community");
    else if (matchPricing) setCurrentStep("pricing");
    else if (matchCheckout) setCurrentStep("checkout");
    else {
      // Default to satisfaction if no match
      setLocation("/upgrade/satisfaction");
    }
  }, [matchSatisfaction, matchCommunity, matchPricing, matchCheckout, setLocation]);

  // Check user access
  useEffect(() => {
    const checkAccess = async () => {
      const userData = userDataManager.getUserData();
      
      // If user has premium plan, redirect to dashboard
      if (userData?.plan && userData.plan !== 'free') {
        toast({
          title: "Você já tem um plano ativo!",
          description: "Aproveite todos os benefícios do seu plano.",
        });
        setLocation('/dashboard');
      }
    };
    
    checkAccess();
  }, [setLocation, toast]);

  // Track page views
  useEffect(() => {
    fbPixel.trackViewContent({
      content_name: `Upgrade Step - ${currentStep}`,
      content_category: 'upgrade_flow',
      content_type: 'page'
    });
    
    // Track InitiateCheckout when user reaches checkout step
    if (currentStep === 'checkout') {
      fbPixel.trackInitiateCheckout({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Plano Premium',
        content_category: 'subscription',
        num_items: 1
      });
    }
  }, [currentStep]);

  // Form setup
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      cpf: ""
    }
  });

  // PIX countdown timer
  useEffect(() => {
    if (pixData && pixCountdown > 0) {
      const timer = setInterval(() => {
        setPixCountdown((prev) => {
          if (prev <= 1) {
            setPixData(null);
            toast({
              title: "PIX expirado",
              description: "O código PIX expirou. Gere um novo código.",
              variant: "destructive",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [pixData, pixCountdown, toast]);

  // Mark pricing as seen
  const markPricingSeen = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/upgrade/reached-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark pricing as seen');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Update local user data - hasSeenPricing is tracked server-side
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    }
  });

  // Navigate to next step
  const navigateToStep = (step: keyof typeof STEPS) => {
    playSound('click');
    
    // Mark pricing as seen when reaching pricing step
    if (step === 'pricing' && currentStep === 'community') {
      markPricingSeen.mutate();
    }
    
    setLocation(STEPS[step].path);
  };

  // Generate PIX mutation
  const generatePixMutation = useMutation({
    mutationFn: async (data: CheckoutFormData) => {
      setIsGeneratingPix(true);
      const userData = userDataManager.getUserData();
      const utmParams = UtmTracker.getForOrinPay();
      
      const cleanCPF = data.cpf.replace(/\D/g, '');
      const cleanPhone = data.phone.replace(/\D/g, '');
      
      const response = await fetch('/api/payment/generate-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: 'supporter',
          amount: 29.90,
          fullName: data.fullName,
          email: data.email,
          phone: cleanPhone,
          cpf: cleanCPF,
          ...utmParams
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to generate PIX');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsGeneratingPix(false);
      setPixData(data);
      setPixCountdown(600); // Reset to 10 minutes
      
      fbPixel.trackCustom('PixGerado', {
        value: 29.90,
        currency: 'BRL',
        content_name: 'Plano Premium',
        plan: 'supporter',
        orderId: data.paymentId
      });
      
      fbPixel.trackAddPaymentInfo({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Premium Plan'
      });
      
      startPollingPaymentStatus(data.paymentId);
    },
    onError: (error: any) => {
      setIsGeneratingPix(false);
      toast({
        title: "Erro ao gerar PIX",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  });

  // Poll payment status
  const startPollingPaymentStatus = (paymentId: string) => {
    let pollCount = 0;
    const maxPolls = 120; // 10 minutes
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      if (pollCount >= maxPolls || !pixData) {
        clearInterval(pollInterval);
        setIsCheckingPayment(false);
        return;
      }

      try {
        setIsCheckingPayment(true);
        const response = await fetch(`/api/payment/check-status?paymentId=${paymentId}`, {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.status === 'paid') {
          clearInterval(pollInterval);
          setIsCheckingPayment(false);
          
          // Mark upgrade as complete
          await fetch('/api/upgrade/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentId }),
            credentials: 'include'
          });
          
          fbPixel.trackPurchase({
            value: 29.90,
            currency: 'BRL',
            content_name: 'Plano Premium',
            transactionId: paymentId
          });
          
          await userDataManager.loadUserData();
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          toast({
            title: "Conta ativada com sucesso!",
            description: "Bem-vindo ao Beta Reader Premium!",
          });
          
          playSound('reward');
          setPixData(null);
          
          setTimeout(() => {
            setLocation('/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        setIsCheckingPayment(false);
      }
    }, 5000); // Check every 5 seconds
  };

  // Handle form submit
  const onSubmit = (data: CheckoutFormData) => {
    playSound('click');
    generatePixMutation.mutate(data);
  };

  // Format phone number
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    return value;
  };

  // Format CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    return value;
  };

  // Copy PIX code
  const copyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      playSound('click');
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco",
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Format countdown timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/20 to-white">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-green-100/50 px-4 py-3 z-50">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Beta Reader</span>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                PREMIUM
              </Badge>
            </div>
            
            {/* Step indicator */}
            <div className="flex gap-1">
              {Object.values(STEPS).map((step, index) => (
                <div
                  key={step.path}
                  className={`h-1 w-8 rounded-full transition-all ${
                    index <= STEPS[currentStep].index
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Satisfaction */}
          {currentStep === "satisfaction" && (
            <motion.div
              key="satisfaction"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="inline-flex p-4 bg-gradient-to-br from-pink-100 to-red-100 rounded-2xl mb-4">
                  <Heart className="h-12 w-12 text-red-500" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Você está gostando do Beta Reader Brasil?
                </h1>
                
                <p className="text-gray-600 mb-6">
                  Sua opinião é muito importante para nós! Avalie sua experiência até agora.
                </p>
                
                {/* Star rating */}
                <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setRating(value);
                        playSound('click');
                      }}
                      className="p-2 transition-all hover:scale-110"
                      data-testid={`button-rating-${value}`}
                    >
                      <Star
                        className={`h-10 w-10 transition-colors ${
                          value <= rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                
                {rating > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 rounded-xl p-4 mb-6"
                  >
                    <p className="text-sm text-green-700">
                      {rating >= 4 
                        ? "Que ótimo! Ficamos felizes que você está gostando! 🎉"
                        : "Obrigado pelo feedback! Estamos sempre melhorando! 💪"}
                    </p>
                  </motion.div>
                )}
                
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          Você já completou <span className="font-semibold">3 atividades</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          Parabéns pelo seu progresso!
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          Agora é hora de desbloquear tudo!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Button
                  onClick={() => navigateToStep("community")}
                  className="w-full py-6 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  disabled={rating === 0}
                  data-testid="button-continue-satisfaction"
                >
                  Continuar
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                
                {rating === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Por favor, avalie sua experiência para continuar
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Community */}
          {currentStep === "community" && (
            <motion.div
              key="community"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="inline-flex p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
                  <Users className="h-12 w-12 text-blue-500" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Faça parte da nossa comunidade
                </h1>
                
                <p className="text-gray-600">
                  Junte-se a milhares de leitores em todo o Brasil
                </p>
              </div>
              
              {/* About section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-500" />
                    Sobre o Beta Reader Brasil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-4">
                    Somos uma plataforma estabelecida com <span className="font-semibold">mais de 5 anos no Brasil</span> e 
                    <span className="font-semibold"> 8 anos de experiência internacional</span>, conectando leitores apaixonados
                    com autores e editoras.
                  </p>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-xs text-amber-800">
                      <Star className="inline h-3 w-3 mr-1" />
                      Abrimos vagas limitadas apenas <span className="font-semibold">2 vezes por ano</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Statistics */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">2.673+</div>
                    <p className="text-xs text-gray-600">Leitores Ativos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">15.420+</div>
                    <p className="text-xs text-gray-600">Livros Lidos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">R$ 450/dia</div>
                    <p className="text-xs text-gray-600">Média de Ganhos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-yellow-600 mb-1">4.9/5</div>
                    <p className="text-xs text-gray-600">Avaliação</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Benefits */}
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Por que escolher o Beta Reader?
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">
                        Empresa consolidada e confiável no mercado
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">
                        Pagamentos garantidos via PIX
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">
                        Suporte dedicado 24/7
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">
                        Comunidade ativa e engajada
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button
                onClick={() => navigateToStep("pricing")}
                className="w-full py-6 text-base font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                data-testid="button-continue-community"
              >
                QUERO SER BETA READER!
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* Step 3: Pricing */}
          {currentStep === "pricing" && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <Badge className="mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                  OFERTA ESPECIAL
                </Badge>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Para continuar usando o Beta Reader sem limites...
                </h1>
                
                <p className="text-gray-600">
                  Ative sua conta premium e desbloqueie todo o potencial
                </p>
              </div>
              
              {/* Pricing card */}
              <Card className="border-2 border-green-500 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  -40% OFF
                </div>
                
                <CardHeader className="text-center pb-4">
                  <div className="inline-flex p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl mb-3 mx-auto">
                    <Crown className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Beta Reader Premium</CardTitle>
                  <CardDescription>Acesso completo e ilimitado</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Price */}
                  <div className="text-center">
                    <div className="text-gray-400 line-through text-sm">De R$ 49,90</div>
                    <div className="text-5xl font-bold text-gray-900">
                      R$ 29,90
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Pagamento único</p>
                  </div>
                  
                  {/* Benefits */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Zap className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Atividades Ilimitadas</p>
                        <p className="text-xs text-gray-600">Leia quantos livros quiser por dia</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Saques Sem Limite Mínimo</p>
                        <p className="text-xs text-gray-600">Retire seus ganhos a qualquer momento</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <Gift className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Bônus Exclusivos</p>
                        <p className="text-xs text-gray-600">Acesso a promoções e eventos especiais</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <Award className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Suporte Prioritário</p>
                        <p className="text-xs text-gray-600">Atendimento 24/7 dedicado</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Guarantee */}
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-900 mb-1">
                          Garantia de 30 dias
                        </p>
                        <p className="text-xs text-gray-700">
                          Devolução total se não ficar satisfeito
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button
                onClick={() => navigateToStep("checkout")}
                size="lg"
                className="w-full py-6 text-base font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
                data-testid="button-activate-account"
              >
                Quero Ativar Minha Conta
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <p className="text-center text-xs text-gray-500">
                <Shield className="inline h-3 w-3 mr-1" />
                Pagamento 100% seguro via PIX
              </p>
            </motion.div>
          )}

          {/* Step 4: Checkout */}
          {currentStep === "checkout" && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Timer at the top - fixed */}
              <div className="bg-red-50 rounded-lg p-3 border border-red-200 sticky top-16 z-40 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-semibold text-red-700">
                      Oferta expira em:
                    </p>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {pixData ? formatTime(pixCountdown) : "10:00"}
                  </span>
                </div>
              </div>
              
              {!pixData ? (
                <>
                  <div className="text-center mb-4">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                      Finalize sua ativação
                    </h1>
                    <p className="text-sm text-gray-600">
                      Preencha seus dados para gerar o PIX
                    </p>
                  </div>
                  
                  {/* Form */}
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Seus Dados
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="João da Silva"
                                    data-testid="input-fullname"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="email"
                                    placeholder="joao@email.com"
                                    data-testid="input-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    value={formatPhone(field.value)}
                                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                    placeholder="(11) 99999-9999"
                                    data-testid="input-phone"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cpf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPF</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    value={formatCPF(field.value)}
                                    onChange={(e) => field.onChange(formatCPF(e.target.value))}
                                    placeholder="123.456.789-10"
                                    data-testid="input-cpf"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                      
                      {/* Payment summary */}
                      <Card className="bg-gray-50">
                        <CardContent className="pt-6">
                          <h3 className="font-semibold text-gray-900 mb-3">
                            Resumo do Pagamento
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Plano Premium</span>
                              <span className="line-through text-gray-400">R$ 49,90</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Desconto Especial</span>
                              <span className="text-green-600 font-semibold">-R$ 20,00</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-900">Total</span>
                              <span className="text-2xl font-bold text-gray-900">R$ 29,90</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full py-6 text-base font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        disabled={isProcessing}
                        data-testid="button-generate-pix"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Gerando PIX...
                          </>
                        ) : (
                          <>
                            Gerar PIX de Ativação
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </>
              ) : (
                // PIX Display
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-center">PIX Gerado!</CardTitle>
                      <CardDescription className="text-center">
                        Escaneie o QR Code ou copie o código
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* QR Code */}
                      <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                        <QRCode
                          value={pixData.pixCode}
                          size={200}
                          level="H"
                        />
                      </div>
                      
                      {/* Amount */}
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Valor a pagar</p>
                        <p className="text-3xl font-bold text-gray-900">R$ 29,90</p>
                      </div>
                      
                      {/* PIX Code */}
                      <div className="space-y-2">
                        <Label>Código PIX (copia e cola)</Label>
                        <div className="relative">
                          <textarea
                            readOnly
                            value={pixData.pixCode}
                            className="w-full p-3 text-xs font-mono bg-gray-50 border rounded-lg resize-none"
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={copyPixCode}
                          className="w-full"
                          variant="outline"
                          data-testid="button-copy-pix"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Código Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar Código PIX
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Status */}
                      {isCheckingPayment && (
                        <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Aguardando pagamento...
                        </div>
                      )}
                      
                      {/* Instructions */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-900 mb-2">Como pagar:</p>
                        <ol className="text-xs text-blue-800 space-y-1">
                          <li>1. Abra o app do seu banco</li>
                          <li>2. Escolha pagar com PIX</li>
                          <li>3. Escaneie o QR Code ou cole o código</li>
                          <li>4. Confirme o pagamento</li>
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading modal for PIX generation */}
      {isGeneratingPix && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-sm w-full text-center"
          >
            <div className="flex flex-col items-center gap-4">
              {/* Animated loading icon */}
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              
              {/* Text */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">
                  GERANDO PIX
                </h3>
                <p className="text-sm text-gray-600">
                  Aguarde um momento...
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}