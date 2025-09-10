import { X, Clock, DollarSign, Target, Check, TrendingUp, ChevronRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSound } from "@/hooks/useSound";

interface ProjectionScreenProps {
  onChoosePlan: () => void;
}

export default function ProjectionScreen({ onChoosePlan }: ProjectionScreenProps) {
  const { playSound } = useSound();
  
  const projectionData = [
    { dia: 'Dia 1', gratuito: 135, pro: 300 },
    { dia: 'Dia 5', gratuito: 675, pro: 1500 },
    { dia: 'Dia 10', gratuito: 1350, pro: 3000 },
    { dia: 'Dia 15', gratuito: 1800, pro: 4500 },
    { dia: 'Dia 20', gratuito: 1800, pro: 6000 },
    { dia: 'Dia 30', gratuito: 1800, pro: 9000 },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative animate-in slide-in-from-bottom duration-300 my-auto">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Projeção de Ganhos
          </h2>
          <p className="text-xs text-gray-600">
            Compare o potencial de ganhos entre os planos
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Free Plan */}
          <div className="border-2 border-gray-200 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">Plano Gratuito</h3>
              <p className="text-xl font-bold text-gray-900 mt-1">R$ 0,00</p>
            </div>

            <ul className="space-y-3 mb-4">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">3 livros por dia</span>
              </li>
              <li className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Acumule <span className="font-semibold">R$ 1.800</span> para sacar (~20 dias)</span>
              </li>
              <li className="flex items-start gap-2">
                <Target className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Taxa <span className="font-semibold">R$ 15,90</span> por saque</span>
              </li>
            </ul>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-700 font-semibold mb-1">Ganho Máximo</p>
              <p className="text-lg font-bold text-gray-900">R$ 135/dia</p>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-green-500 rounded-xl p-6 relative bg-green-50/30">
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Recomendado
            </div>

            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">Plano Pro</h3>
              <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">R$ 29,90</p>
            </div>

            <ul className="space-y-3 mb-4">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Leia <span className="font-semibold">quantos livros quiser</span></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Saque <span className="font-semibold">a qualquer momento</span>, sem mínimo</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-600">Taxa <span className="font-semibold">R$ 0,00</span> por saque</span>
              </li>
            </ul>

            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3">
              <p className="text-xs text-gray-700 font-semibold mb-1">Ganho Ilimitado</p>
              <p className="text-lg font-bold text-gray-900">R$ 300+/dia</p>
              <p className="text-xs text-green-600 font-medium mt-1">10 livros = R$ 300</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Comparativo de Ganhos em 30 Dias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGratuito" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B7280" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6B7280" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="dia" 
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '11px'
                }}
                formatter={(value: any) => [`R$ ${value}`, '']}
              />
              <Area 
                type="monotone" 
                dataKey="gratuito" 
                stroke="#6B7280" 
                strokeWidth={2}
                fill="url(#colorGratuito)"
                name="Gratuito"
              />
              <Area 
                type="monotone" 
                dataKey="pro" 
                stroke="#10B981" 
                strokeWidth={2}
                fill="url(#colorPro)"
                name="Pro"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-xs text-gray-600">Gratuito: Para no dia 15</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600 font-semibold">Pro: Cresce sempre</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            playSound('click');
            onChoosePlan();
          }}
          className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
          data-testid="button-choose-plan"
        >
          Escolher Meu Plano
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
        </div>
      </div>
    </div>
  );
}