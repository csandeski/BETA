import { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, Check, Sparkles, AlertCircle } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { apiClient } from "@/lib/api";
import { UtmTracker } from "@/utils/utmTracker";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/scrollLock";
import { fbPixel } from "@/utils/facebookPixel";

interface RegistrationModalProps {
  isOpen: boolean;
  onComplete: (userData: any) => void;
  onSwitchToLogin?: () => void;
}

export default function RegistrationModal({ isOpen, onComplete, onSwitchToLogin }: RegistrationModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const { playSound } = useSound();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Nome completo é obrigatório";
    } else if (formData.fullName.trim().split(' ').length < 2) {
      newErrors.fullName = "Digite seu nome completo";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Telefone é obrigatório";
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = "Telefone inválido";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Senha é obrigatória";
    } else if (formData.password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirme sua senha";
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 11) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    } else if (cleaned.length >= 7) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length >= 2) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    }
    
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playSound('click');
    setApiError("");
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Register user in database
      const userData = await apiClient.register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });
      
      // Send UTM tracking data after successful registration
      if (userData?.id) {
        await UtmTracker.sendUtmDataToBackend(userData.id);
      }
      
      // Get UTM parameters for Facebook Pixel tracking
      const utmParams = UtmTracker.getStoredUtmParams();
      
      // Filter out null values from UTM parameters
      const cleanUtmParams: any = {};
      if (utmParams) {
        if (utmParams.utm_source) cleanUtmParams.utm_source = utmParams.utm_source;
        if (utmParams.utm_medium) cleanUtmParams.utm_medium = utmParams.utm_medium;
        if (utmParams.utm_campaign) cleanUtmParams.utm_campaign = utmParams.utm_campaign;
        if (utmParams.utm_term) cleanUtmParams.utm_term = utmParams.utm_term;
        if (utmParams.utm_content) cleanUtmParams.utm_content = utmParams.utm_content;
      }
      
      // Track Facebook Pixel CompleteRegistration event with all user data and UTM parameters
      fbPixel.trackCompleteRegistration({
        value: 0,
        currency: 'BRL',
        content_name: 'User Registration',
        status: 'completed',
        email: formData.email,
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' '),
        phone: formData.phone,
        plan: 'free',
        userId: userData?.id,
        ...cleanUtmParams // Include all UTM parameters
      });
      
      // Also track a custom event with complete user information
      if (window.fbq) {
        window.fbq('trackCustom', 'UserRegisteredWithDetails', {
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          userId: userData?.id,
          registrationTime: new Date().toISOString(),
          ...cleanUtmParams // Use cleaned UTM params here too
        });
      }
      
      setShowSuccess(true);
      playSound('reward');
      
      // New user flag will be handled in the backend
      
      setTimeout(() => {
        onComplete(userData);
      }, 2000);
    } catch (error: any) {
      setApiError(error.message || "Erro ao criar conta. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    if (apiError) {
      setApiError("");
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 pb-24 animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
              <Check className="h-8 w-8 text-white" />
            </div>

            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Conta Criada!
            </h2>
            
            <p className="text-xs text-gray-600 mb-4">
              Bem-vindo ao Beta Reader Brasil
            </p>

            <div className="w-full bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-700">
                <Sparkles className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs">Preparando seu dashboard...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Email suggestions
  const emailSuggestions = [
    '@gmail.com',
    '@hotmail.com',
    '@outlook.com',
    '@yahoo.com.br',
    '@yahoo.com',
    '@icloud.com'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 pb-8 max-w-md w-full relative animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo-beta-reader.png" 
              alt="Beta Reader Brasil" 
              className="h-16 w-auto"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Criar Conta
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Preencha seus dados para começar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* API Error */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-xs text-red-600">{apiError}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 h-12 border rounded-xl text-sm focus:outline-none transition-colors ${
                    errors.fullName 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-500'
                  }`}
                  placeholder="João da Silva"
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  list="email-suggestions"
                  className={`w-full pl-10 pr-3 h-12 border rounded-xl text-sm focus:outline-none transition-colors ${
                    errors.email 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-500'
                  }`}
                  placeholder="seu@email.com"
                />
                <datalist id="email-suggestions">
                  {formData.email && !formData.email.includes('@') && emailSuggestions.map(domain => (
                    <option key={domain} value={formData.email + domain} />
                  ))}
                </datalist>
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`w-full pl-10 pr-3 h-12 border rounded-xl text-sm focus:outline-none transition-colors ${
                    errors.phone 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-500'
                  }`}
                  placeholder="(11) 98765-4321"
                  maxLength={15}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 h-12 border rounded-xl text-sm focus:outline-none transition-colors ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-500'
                  }`}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 h-12 border rounded-xl text-sm focus:outline-none transition-colors ${
                    errors.confirmPassword 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-500'
                  }`}
                  placeholder="Digite a senha novamente"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700 text-center">
              Seus dados estão seguros e armazenados no banco de dados
            </p>
          </div>

          {/* Submit Button with 3D effect */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-6 py-3.5 font-semibold rounded-xl transition-all transform ${
              isLoading 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_5px_0_0_#059669] hover:shadow-[0_3px_0_0_#059669] hover:translate-y-[2px] active:shadow-[0_1px_0_0_#059669] active:translate-y-[4px]'
            }`}
            data-testid="button-register"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2 text-sm">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Criando conta...
              </span>
            ) : (
              <span className="text-sm">Criar Conta</span>
            )}
          </button>

          {/* Divider and Login Link */}
          {onSwitchToLogin && (
            <div className="mt-4">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-500">Já tem conta?</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="w-full py-3 border border-gray-300 text-gray-700 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
                data-testid="button-switch-to-login"
              >
                Fazer Login
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}