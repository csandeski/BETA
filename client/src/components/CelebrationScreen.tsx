import { X, Trophy, TrendingUp, Users, Check } from "lucide-react";
import { useSound } from "@/hooks/useSound";

interface CelebrationScreenProps {
  earnings: number;
  onContinue: () => void;
  booksRead: number;
}

export default function CelebrationScreen({ earnings, onContinue, booksRead }: CelebrationScreenProps) {
  const { playSound } = useSound();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-in slide-in-from-bottom duration-300 my-auto max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-10 w-10 text-white" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Parabéns! Você ganhou R$ {earnings.toFixed(2).replace('.', ',')}
          </h2>
          <p className="text-xs text-gray-600">
            completando suas atividades de leitura!
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{booksRead}</div>
              <p className="text-xs text-gray-600">Livros lidos</p>
            </div>
            <div className="text-center border-x border-gray-200">
              <div className="text-xl font-bold text-green-600">100%</div>
              <p className="text-xs text-gray-600">Meta diária</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">⭐ 4.8</div>
              <p className="text-xs text-gray-600">Avaliação</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-green-600 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-gray-700">
              <span className="font-semibold">2.347 usuários</span> sacaram seus ganhos esta semana!
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            playSound('click');
            onContinue();
          }}
          className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
          data-testid="button-see-journey"
        >
          Ver Minha Jornada
        </button>
        </div>
      </div>
    </div>
  );
}