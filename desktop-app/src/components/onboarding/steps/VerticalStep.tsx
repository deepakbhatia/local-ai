import React from 'react';
import { useOnboardingStore, Vertical } from '../../../store/onboarding';
import { Briefcase, HeartPulse, Landmark, BookOpen, Presentation, Monitor } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const verticals: { id: Vertical; label: string; icon: React.ReactNode; colorClass: string; featured?: boolean }[] = [
    { id: 'legal', label: 'Legal', icon: <Briefcase size={24} />, colorClass: 'text-violet-500 bg-violet-500/10 border-violet-500/20', featured: true },
    { id: 'consulting', label: 'Consulting', icon: <Presentation size={24} />, colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
    { id: 'research', label: 'Research', icon: <BookOpen size={24} />, colorClass: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
    { id: 'general', label: 'General', icon: <Monitor size={24} />, colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { id: 'finance', label: 'Finance', icon: <Landmark size={24} />, colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { id: 'medical', label: 'Medical', icon: <HeartPulse size={24} />, colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
];

export const VerticalStep: React.FC = () => {
    const { vertical, setVertical, nextStep, prevStep } = useOnboardingStore();

    return (
        <div className="flex flex-col w-full h-full animate-in slide-in-from-end-8 fade-in duration-300">
            <div className="mb-12">
                <h2 className="text-3xl font-semibold mb-3">Choose your practice</h2>
                <p className="text-text-secondary">
                    Built first for solo lawyers and small firms. Your choice tunes tone and templates — documents stay on this machine.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-auto">
                {verticals.map((v) => {
                    const isSelected = v.id === vertical;
                    return (
                        <button
                            key={v.id}
                            onClick={() => setVertical(v.id)}
                            className={twMerge(
                                clsx(
                                    "relative flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all duration-200 gap-4",
                                    isSelected
                                        ? `border-accent bg-surface-elevated ring-1 ring-accent scale-[1.02]`
                                        : "border-border bg-surface hover:border-text-muted hover:bg-surface-elevated"
                                )
                            )}
                        >
                            {v.featured && (
                                <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                                    Focus
                                </span>
                            )}
                            <div className={clsx("p-4 rounded-full", v.colorClass, isSelected ? "" : "opacity-80")}>
                                {v.icon}
                            </div>
                            <span className="font-medium">{v.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-between items-center mt-12 border-t border-border pt-6">
                <button
                    onClick={prevStep}
                    className="px-6 py-2.5 text-text-muted hover:text-text-primary transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={nextStep}
                    className="px-8 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};
