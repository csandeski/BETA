import { Home, BookOpen, Wallet, User } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useSound } from "@/hooks/useSound";

export default function MobileNav() {
  const [location, setLocation] = useLocation();
  const { playSound } = useSound();

  const navItems = [
    { icon: Home, label: "Início", path: "/dashboard" },
    { icon: BookOpen, label: "Livros", path: "/livros" },
    { icon: Wallet, label: "Carteira", path: "/carteira" },
    { icon: User, label: "Perfil", path: "/perfil" }
  ];

  const handleNavigation = (path: string) => {
    playSound('click');
    setLocation(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex items-center justify-around pt-2 pb-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex-1 py-2 flex flex-col items-center gap-1 transition-colors relative ${
                isActive
                  ? 'text-green-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon
                className={`h-6 w-6 ${
                  isActive ? 'fill-green-100' : ''
                }`}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className={`text-xs ${
                isActive ? 'font-semibold' : 'font-medium'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-[9px] left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}