import { useOnboardingStore } from './store/onboarding';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import './App.css';

function App() {
  const completed = useOnboardingStore(state => state.completed);

  if (!completed) {
    return <OnboardingWizard />;
  }

  return <Dashboard />;
}

export default App;

