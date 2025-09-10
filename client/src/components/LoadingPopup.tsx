import { useState, useEffect } from "react";
import { Loader2, Server, Check } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/scrollLock";

interface LoadingPopupProps {
  onComplete: () => void;
}

export default function LoadingPopup({ onComplete }: LoadingPopupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [logoAnimated, setLogoAnimated] = useState(false);

  const steps = [
    {
      text: "Preparando sua conta",
      icon: <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />,
    },
    {
      text: "Conectando aos servidores Beta Reader Brasil",
      icon: <Server className="h-5 w-5 text-gray-600" />,
    },
    {
      text: "Tudo pronto",
      icon: <Check className="h-5 w-5 text-gray-600" />,
    },
  ];

  // Lock body scroll when popup is open
  useEffect(() => {
    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, []);

  useEffect(() => {
    // Animar logo no início
    setTimeout(() => setLogoAnimated(true), 100);

    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else if (!isComplete) {
        setIsComplete(true);
        setTimeout(onComplete, 400);
      }
    }, currentStep === steps.length - 1 ? 400 : 1200);

    return () => clearTimeout(timer);
  }, [currentStep, isComplete, onComplete, steps.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 pb-8 max-w-xs w-full mx-4 shadow-sm border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo com animação suave */}
          <div 
            className={`transition-all duration-700 ease-out transform ${
              logoAnimated 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-95'
            }`}
          >
            <img 
              src="/logo-beta-reader.png" 
              alt="Beta Reader" 
              className="h-12 w-auto"
            />
          </div>

          {/* Minimal Icon */}
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
            {steps[currentStep].icon}
          </div>

          {/* Loading Text */}
          <div className="text-center">
            <p className="text-sm font-normal text-gray-900">
              {steps[currentStep].text}
            </p>
          </div>
          
          {/* Minimal Progress Dots */}
          <div className="flex justify-center gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index <= currentStep
                    ? "w-6 bg-gray-900"
                    : "w-1 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}