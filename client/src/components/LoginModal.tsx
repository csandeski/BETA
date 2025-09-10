import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, X, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { userDataManager } from "@/utils/userDataManager";
import { useSound } from "@/hooks/useSound";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/scrollLock";

interface LoginModalProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ onClose, onSwitchToRegister }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { playSound } = useSound();
  const { toast } = useToast();

  // Lock body scroll when modal is open
  useEffect(() => {
    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, []);

  const handleLogin = async () => {
    // Validate inputs
    if (!email || !password) {
      playSound('click');
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      playSound('click');
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    playSound('success');

    try {
      // Make real API call to login
      const userData = await apiClient.login(email, password);
      
      // Save user data and load complete data from database
      await userDataManager.setUserData(userData);
      await userDataManager.loadUserData(); // Load complete data including completed books
      
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });
      
      setTimeout(() => {
        setLocation("/dashboard");
      }, 500);
    } catch (error: any) {
      setIsLoading(false);
      playSound('click');
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos.",
        variant: "destructive",
      });
    }
  };

  const handleCreateAccount = () => {
    playSound('click');
    onSwitchToRegister();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 pb-8 max-w-md w-full relative animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            playSound('click');
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          data-testid="button-close-login"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo-beta-reader.png" 
              alt="Beta Reader Brasil" 
              className="h-16 w-auto"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Fazer Login</h2>
          <p className="text-sm text-gray-600 mt-2">
            Entre com sua conta para continuar
          </p>
        </div>

        {/* Login Form */}
        <div className="space-y-4">
          {/* Email Field */}
          <div>
            <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                autoComplete="email"
                data-testid="input-login-email"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
              Senha
            </Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                autoComplete="current-password"
                data-testid="input-login-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                data-testid="button-toggle-password"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-green-600 hover:text-green-700 font-medium"
              onClick={() => {
                playSound('click');
                toast({
                  title: "Recuperação de senha",
                  description: "Funcionalidade em desenvolvimento.",
                });
              }}
              disabled={isLoading}
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            data-testid="button-submit-login"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Entrando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Entrar</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Não tem conta?</span>
            </div>
          </div>

          {/* Create Account Button */}
          <Button
            onClick={handleCreateAccount}
            variant="outline"
            className="w-full h-12 border-2 border-gray-200 hover:border-green-500 text-gray-700 font-semibold rounded-xl transition-all"
            data-testid="button-create-account"
            disabled={isLoading}
          >
            Criar Conta Grátis
          </Button>
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Ao fazer login, você concorda com nossos{" "}
          <button className="text-green-600 hover:underline">Termos de Uso</button> e{" "}
          <button className="text-green-600 hover:underline">Política de Privacidade</button>
        </p>
      </div>
    </div>
  );
}