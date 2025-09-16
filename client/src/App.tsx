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
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";
import { fbPixel } from "@/utils/facebookPixel";
import { userDataManager, type UserData } from "@/utils/userDataManager";

function Router() {
  const [location, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  
  // Check if user is logged in via API
  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setIsLoggedIn(data.isLoggedIn))
      .catch(() => setIsLoggedIn(false));
  }, [location]);

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

  // No global guard - let users navigate freely, only redirect on specific actions
  
  // Only show nav if user is logged in and on appropriate pages
  const showNav = isLoggedIn && location !== '/' && !location.startsWith('/book/') && location !== '/celebration' && location !== '/confirm' && location !== '/payment' && location !== '/admin' && location !== '/planos' && location !== '/onboarding-complete';
  const showInstallBanner = isLoggedIn && location !== '/'; // Não mostrar na tela inicial ou quando não logado
  
  // Inicializa Facebook Pixel apenas uma vez
  useEffect(() => {
    fbPixel.init();
  }, []);

  // Scroll to top and track page views whenever location changes
  useEffect(() => {
    window.scrollTo(0, 0);
    
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
