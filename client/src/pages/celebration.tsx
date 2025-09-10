import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import CelebrationScreen from "@/components/CelebrationScreen";
import ProjectionScreen from "@/components/ProjectionScreen";
import PlanSelectionScreen from "@/components/PlanSelectionScreen";
import { userDataManager, type UserData } from "@/utils/userDataManager";

export default function CelebrationFlow() {
  const [currentStep, setCurrentStep] = useState<'celebration' | 'projection' | 'plans'>('celebration');
  const [, setLocation] = useLocation();
  const [userData, setUserData] = useState<UserData | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      // Load fresh data from database
      await userDataManager.loadUserData();
      const data = userDataManager.getUserData();
      setUserData(data);
    };
    
    loadData();
  }, []);
  
  const earnings = userData?.balance || 0;
  const booksRead = userData?.stats.totalBooksRead || 3;

  const handleCelebrationContinue = () => {
    setCurrentStep('projection');
  };

  const handleProjectionContinue = () => {
    setCurrentStep('plans');
  };

  const handlePlanSelection = async (plan: 'free' | 'premium') => {
    await userDataManager.selectPlan(plan);
    await userDataManager.loadUserData();
    
    // Redirect back to dashboard after plan selection
    setLocation('/dashboard');
  };

  const handleClose = () => {
    setLocation('/dashboard');
  };

  switch (currentStep) {
    case 'celebration':
      return (
        <CelebrationScreen
          earnings={earnings}
          onContinue={handleCelebrationContinue}
          booksRead={booksRead}
        />
      );
    
    case 'projection':
      return (
        <ProjectionScreen
          onChoosePlan={handleProjectionContinue}
        />
      );
    
    case 'plans':
      return (
        <PlanSelectionScreen
          onSelectPlan={handlePlanSelection}
          onClose={handleClose}
        />
      );
    
    default:
      return null;
  }
}