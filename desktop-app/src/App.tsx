import { useOnboardingStore } from './store/onboarding';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import './App.css';

function App() {
  const completed = useOnboardingStore(state => state.completed);

  if (!completed) {
    return <OnboardingWizard />;
  }

  return (
    <div className="flex bg-background text-text-primary min-h-screen w-full">
      <div className="flex-1 flex items-center justify-center p-8 text-center text-text-secondary">
        Dashboard View coming next...
      </div>
    </div>
  );
}

export default App;

