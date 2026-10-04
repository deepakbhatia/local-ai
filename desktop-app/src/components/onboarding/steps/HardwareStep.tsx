import React, { useEffect, useState } from 'react';
import { useOnboardingStore, HardwareTier } from '../../../store/onboarding';
import { invoke } from '@tauri-apps/api/core';
import modelsConfig from '../../../config/models.json';
import { Cpu, ChevronRight, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HardwareInfo {
    total_ram_gb: number;
    is_apple_silicon: boolean;
    recommended_tier: HardwareTier;
}

export const HardwareStep: React.FC = () => {
    const { hardwareTier, setHardwareTier, nextStep, prevStep, vertical, setSelectedModelId } = useOnboardingStore();
    const [hwInfo, setHwInfo] = useState<HardwareInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoke<HardwareInfo>('detect_hardware')
            .then((info) => {
                setHwInfo(info);
                // Default select the recommended tier if none selected
                if (hardwareTier === null) {
                    setHardwareTier(info.recommended_tier);
                }
                setLoading(false);
            })
            .catch((e) => {
                console.error("Failed to detect hardware", e);
                setLoading(false);
            });
    }, []);

    const getRecommendedModel = (tier: HardwareTier) => {
        // Filter models by tier
        const eligible = modelsConfig.models.filter(m => m.tier <= tier);

        // Find best match for vertical (highest tier first)
        const verticalMatch = [...eligible].reverse().find(m => m.recommendedFor?.includes(vertical));
        if (verticalMatch) return verticalMatch;

        // Fallback to highest tier available
        return [...eligible].reverse()[0] || modelsConfig.models[0];
    };

    const handleContinue = () => {
        if (hardwareTier !== null) {
            const model = getRecommendedModel(hardwareTier);
            setSelectedModelId(model.id);
            nextStep();
        }
    };

    return (
        <div className="flex flex-col w-full h-full animate-in slide-in-from-end-8 fade-in duration-300">
            <div className="mb-8">
                <h2 className="text-3xl font-semibold mb-3">Hardware configuration</h2>
                <p className="text-text-secondary">
                    AI runs directly on your machine. We've detected your system specifications to recommend the best model size.
                </p>
            </div>

            <div className="bg-surface-elevated p-6 rounded-lg border border-border flex items-center gap-6 mb-8">
                <div className="p-4 bg-accent/10 text-accent rounded-full">
                    <Cpu size={32} />
                </div>
                <div>
                    <div className="text-sm text-text-muted font-medium tracking-wide uppercase mb-1">Detected System</div>
                    <div className="text-xl font-semibold">
                        {loading ? "Scanning..." : `${Math.round(hwInfo?.total_ram_gb || 0)} GB RAM • ${hwInfo?.is_apple_silicon ? 'Apple Silicon' : 'Standard Architecture'}`}
                    </div>
                </div>
            </div>

            <div className="space-y-4 flex-1">
                <div className="text-sm font-medium text-text-muted uppercase tracking-wider mb-2">Select Performance Profile</div>

                {([1, 2, 3] as HardwareTier[]).map((tier) => {
                    const model = getRecommendedModel(tier);
                    const isSelected = hardwareTier === tier;
                    const isRecommended = hwInfo?.recommended_tier === tier;
                    const isUnsupported = hwInfo && hwInfo.recommended_tier < tier && tier > 1;

                    return (
                        <button
                            key={tier}
                            onClick={() => !isUnsupported && setHardwareTier(tier)}
                            disabled={isUnsupported || undefined}
                            className={twMerge(
                                clsx(
                                    "w-full flex items-center p-4 rounded-lg border-2 text-start transition-all",
                                    isSelected
                                        ? "border-accent bg-surface-elevated"
                                        : isUnsupported
                                            ? "border-border/50 bg-background opacity-50 cursor-not-allowed"
                                            : "border-border bg-surface hover:border-text-muted"
                                )
                            )}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-semibold text-lg">
                                        {tier === 1 ? 'Standard' : tier === 2 ? 'Enhanced' : 'Professional'}
                                    </span>
                                    {isRecommended && (
                                        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Recommended
                                        </span>
                                    )}
                                </div>
                                <div className="text-text-secondary text-sm">
                                    Model: {model.name} • {model.sizeGB} GB download
                                </div>
                            </div>
                            <div className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center", isSelected ? "border-accent" : "border-text-muted")}>
                                {isSelected && <div className="w-3 h-3 bg-accent rounded-full" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-between items-center mt-8 border-t border-border pt-6">
                <button
                    onClick={prevStep}
                    className="px-6 py-2.5 text-text-muted hover:text-text-primary transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={hardwareTier === null}
                    className="flex items-center gap-2 px-8 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors disabled:opacity-50"
                >
                    Confirm <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};
