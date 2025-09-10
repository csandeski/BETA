import { useState, useEffect } from "react";
import { Download, X, Smartphone, Apple, ChevronRight, Users } from "lucide-react";
import { useSound } from "@/hooks/useSound";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const { playSound } = useSound();

  const messages = [
    "Instale o app para melhor experiência",
    "O Beta Reader consta mais de 2.600 usuários"
  ];

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Verificar se já está instalado ou se já foi dispensado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');
    
    // Install banner dismissed flag will be handled by the backend
    const bannerDismissed = false;
    
    if (!isStandalone && !bannerDismissed) {
      setShowBanner(true);
    }

    // Capturar evento de instalação para Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service Worker registration failed:', err);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Rotação de mensagens a cada 3 segundos
  useEffect(() => {
    if (!showBanner) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [showBanner, messages.length]);

  const handleInstallClick = async () => {
    playSound('click');
    
    // Se tiver prompt nativo (Android/Desktop), usar
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        // Banner dismissed flag will be saved in backend
      }
      setDeferredPrompt(null);
    } else {
      // Mostrar instruções manuais
      setShowModal(true);
    }
  };

  const handleDismissBanner = () => {
    playSound('click');
    setShowBanner(false);
    // Banner dismissed flag will be saved in backend
  };

  const handleCloseModal = () => {
    playSound('click');
    setShowModal(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 flex-1"
          data-testid="button-install-banner"
        >
          {messageIndex === 0 ? (
            <Download className="h-4 w-4" />
          ) : (
            <Users className="h-4 w-4" />
          )}
          <span className="text-xs font-medium transition-all duration-500 ease-in-out">
            {messages[messageIndex]}
          </span>
        </button>
        <button
          onClick={handleDismissBanner}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          data-testid="button-dismiss-banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Modal de Instruções */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Como Instalar o App</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="button-close-modal"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {isIOS ? (
              // Instruções para iOS
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl">
                  <Apple className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <p className="text-xs text-gray-700">
                    Siga os passos abaixo para instalar no iPhone/iPad
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Abra no Safari</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Este site precisa ser aberto no navegador Safari
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Toque no botão Compartilhar</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Encontre o ícone de compartilhamento (quadrado com seta) na barra inferior
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Adicionar à Tela de Início</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Role o menu e toque em "Adicionar à Tela de Início"
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">4</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Confirme a instalação</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Toque em "Adicionar" no canto superior direito
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Instruções para Android
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl">
                  <Smartphone className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-gray-700">
                    Siga os passos abaixo para instalar no Android
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Abra no Chrome</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Este site precisa ser aberto no navegador Chrome
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Toque nos 3 pontos</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Menu no canto superior direito do navegador
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Instalar aplicativo</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">4</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Confirme a instalação</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Toque em "Instalar" na janela que aparecer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
              <p className="text-xs text-gray-700 text-center">
                📱 Após instalar, você poderá acessar o app direto da sua tela inicial!
              </p>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}