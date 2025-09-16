import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Trophy, Shield, Check, Clock, Users, Calendar, ArrowLeft, AlertCircle, Star, TrendingUp, Lock, ChevronRight, X, Copy, Heart, BookOpen, Target, Award, Zap, MessageCircle, Sparkles, Phone, Mail, CreditCard, Key, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/useSound";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { fbPixel } from "@/utils/facebookPixel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { userDataManager } from "@/utils/userDataManager";
import { UtmTracker } from "@/utils/utmTracker";
import QRCode from "react-qr-code";

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [pixCountdown, setPixCountdown] = useState(300);
  const [isPixExpired, setIsPixExpired] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // User data collection modal states
  const [showUserDataModal, setShowUserDataModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userCPF, setUserCPF] = useState("");
  const [userPixKey, setUserPixKey] = useState("");
  
  // Check if user has completed 3 activities
  useEffect(() => {
    const checkAccess = async () => {
      const userData = userDataManager.getUserData();
      
      // If no user data or less than 3 books completed, redirect to dashboard
      if (!userData || !userData.stats?.totalBooksRead || userData.stats.totalBooksRead < 3) {
        setLocation('/dashboard');
        toast({
          title: "Acesso negado",
          description: "Você precisa completar 3 atividades antes de acessar esta página.",
          variant: "destructive"
        });
      }
    };
    
    checkAccess();
  }, [setLocation, toast]);

  const generatePixMutation = useMutation({
    mutationFn: async () => {
      playSound('click');
      
      fbPixel.trackAddToCart({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Supporter Plan',
        content_type: 'product',
        content_ids: ['supporter']
      });

      fbPixel.trackInitiateCheckout({
        value: 29.90,
        currency: 'BRL',
        content_name: 'Supporter Plan',
        num_items: 1
      });

      // Get user data from form
      const userData = userDataManager.getUserData();
      
      // Get UTM parameters
      const utmParams = UtmTracker.getForOrinPay();
      
      // Remove formatting from CPF and phone
      const cleanCPF = userCPF.replace(/\D/g, '');
      const cleanPhone = userPhone.replace(/\D/g, '');
      
      const requestBody = {
        plan: 'supporter',
        amount: 29.90,
        fullName: userData?.fullName || 'Usuário Beta Reader',
        email: userEmail || userData?.email || 'usuario@betareader.com.br',
        phone: cleanPhone,
        cpf: cleanCPF,
        pixKey: userPixKey,
        ...utmParams // Include UTM parameters
      };

      const response = await fetch('/api/payment/generate-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to generate PIX');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.pixCode && data.paymentId) {
        setPixCode(data.pixCode);
        setPaymentId(data.paymentId);
        setShowPixModal(true);
        setPixCountdown(300);
        setIsPixExpired(false);
        
        fbPixel.trackAddPaymentInfo({
          value: 29.90,
          currency: 'BRL',
          content_name: 'Premium Plan'
        });
        
        startCountdown();
        startPollingPaymentStatus(data.paymentId);
      } else {
        throw new Error('Invalid response from payment API');
      }
    },
    onError: (error: any) => {
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: error.message || "Não foi possível gerar o PIX. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const startCountdown = () => {
    const interval = setInterval(() => {
      setPixCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsPixExpired(true);
          setShowPixModal(false);
          toast({
            title: "PIX expirado",
            description: "O código PIX expirou. Gere um novo código para continuar.",
            variant: "destructive",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPollingPaymentStatus = (paymentId: string) => {
    let pollCount = 0;
    const maxPolls = 60;
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      if (pollCount >= maxPolls || isPixExpired) {
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
          
          fbPixel.trackPurchase({
            value: 29.90,
            currency: 'BRL',
            content_name: 'Supporter Plan',
            content_type: 'product',
            content_ids: ['supporter']
          });
          
          await userDataManager.loadUserData();
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          toast({
            title: "Pagamento confirmado!",
            description: "Obrigado por se tornar um apoiador!",
          });
          
          playSound('reward');
          setShowPixModal(false);
          
          setTimeout(() => {
            setLocation('/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        setIsCheckingPayment(false);
      }
    }, 5000);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    playSound('click');
    toast({
      title: "Código copiado!",
      description: "Cole o código no app do seu banco",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRatingClick = (value: number) => {
    setRating(value);
    playSound('click');
    if (value >= 4) {
      setShowFeedbackForm(true);
    }
  };

  const handleContinueStandard = () => {
    playSound('click');
    toast({
      title: "Continuando no Plano Padrão",
      description: "Você pode mudar de ideia a qualquer momento!",
    });
    setTimeout(() => {
      setLocation('/dashboard');
    }, 1500);
  };

  // Format CPF as user types
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

  // Format phone as user types
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

  // Handle opening user data modal
  const handleBecomeSupporter = () => {
    playSound('click');
    setShowUserDataModal(true);
  };

  // Handle submitting user data and generating PIX
  const handleSubmitUserData = () => {
    // Validate fields
    if (!userEmail || !userPhone || !userCPF || !userPixKey) {
      toast({
        title: "Preencha todos os campos",
        description: "Todos os campos são obrigatórios para continuar",
        variant: "destructive"
      });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido",
        variant: "destructive"
      });
      return;
    }

    // Validate CPF length
    const cleanCPF = userCPF.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "O CPF deve ter 11 dígitos",
        variant: "destructive"
      });
      return;
    }

    // Validate phone length
    const cleanPhone = userPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, insira um telefone válido",
        variant: "destructive"
      });
      return;
    }

    // Close modal and generate PIX
    setShowUserDataModal(false);
    generatePixMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/20 to-white">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-green-100/50 px-5 py-4 flex items-center justify-between z-10">
        <button
          onClick={() => {
            playSound('click');
            setLocation("/dashboard");
          }}
          className="p-2.5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-gray-600 hover:text-gray-900 hover:from-gray-100 hover:to-gray-200 transition-all"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Beta Reader</span>
          <span className="text-xs px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-bold">
            BRASIL
          </span>
        </div>
      </header>
      {/* 1. Feedback Section */}
      <section className="px-6 sm:px-8 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl mb-4">
            <Star className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Você está gostando do nosso app?
          </h1>
          <p className="text-sm text-gray-600">
            Sua opinião é muito importante para nós
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleRatingClick(value)}
              className="p-2 transition-all hover:scale-110"
              data-testid={`button-rating-${value}`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  value <= rating
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Feedback Form */}
        {showFeedbackForm && (
          <div className="mt-6 bg-white rounded-xl p-4 border border-gray-200 animate-in slide-in-from-bottom-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Deixe um comentário (opcional)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Conte-nos o que você mais gostou..."
              className="w-full resize-none"
              rows={3}
              data-testid="input-feedback"
            />
            <button
              onClick={() => {
                playSound('click');
                toast({
                  title: "Obrigado pelo feedback!",
                  description: "Sua opinião nos ajuda a melhorar",
                });
              }}
              className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              data-testid="button-send-feedback"
            >
              Enviar feedback
            </button>
          </div>
        )}
      </section>
      {/* 2. Who We Are Section */}
      <section className="px-6 sm:px-8 py-8 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Quem Somos
            </h2>
            <p className="text-sm text-gray-600">
              Uma plataforma que conecta leitores e escritores
            </p>
          </div>

          <div className="space-y-4">
            <Card className="p-4 bg-white/90 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Nossa Missão</h3>
                  <p className="text-sm text-gray-600">
                    Realizamos testes de qualidade para editoras, coletando feedback de leitores reais antes do lançamento oficial dos livros.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/90 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Parcerias Especiais</h3>
                  <p className="text-sm text-gray-600">
                    Trabalhamos com autores independentes e mantemos um acervo digital curado especialmente para nossa comunidade.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/90 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Heart className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Sistema Colaborativo</h3>
                  <p className="text-sm text-gray-600">
                    Nosso app é mantido por uma comunidade de apoiadores que acreditam no poder da leitura e querem ajudar a manter o projeto vivo.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
      {/* 3. Community Section */}
      <section className="px-6 sm:px-8 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mb-4">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nossa Comunidade
          </h2>
          <p className="text-sm text-gray-600">
            Juntos, estamos transformando o mercado editorial
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900" data-testid="text-active-users">2.600+</p>
            <p className="text-xs text-gray-600">Leitores ativos</p>
          </Card>

          <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <Award className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900" data-testid="text-years-active">6+ anos</p>
            <p className="text-xs text-gray-600">De atividade</p>
          </Card>

          <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <BookOpen className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900" data-testid="text-books-tested">500+</p>
            <p className="text-xs text-gray-600">Livros testados</p>
          </Card>

          <Card className="p-4 text-center bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
            <Heart className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900" data-testid="text-supporters">1.200+</p>
            <p className="text-xs text-gray-600">Apoiadores</p>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 text-center">
          <p className="text-sm text-green-800">
            <span className="font-semibold">💚 Mensagem da comunidade:</span><br/>
            "Cada apoiador nos ajuda a manter o app gratuito para milhares de leitores que não podem pagar"
          </p>
        </div>
      </section>
      {/* 4. Plan Comparison Section */}
      <section className="px-6 sm:px-8 py-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4">
              <Zap className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Escolha seu plano
            </h2>
            <p className="text-sm text-gray-600">
              Você decide como quer usar o app
            </p>
          </div>

          {/* Standard Plan */}
          <div className="mb-4 relative rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            {/* Plan Header */}
            <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 px-5 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <BookOpen className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Plano Padrão</h3>
                    <p className="text-xs text-gray-500">Para começar sua jornada</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">Grátis</span>
                  <p className="text-xs text-gray-500">para sempre</p>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="p-5">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 block">Até 3 livros por dia</span>
                    <span className="text-xs text-gray-500">Ideal para leitores casuais</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg">
                    <Target className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 block">Saque mínimo: R$ 1.800</span>
                    <span className="text-xs text-gray-500">Acumule para retirar</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg">
                    <MessageCircle className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 block">Suporte via FAQ</span>
                    <span className="text-xs text-gray-500">Respostas às dúvidas comuns</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Supporter Plan */}
          <div className="relative">
            {/* Recommended Badge - Positioned at the top */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5" />
                <span>MAIS POPULAR</span>
              </div>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 mt-2">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 pointer-events-none"></div>
              
              {/* Plan Header */}
              <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xl">Plano Apoiador</h3>
                    <p className="text-xs text-green-100">Desbloqueie todo o potencial</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-green-100">R$</span>
                    <span className="text-3xl font-bold text-white">29,90</span>
                  </div>
                  <p className="text-xs text-green-100 font-semibold">pagamento único</p>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="relative bg-white p-5 border-2 border-green-100">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                    <BookOpen className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-800 font-semibold block">Livros ilimitados</span>
                    <span className="text-xs text-gray-600">Leia o quanto quiser, sem limites</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                    <Target className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-800 font-semibold block">Saque desde R$ 50</span>
                    <span className="text-xs text-gray-600">36x mais rápido que o plano grátis</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-800 font-semibold block">WhatsApp prioritário</span>
                    <span className="text-xs text-gray-600">Fale direto com nossa equipe</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 pt-2 border-t border-green-100">
                  <div className="mt-0.5 p-1.5 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
                    <Heart className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-800 font-semibold block">Apoie a comunidade</span>
                    <span className="text-xs text-gray-600">Mantenha o app gratuito para todos</span>
                  </div>
                </li>
              </ul>
            </div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
            <div className="flex items-start gap-2">
              <Heart className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-800 font-medium mb-1">
                  Por que se tornar um apoiador?
                </p>
                <p className="text-xs text-gray-600">
                  Além de desbloquear benefícios exclusivos, você ajuda a manter nossa plataforma acessível para estudantes, 
                  professores e amantes da leitura que não podem contribuir financeiramente. 
                  <span className="font-semibold"> Cada apoiador faz a diferença!</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* 5. Soft CTA Section */}
      <section className="px-6 sm:px-8 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              A escolha é sua
            </h2>
            <p className="text-sm text-gray-600">
              Independente da sua decisão, agradecemos por fazer parte da nossa comunidade
            </p>
          </div>

          <div className="space-y-3">
            {/* Primary CTA - Become a Supporter - 3D Realistic Button */}
            <button
              onClick={handleBecomeSupporter}
              disabled={generatePixMutation.isPending}
              className="relative w-full group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px'
              }}
              data-testid="button-become-supporter"
            >
              {/* Button Shadow Base */}
              <div className="absolute inset-0 bg-gradient-to-b from-green-700 to-green-900 rounded-2xl translate-y-2 blur-sm opacity-50"></div>
              
              {/* Main Button */}
              <div 
                className="relative py-5 px-6 rounded-2xl transform transition-all duration-200 group-hover:translate-y-0.5 group-active:translate-y-1"
                style={{
                  background: 'linear-gradient(180deg, #22c55e 0%, #10b981 50%, #059669 100%)',
                  boxShadow: `
                    0 8px 0 #047857,
                    0 8px 20px rgba(34, 197, 94, 0.4),
                    inset 0 2px 0 rgba(255, 255, 255, 0.3),
                    inset 0 -2px 0 rgba(0, 0, 0, 0.2)
                  `
                }}
              >
                {/* Glass effect overlay */}
                <div className="absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>
                
                {/* Button Content */}
                <div className="relative flex items-center justify-center gap-3">
                  {generatePixMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span className="text-white font-bold text-lg drop-shadow-md">Gerando PIX...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="h-6 w-6 text-white drop-shadow-md group-hover:animate-pulse" />
                      <span className="text-white font-bold text-lg drop-shadow-md">Quero ser Apoiador</span>
                      <ChevronRight className="h-5 w-5 text-white drop-shadow-md group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
                
                {/* Shine effect */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%)',
                    animation: 'shine 0.8s ease-in-out'
                  }}
                ></div>
              </div>
            </button>

            {/* Secondary CTA - Continue Standard */}
            <button
              onClick={handleContinueStandard}
              className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 mt-[25px] mb-[25px]"
              data-testid="button-continue-standard"
            >
              Continuar no Plano Padrão
            </button>
          </div>

          {/* Reassurance Message */}
          <p className="text-xs text-center text-gray-500 mt-4">
            Você pode mudar de plano a qualquer momento
          </p>
        </div>
      </section>
      {/* User Data Collection Modal */}
      <Dialog open={showUserDataModal} onOpenChange={setShowUserDataModal}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-w-[95vw] sm:w-auto mx-auto p-0 overflow-hidden max-h-[95vh] flex flex-col rounded-3xl border-0 shadow-2xl">
          {/* Animated Header */}
          <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 px-6 py-8 text-white overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-white rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Quase lá!</h2>
                  <p className="text-sm text-green-50 mt-0.5">
                    Preencha seus dados para continuar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 inline-flex">
                <CheckCircle className="h-4 w-4 text-green-100" />
                <span className="text-xs text-green-50 font-medium">Processo 100% seguro e criptografado</span>
              </div>
            </div>
          </div>

          {/* Form with Better Spacing */}
          <div className="p-8 bg-gradient-to-b from-gray-50 to-white space-y-6">
            {/* Email Field */}
            <div className="space-y-3">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <div className="p-1.5 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                  <Mail className="h-4 w-4 text-indigo-600" />
                </div>
                Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full h-14 px-4 text-base border-2 border-gray-200 hover:border-gray-300 focus:border-green-500 rounded-xl transition-all duration-200"
                  data-testid="input-user-email"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="space-y-3">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                  <Phone className="h-4 w-4 text-emerald-600" />
                </div>
                Telefone
              </Label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={userPhone}
                  onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                  maxLength={15}
                  className="w-full h-14 px-4 text-base border-2 border-gray-200 hover:border-gray-300 focus:border-green-500 rounded-xl transition-all duration-200"
                  data-testid="input-user-phone"
                />
              </div>
            </div>

            {/* CPF Field */}
            <div className="space-y-3">
              <Label htmlFor="cpf" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <div className="p-1.5 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                </div>
                CPF
              </Label>
              <div className="relative">
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={userCPF}
                  onChange={(e) => setUserCPF(formatCPF(e.target.value))}
                  maxLength={14}
                  className="w-full h-14 px-4 text-base border-2 border-gray-200 hover:border-gray-300 focus:border-green-500 rounded-xl transition-all duration-200"
                  data-testid="input-user-cpf"
                />
              </div>
            </div>

            {/* PIX Key Field */}
            <div className="space-y-3">
              <Label htmlFor="pixKey" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <div className="p-1.5 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
                  <Key className="h-4 w-4 text-orange-600" />
                </div>
                Chave PIX para Receber Saques
              </Label>
              <div className="relative">
                <Input
                  id="pixKey"
                  type="text"
                  placeholder="Sua chave PIX (CPF, email, telefone ou aleatória)"
                  value={userPixKey}
                  onChange={(e) => setUserPixKey(e.target.value)}
                  className="w-full h-14 px-4 text-base border-2 border-gray-200 hover:border-gray-300 focus:border-green-500 rounded-xl transition-all duration-200"
                  data-testid="input-user-pix-key"
                />
                <p className="text-xs text-gray-500 mt-2 ml-1">
                  Esta chave será usada para você receber seus saques futuros
                </p>
              </div>
            </div>

            {/* Submit Button with Animation */}
            <div className="pt-4">
              <Button
                onClick={handleSubmitUserData}
                className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                size="lg"
                data-testid="button-submit-user-data"
              >
                <div className="flex items-center justify-center gap-3">
                  <Shield className="h-5 w-5" />
                  <span>Gerar PIX Seguro</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Button>
            </div>

            {/* Beautiful Security Note */}
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
              <div className="relative bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex-shrink-0">
                    <Lock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-800 font-semibold mb-1">
                      Proteção Total dos Seus Dados
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Utilizamos criptografia bancária de 256 bits e seguimos todas as normas da LGPD para garantir a segurança das suas informações
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* PIX Payment Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] sm:w-auto mx-auto p-0 overflow-hidden max-h-[95vh] flex flex-col rounded-2xl" showCloseButton={false}>
          {/* Header with Timer */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Pagamento Seguro via PIX</h2>
                  <p className="text-xs text-green-100">Transação protegida e verificada</p>
                </div>
              </div>
              <button
                onClick={() => setShowPixModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                data-testid="button-close-pix"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            
            {/* Timer Bar */}
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-2">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-white" />
                <span className="text-white text-sm font-medium">
                  Tempo restante: <span className="font-bold text-lg">{formatTime(pixCountdown)}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            
            {/* Amount Display */}
            <div className="text-center mb-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Valor a pagar</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">R$ 29,90</p>
              <div className="inline-flex items-center gap-1 mt-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                <AlertCircle className="h-3 w-3" />
                Valor reembolsado em 1h
              </div>
            </div>
            
            {/* QR Code */}
            {pixCode && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-4 border-2 border-gray-200">
                <p className="text-xs text-gray-600 text-center mb-3 font-semibold">Escaneie o QR Code</p>
                <div className="bg-white p-4 rounded-lg mx-auto max-w-[200px]">
                  <QRCode
                    value={pixCode}
                    size={172}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 172 172`}
                    level="M"
                    data-testid="img-qrcode"
                  />
                </div>
              </div>
            )}
            
            {/* PIX Code */}
            <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 border-2 border-green-200">
              <p className="text-xs text-gray-600 mb-2 sm:mb-3 text-center font-semibold">Ou use o código PIX copia e cola:</p>
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                <textarea
                  value={pixCode}
                  readOnly
                  className="w-full bg-transparent text-[10px] sm:text-xs font-mono text-gray-700 resize-none border-0 outline-none"
                  rows={2}
                  data-testid="input-pix-code"
                />
              </div>
              <Button
                onClick={copyPixCode}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3"
                size="lg"
                data-testid="button-copy-pix"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copiar Código PIX
              </Button>
            </div>
            
            {/* Status - removed annoying checking payment message */}
            
            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
              <h4 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Como fazer o pagamento:
              </h4>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Abra o app do seu banco</li>
                <li>Escolha a opção PIX</li>
                <li>Escaneie o QR Code ou use "Pix Copia e Cola"</li>
                <li>Confirme o pagamento de R$ 29,90</li>
              </ol>
            </div>
            
            {/* Security Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Pagamento 100% seguro e criptografado</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}