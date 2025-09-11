import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface PixCountdownProps {
  initialMinutes?: number;
  onExpire?: () => void;
}

export default function PixCountdown({ initialMinutes = 10, onExpire }: PixCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60); // Convert to seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpiring = timeLeft <= 60; // Last minute

  return (
    <div className={`flex items-center justify-center gap-3 p-4 rounded-xl ${
      isExpiring ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'
    }`}>
      <Clock className={`h-5 w-5 ${isExpiring ? 'text-red-600' : 'text-green-600'}`} />
      <div className="text-center">
        <p className="text-xs text-gray-600 font-medium">Tempo restante</p>
        <p className={`text-2xl font-bold tabular-nums ${
          isExpiring ? 'text-red-600' : 'text-green-600'
        }`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}