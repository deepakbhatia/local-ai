import React from 'react';
import { useOnboardingStore } from '../../../store/onboarding';

export const WelcomeStep: React.FC = () => {
    const nextStep = useOnboardingStore((state) => state.nextStep);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="space-y-4 max-w-2xl">
                <h1 className="text-5xl font-semibold tracking-tight text-text-primary">
                    Your AI. Your machine. Nothing leaves.
                </h1>
                <p className="text-xl text-text-secondary font-light">
                    LocalMind brings powerful, privacy-first AI to your desktop. No cloud, no telemetry, no tracking.
                </p>
            </div>

            <button
                onClick={nextStep}
                className="px-8 py-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors text-lg"
            >
                Get Started
            </button>

            <div className="flex items-center gap-2 text-sm text-text-muted mt-12">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>
                100% Offline Generation
            </div>
        </div>
    );
};
