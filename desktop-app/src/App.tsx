import { useOnboardingStore } from './store/onboarding';
import { useStartupStore } from './store/startup';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { StartupLoader } from './components/startup/StartupLoader';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';

function App() {
  const { completed, language } = useOnboardingStore();
  const startupStage = useStartupStore(state => state.stage);
  const { i18n } = useTranslation();

  useEffect(() => {
     i18n.changeLanguage(language);
     document.documentElement.lang = language;
     document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language, i18n]);

  // 1. First: boot Ollama sidecar and show splash
  if (startupStage !== 'ready') {
    return <StartupLoader />;
  }

  // 2. Then: onboarding (first launch only)
  if (!completed) {
    return <OnboardingWizard />;
  }

  // 3. Finally: main app
  return <Dashboard />;
}

export default App;


