import React from 'react';
import { useOnboardingStore } from '../../store/onboarding';

// Placeholder steps
import { WelcomeStep } from './steps/WelcomeStep';
import { VerticalStep } from './steps/VerticalStep';
import { HardwareStep } from './steps/HardwareStep';
import { DownloadStep } from './steps/DownloadStep';
import { ProfileStep } from './steps/ProfileStep';

export const OnboardingWizard: React.FC = () => {
    const step = useOnboardingStore((state) => state.step);

    return (
        <div className="flex bg-background text-text-primary min-h-screen w-full font-sans items-center justify-center p-8">
            {/* Container */}
            <div className="w-full max-w-4xl min-h-[500px] flex flex-col pt-8 relative">

                {/* Step Indicator */}
                <div className="absolute top-0 left-0 right-0 flex justify-between px-8 text-sm text-text-muted">
                    <span>Step {step} of 5</span>
                    <span className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <div
                                key={s}
                                className={`h-2 w-8 rounded-full ${s <= step ? 'bg-accent' : 'bg-surface-elevated'}`}
                            />
                        ))}
                    </span>
                </div>

                {/* Dynamic Step Content */}
                <div className="flex-1 flex w-full">
                    {step === 1 && <WelcomeStep />}
                    {step === 2 && <VerticalStep />}
                    {step === 3 && <HardwareStep />}
                    {step === 4 && <DownloadStep />}
                    {step === 5 && <ProfileStep />}
                </div>

            </div>
        </div>
    );
};
