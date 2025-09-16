import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MobileNav from "@/components/MobileNav";
import InstallBanner from "@/components/InstallBanner";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import BookReading from "@/pages/book";
import Books from "@/pages/books";
import Wallet from "@/pages/wallet";
import Profile from "@/pages/profile";
import Livros from "@/pages/livros";
import CelebrationFlow from "@/pages/celebration";
import Confirm from "@/pages/confirm";
import Payment from "@/pages/payment";
import AdminPanel from "@/pages/admin";
import Planos from "@/pages/planos";
import OnboardingComplete from "@/pages/onboarding-complete";
import UpgradeFlow from "@/pages/upgrade";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";
import { fbPixel } from "@/utils/facebookPixel";
import { userDataManager, type UserData } from "@/utils/userDataManager";
import { UtmTracker } from "@/utils/utmTracker";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Loading component
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
      <p className="text-sm text-gray-600">Verificando acesso...</p>
    </div>
  </div>
);

function Router() {
  const [location, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isCheckingUpgrade, setIsCheckingUpgrade] = useState(true);
  const [upgradeStatus, setUpgradeStatus] = useState<{
    mustUpgrade: boolean;
    hasSeenPricing: boolean;
  } | null>(null);
  const { toast } = useToast();
  
  // Check if user is logged in via API
  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setIsLoggedIn(data.isLoggedIn))
      .catch(() => setIsLoggedIn(false));
  }, [location]);

  // Check upgrade status when logged in
  useEffect(() => {
    const checkUpgradeStatus = async () => {
      if (!isLoggedIn) {
        setIsCheckingUpgrade(false);
        setUpgradeStatus(null);
        return;
      }

      try {
        // Try to get cached status first for immediate response
        const cachedStatus = localStorage.getItem('upgradeStatus');
        if (cachedStatus) {
          const parsed = JSON.parse(cachedStatus);
          // Use cache if it's less than 1 minute old
          if (Date.now() - parsed.timestamp < 60000) {
            setUpgradeStatus(parsed.data);
            setIsCheckingUpgrade(false);
          }
        }

        // Always fetch fresh data from server
        const response = await fetch('/api/upgrade/status', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch upgrade status');
        }
        
        const data = await response.json();
        const status = {
          mustUpgrade: data.mustUpgrade || false,
          hasSeenPricing: data.hasSeenPricing || false
        };
        
        // Cache the status with timestamp
        localStorage.setItem('upgradeStatus', JSON.stringify({
          data: status,
          timestamp: Date.now()
        }));
        
        setUpgradeStatus(status);
      } catch (error) {
        console.error('Error checking upgrade status:', error);
        // Default to no blocking on error
        setUpgradeStatus({ mustUpgrade: false, hasSeenPricing: false });
      } finally {
        setIsCheckingUpgrade(false);
      }
    };

    checkUpgradeStatus();
  }, [isLoggedIn]);

  // Load user data when logged in
  useEffect(() => {
    const loadUserData = async () => {
      if (isLoggedIn) {
        setIsLoadingUserData(true);
        try {
          await userDataManager.loadUserData();
          const data = userDataManager.getUserData();
          setUserData(data);
        } catch (error) {
          console.error('Failed to load user data:', error);
        } finally {
          setIsLoadingUserData(false);
        }
      } else {
        setUserData(null);
        setIsLoadingUserData(false);
      }
    };
    
    loadUserData();
  }, [isLoggedIn]);

  // Global guard - enforce upgrade flow when needed
  useEffect(() => {
    // Skip if still checking status or not logged in
    if (isCheckingUpgrade || !isLoggedIn || !upgradeStatus) {
      return;
    }

    // Check if user has premium plan
    if (userData?.plan === 'premium') {
      // User has paid plan, allow normal navigation
      return;
    }

    // Allow certain routes regardless of upgrade status
    const allowedRoutes = [
      '/', // Home page
      '/upgrade',
      '/upgrade/satisfaction',
      '/upgrade/community',
      '/upgrade/pricing',
      '/upgrade/checkout',
      '/payment',
      '/confirm'
    ];

    // Check if current location is allowed
    const isAllowedRoute = allowedRoutes.some(route => 
      location === route || location.startsWith(route + '/')
    );

    if (isAllowedRoute) {
      return;
    }

    // Apply upgrade guard
    if (upgradeStatus.mustUpgrade) {
      let redirectTo = '/upgrade/satisfaction';
      let toastMessage = 'Você precisa ativar sua conta para continuar usando o app.';
      
      // PERSISTENT REDIRECT: If user has seen pricing, ALWAYS redirect to pricing
      if (upgradeStatus.hasSeenPricing) {
        redirectTo = '/upgrade/pricing';
        toastMessage = 'Complete a ativação da sua conta para continuar.';
      }
      
      // Show toast to inform user
      toast({
        title: "Ativação Necessária",
        description: toastMessage,
        variant: "default",
      });
      
      // Force redirect
      setLocation(redirectTo);
      
      // Track the block event
      fbPixel.trackCustom('UpgradeFlowBlocked', {
        from_page: location,
        redirect_to: redirectTo,
        has_seen_pricing: upgradeStatus.hasSeenPricing
      });
    }
  }, [location, isLoggedIn, isCheckingUpgrade, upgradeStatus, userData, setLocation, toast]);

  // Periodically sync upgrade status with server (every 30 seconds)
  useEffect(() => {
    if (!isLoggedIn) return;

    const syncInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/upgrade/status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const status = {
            mustUpgrade: data.mustUpgrade || false,
            hasSeenPricing: data.hasSeenPricing || false
          };
          
          // Update cache and state
          localStorage.setItem('upgradeStatus', JSON.stringify({
            data: status,
            timestamp: Date.now()
          }));
          
          setUpgradeStatus(status);
        }
      } catch (error) {
        console.error('Error syncing upgrade status:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(syncInterval);
  }, [isLoggedIn]);
  
  // Only show nav if user is logged in and on appropriate pages
  const showNav = isLoggedIn && location !== '/' && !location.startsWith('/book/') && location !== '/celebration' && location !== '/confirm' && location !== '/payment' && location !== '/admin' && location !== '/planos' && location !== '/onboarding-complete' && !location.startsWith('/upgrade/');
  const showInstallBanner = isLoggedIn && location !== '/'; // Não mostrar na tela inicial ou quando não logado
  
  // Inicializa Facebook Pixel e captura UTMs apenas uma vez
  useEffect(() => {
    fbPixel.init();
    // Captura UTMs na inicialização do app
    UtmTracker.captureUtmParams();
  }, []);

  // Scroll to top and track page views whenever location changes
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Captura UTMs em cada mudança de rota (caso venham UTMs novas)
    UtmTracker.captureUtmParams();
    
    // Limpa o flag da página anterior para permitir novo PageView se voltar
    fbPixel.clearPageView();
    
    // Track PageView com prevenção de duplicação
    fbPixel.trackPageView(location);
    
    // Track ViewContent (pode ser enviado múltiplas vezes)
    const pageNames: Record<string, string> = {
      '/': 'Home',
      '/dashboard': 'Dashboard',
      '/livros': 'Books Library',
      '/carteira': 'Wallet',
      '/perfil': 'Profile',
      '/celebration': 'Celebration',
      '/payment': 'Payment',
      '/confirm': 'Payment Confirmation',
      '/admin': 'Admin Panel'
    };
    
    const pageName = location.startsWith('/book/') 
      ? 'Book Reading' 
      : pageNames[location] || 'Other';
    
    fbPixel.trackViewContent({
      content_name: pageName,
      content_category: 'page_view',
      content_type: 'page'
    });
  }, [location]);
  
  // Show loading screen while checking upgrade status
  if (isCheckingUpgrade && isLoggedIn) {
    return <LoadingScreen />;
  }

  return (
    <>
      {showInstallBanner && <InstallBanner />}
      <Switch>
        <Route path="/" component={Home}/>
        <Route path="/dashboard" component={Dashboard}/>
        <Route path="/book/:slug" component={BookReading}/>
        <Route path="/books" component={Books}/>
        <Route path="/livros" component={Livros}/>
        <Route path="/carteira" component={Wallet}/>
        <Route path="/perfil" component={Profile}/>
        <Route path="/celebration" component={CelebrationFlow}/>
        <Route path="/payment" component={Payment}/>
        <Route path="/confirm" component={Confirm}/>
        <Route path="/admin" component={AdminPanel}/>
        <Route path="/planos" component={Planos}/>
        <Route path="/onboarding-complete" component={OnboardingComplete}/>
        {/* Upgrade flow routes */}
        <Route path="/upgrade/satisfaction" component={UpgradeFlow}/>
        <Route path="/upgrade/community" component={UpgradeFlow}/>
        <Route path="/upgrade/pricing" component={UpgradeFlow}/>
        <Route path="/upgrade/checkout" component={UpgradeFlow}/>
        <Route path="/upgrade" component={UpgradeFlow}/>
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
      {showNav && <MobileNav />}
    </>
  );
}

function App() {
  return (
    <div className="h-screen">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
