import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, DollarSign, CheckCircle, TrendingUp, Shield, Star, ArrowRight, Clock, Zap, User, Users, Trophy } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import RegistrationModal from "@/components/RegistrationModal";
import LoginModal from "@/components/LoginModal";
import { useSound } from "@/hooks/useSound";
import { userDataManager } from "@/utils/userDataManager";
import logoImage from "@/assets/logo.png";

export default function Home() {
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [, setLocation] = useLocation();
  const { playSound } = useSound();

  const handleStartNow = () => {
    playSound('click');
    setShowRegistration(true);
  };

  const handleLogin = () => {
    playSound('click');
    setShowLoginModal(true);
  };

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegistration(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegistration(false);
    setShowLoginModal(true);
  };

  const handleRegistrationComplete = (userData: any) => {
    // Save user data
    userDataManager.registerUser(userData);
    // Set flag to show welcome modal on dashboard
    localStorage.setItem('showWelcomeModal', 'true');
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/20 to-white">
      {/* Mobile Optimized Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-100/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              <img 
                src={logoImage} 
                alt="Beta Reader Brasil Logo" 
                className="h-8 w-8 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Beta Reader Brasil
                </h1>
                <p className="text-[9px] text-gray-500 font-medium">
                  PLATAFORMA OFICIAL DE LEITURA
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile First Hero Section */}
      <section className="px-4 py-8">
        {/* Trust Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
            <Shield className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-semibold text-gray-800">Plataforma Verificada</span>
            <div className="flex -space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 mb-3">
            Ganhe dinheiro
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
              lendo livros
            </span>
          </h1>
          <p className="text-base text-gray-600 px-4">
            Transforme sua paixão por leitura em renda extra
          </p>
        </div>

        {/* Quick Stats - Mobile Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8 max-w-sm mx-auto">
          <div className="text-center p-3 bg-white rounded-xl shadow-sm">
            <p className="text-xl font-bold text-gray-900">8mil+</p>
            <p className="text-[10px] text-gray-600">Leitores</p>
          </div>
          <div className="text-center p-3 bg-white rounded-xl shadow-sm">
            <p className="text-xl font-bold text-gray-900">R$ 30</p>
            <p className="text-[10px] text-gray-600">Por livro</p>
          </div>
          <div className="text-center p-3 bg-white rounded-xl shadow-sm">
            <p className="text-xl font-bold text-gray-900">1h</p>
            <p className="text-[10px] text-gray-600">Pagamento</p>
          </div>
        </div>

        {/* CTA Button - 3D Effect */}
        <div className="mb-6">
          <Button 
            onClick={handleStartNow}
            className="w-full py-7 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl shadow-2xl transition-all transform hover:scale-105 hover:-translate-y-1"
            style={{
              boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.5), 0 10px 10px -5px rgba(34, 197, 94, 0.04)',
              transform: 'perspective(500px) rotateX(5deg)',
            }}
            data-testid="button-start-now"
          >
            Começar Agora
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>

        {/* Security Note */}
        <p className="text-[11px] text-gray-500 text-center">
          <Shield className="inline h-3 w-3 mr-1" />
          Seus dados são protegidos com criptografia
        </p>
      </section>

      {/* Feature Highlight - Mobile Optimized */}
      <section className="px-4 pb-8">
        <Card className="p-5 bg-white border border-gray-200 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-semibold rounded-full">
              TRANSPARENTE
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">
            Sistema de Recompensas Transparente
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Cada livro tem valor fixo pré-determinado. Você sabe exatamente quanto vai receber antes de começar.
          </p>
          <div className="space-y-2 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Média por livro:</span>
              <span className="font-semibold text-gray-900">R$ 8 - R$ 30</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Tempo médio de leitura:</span>
              <span className="font-semibold text-gray-900">8-15 min</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Pagamento garantido:</span>
              <span className="font-semibold text-green-600">Em até 1 hora</span>
            </div>
          </div>
        </Card>
      </section>

      {/* How it Works - Mobile Enhanced */}
      <section className="px-4 py-8 bg-gray-50/50">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Como Funciona
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Processo validado e seguro
        </p>
        
        <div className="space-y-4 max-w-sm mx-auto">
          {/* Step 1 */}
          <Card className="p-4 bg-white border-l-4 border-l-green-500">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm mb-1">Escolha e Reserve</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Navegue pela biblioteca e reserve o livro desejado
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-gray-600">Valor exibido antes da leitura</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-gray-600">Diferentes categorias disponíveis</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 2 */}
          <Card className="p-4 bg-white border-l-4 border-l-green-500">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm mb-1">Leitura Atenta</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Leia com calma e atenção aos detalhes
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-gray-600">Tempo médio de 8-15 minutos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-gray-600">Sistema anti-fraude ativo</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 3 */}
          <Card className="p-4 bg-white border-l-4 border-l-green-500">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm mb-1">Validação</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Responda 3 perguntas sobre o conteúdo
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-gray-600">Questões de múltipla escolha</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-gray-600">Avalie com estrelas</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 4 */}
          <Card className="p-4 bg-white border-l-4 border-l-green-500">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm mb-1">Pagamento</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Receba automaticamente em sua carteira
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-gray-600">Saque via PIX em 1 hora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-gray-600">Sem taxas ou descontos</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Benefits Grid - Mobile Enhanced */}
      <section className="px-4 py-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Vantagens Exclusivas
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Benefícios reais para leitores
        </p>
        
        <div className="space-y-3 max-w-sm mx-auto">
          <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm mb-1">Biblioteca Completa</p>
                <p className="text-xs text-gray-600">
                  Mais de 8.500 títulos de desenvolvimento pessoal, negócios, psicologia e ficção.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm mb-1">Flexibilidade Total</p>
                <p className="text-xs text-gray-600">
                  Leia no seu tempo, sem pressão. Pause e continue quando quiser.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm mb-1">Pagamento Garantido</p>
                <p className="text-xs text-gray-600">
                  PIX automático em 1 hora. Sem burocracia, sem taxas escondidas.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm mb-1">Programa de Metas</p>
                <p className="text-xs text-gray-600">
                  Bônus especiais ao completar 3, 5 e 10 livros. Aumente seus ganhos!
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="px-4 py-8 bg-white">
        <div className="max-w-sm mx-auto">
          <Card className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 border-0">
            <div className="text-center">
              <DollarSign className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-gray-900 mb-1">R$ 900.000+</p>
              <p className="text-sm text-gray-600 mb-3">Já pagos aos leitores</p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>PIX Imediato</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>Sem taxas</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Final CTA - Mobile */}
      <section className="px-4 py-12 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center max-w-sm mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Comece Hoje Mesmo
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Cadastro gratuito • Sem mensalidade
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleStartNow}
              className="w-full py-5 text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl shadow-xl transition-all"
              data-testid="button-final-cta"
            >
              Criar Conta Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 mt-6 text-xs text-gray-600">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span>Sem cartão de crédito</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span>Começe em 2 minutos</span>
            </div>
          </div>
        </div>
      </section>


      {/* Registration Modal */}
      <RegistrationModal 
        isOpen={showRegistration}
        onComplete={handleRegistrationComplete}
        onSwitchToLogin={handleSwitchToLogin}
      />
      
      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)}
          onSwitchToRegister={handleSwitchToRegister}
        />
      )}
    </div>
  );
}