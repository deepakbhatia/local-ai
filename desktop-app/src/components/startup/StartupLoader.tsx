import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStartupStore } from '../../store/startup';
import { useOnboardingStore } from '../../store/onboarding';

/**
 * Launches the bundled Ollama sidecar, waits for it to be ready,
 * then sets stage = 'ready' so App.tsx renders the main content.
 * Shows a branded loading screen while this happens (~2–5 seconds).
 */
export const StartupLoader: React.FC = () => {
    const { stage, error, setStage, setError } = useStartupStore();
    const { selectedModelId } = useOnboardingStore();
    const attempted = useRef(false);

    useEffect(() => {
        if (attempted.current) return;
        attempted.current = true;

        const boot = async () => {
            try {
                setStage('starting-ollama');
                await invoke('start_ollama');

                setStage('waiting-ollama');

                // Poll until Ollama HTTP is up (max 30s)
                const MAX_ATTEMPTS = 30;
                for (let i = 0; i < MAX_ATTEMPTS; i++) {
                    const status = await invoke<{ is_running: boolean }>('check_ollama_status');
                    if (status.is_running) {
                        setStage('ready');
                        return;
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }

                // Timed out — still let the app launch, but warn
                console.warn('Ollama did not start in 30s — proceeding anyway');
                setStage('ready');
            } catch (e: any) {
                console.error('Startup error:', e);
                // If sidecar binary not found (dev mode without binary) — let app proceed
                if (e?.toString?.().includes('sidecar') || e?.toString?.().includes('No such file')) {
                    console.warn('Sidecar binary not found — running in dev mode without bundled Ollama');
                    setStage('ready');
                } else {
                    setError(String(e));
                }
            }
        };

        boot();
    }, []);

    const stageLabels: Record<string, string> = {
        idle: 'Initializing...',
        'starting-ollama': 'Starting AI engine...',
        'waiting-ollama': 'Warming up AI engine...',
        ready: 'Ready',
        error: 'Startup failed',
    };

    return (
        <div className="flex flex-col items-center justify-center bg-background text-text-primary h-screen w-full select-none">
            <div className="mb-12 text-center">
                <div className="text-5xl font-bold tracking-tight mb-3">
                    Local<span className="text-accent">Mind</span>
                </div>
                <div className="text-text-muted text-lg">Private AI on your machine</div>
            </div>

            {error ? (
                <div className="text-center max-w-sm">
                    <div className="text-red-400 font-medium mb-2">Failed to start AI engine</div>
                    <div className="text-text-muted text-sm font-mono bg-surface border border-border p-3 rounded">{error}</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-accent text-white rounded-sm hover:bg-accent/90 transition-colors text-sm"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    {/* Animated dots */}
                    <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
                            />
                        ))}
                    </div>
                    <div className="text-text-secondary text-sm">{stageLabels[stage]}</div>
                </div>
            )}

            {selectedModelId && (
                <div className="absolute bottom-8 text-xs text-text-muted">
                    Model: {selectedModelId}
                </div>
            )}
        </div>
    );
};
