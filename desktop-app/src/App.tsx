import { useOnboardingStore } from './store/onboarding';
import { useStartupStore } from './store/startup';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { StartupLoader } from './components/startup/StartupLoader';
import './App.css';

function App() {
  const completed = useOnboardingStore(state => state.completed);
  const startupStage = useStartupStore(state => state.stage);

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


