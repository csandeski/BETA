import { useState, useEffect } from 'react';
import { X, BookOpen, CheckCircle, Star, ArrowRight, TrendingUp, Trophy, DollarSign, Sparkles } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import logoImg from '@assets/LOGO-BETA_1757242425943.png';
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export default function WelcomeModal({ isOpen, onClose, userName }: WelcomeModalProps) {
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

  const handleClose = () => {
    playSound('success');
    onClose();
  };

  const firstName = userName ? userName.split(' ')[0] : '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header com gradiente sutil */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-white opacity-50" />
          <div className="relative p-6 pb-4">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              data-testid="button-close-welcome"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mb-4 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bem-vindo{firstName ? `, ${firstName}` : ''}! 🎉
              </h2>
              <p className="text-sm text-gray-600">
                Sua jornada de sucesso começa agora
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Card principal */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 mb-5 border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Ganhe dinheiro lendo</h3>
                <p className="text-xs text-gray-600">Receba até R$ 45 por livro</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-gray-900">3</p>
                <p className="text-xs text-gray-600">Atividades</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-600">R$ 135</p>
                <p className="text-xs text-gray-600">Potencial</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-gray-900">Hoje</p>
                <p className="text-xs text-gray-600">Disponível</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-700 text-center bg-white/50 rounded-lg p-2">
              💡 Você tem <span className="font-bold">3 livros disponíveis</span> agora mesmo
            </p>
          </div>

          {/* Como funciona */}
          <div className="space-y-3 mb-5">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Como funciona:</h4>
            
            <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">1. Leia o livro</p>
                <p className="text-xs text-gray-600">Escolha um livro e faça a leitura completa</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">2. Responda o quiz</p>
                <p className="text-xs text-gray-600">5 perguntas simples sobre o conteúdo</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Star className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">3. Avalie e ganhe</p>
                <p className="text-xs text-gray-600">Dê sua opinião e receba o pagamento</p>
              </div>
            </div>
          </div>

          {/* Stats da plataforma */}
          <div className="flex items-center justify-center gap-6 mb-6 py-3 border-y border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">2.673</p>
              <p className="text-xs text-gray-600">Leitores ativos</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">5 anos</p>
              <p className="text-xs text-gray-600">No Brasil</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="flex items-center gap-0.5 justify-center">
                <p className="text-lg font-bold text-gray-900">4.9</p>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </div>
              <p className="text-xs text-gray-600">Avaliação</p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleClose}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 group shadow-lg"
            data-testid="button-start-reading"
          >
            <span>Começar a Ler</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Footer text */}
          <p className="text-center text-xs text-gray-500 mt-4">
            Pagamento garantido após cada livro completado
          </p>
        </div>
      </div>
    </div>
  );
}