import React, { useEffect, useState, useRef } from 'react';
import { useOnboardingStore } from '../../../store/onboarding';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import modelsConfig from '../../../config/models.json';
import { DownloadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface ProgressPayload {
    status: string;
    completed: number;
    total: number;
}

export const DownloadStep: React.FC = () => {
    const { selectedModelId, nextStep } = useOnboardingStore();
    const [modelProgress, setModelProgress] = useState(0);
    const [modelStatus, setModelStatus] = useState('Waiting to start...');
    const [modelDone, setModelDone] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);

    const [embedProgress, setEmbedProgress] = useState(0);
    const [embedStatus, setEmbedStatus] = useState('Waiting to start...');
    const [embedDone, setEmbedDone] = useState(false);
    const [embedError, setEmbedError] = useState<string | null>(null);

    const modelStarted = useRef(false);

    useEffect(() => {
        if (!selectedModelId || modelStarted.current) return;
        modelStarted.current = true;

        const embeddingModelId = modelsConfig.embeddingModel.pullCommand;
        let unlistenModel: UnlistenFn | undefined;
        let unlistenEmbed: UnlistenFn | undefined;

        const startDownloads = async () => {
            try {
                // Setup listeners first
                unlistenModel = await listen<ProgressPayload>(`download-progress-${selectedModelId}`, (event) => {
                    if (event.payload.total > 0) {
                        const pct = Math.round((event.payload.completed / event.payload.total) * 100);
                        setModelProgress(Math.min(100, pct));
                    }
                    setModelStatus(event.payload.status);
                    if (event.payload.status.includes('success')) {
                        setModelDone(true);
                        setModelProgress(100);
                    }
                });

                unlistenEmbed = await listen<ProgressPayload>(`download-progress-${embeddingModelId}`, (event) => {
                    if (event.payload.total > 0) {
                        const pct = Math.round((event.payload.completed / event.payload.total) * 100);
                        setEmbedProgress(Math.min(100, pct));
                    }
                    setEmbedStatus(event.payload.status);
                    if (event.payload.status.includes('success')) {
                        setEmbedDone(true);
                        setEmbedProgress(100);
                    }
                });

                // Trigger the backend to start pulling
                // We do these sequentially for UI simplicity and less network congestion
                setModelStatus('Initializing download...');
                await invoke('download_model', { modelName: selectedModelId });
                setModelDone(true);
                setModelProgress(100);
                setModelStatus('Download complete');

                setEmbedStatus('Initializing download...');
                await invoke('download_model', { modelName: embeddingModelId });
                setEmbedDone(true);
                setEmbedProgress(100);
                setEmbedStatus('Download complete');

            } catch (err: any) {
                console.error("Download failed:", err);
                setModelError(err.toString());
                setEmbedError(err.toString());
            }
        };

        startDownloads();

        return () => {
            if (unlistenModel) unlistenModel();
            if (unlistenEmbed) unlistenEmbed();
        };
    }, [selectedModelId]);

    const allDone = modelDone && embedDone;
    const modelToDownload = modelsConfig.models.find(m => m.id === selectedModelId);

    return (
        <div className="flex flex-col w-full h-full animate-in slide-in-from-end-8 fade-in duration-300">
            <div className="mb-12">
                <h2 className="text-3xl font-semibold mb-3">Downloading AI Models</h2>
                <p className="text-text-secondary">
                    This is a one-time download. Once complete, everything runs entirely on your device.
                </p>
            </div>

            <div className="space-y-6 flex-1">

                {/* Main Model Progress */}
                <div className="bg-surface p-6 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={clsx("p-2 rounded-full", modelDone ? "bg-emerald-500/10 text-emerald-500" : "bg-accent/10 text-accent")}>
                                {modelDone ? <CheckCircle2 size={24} /> : <DownloadCloud size={24} />}
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{modelToDownload?.name || 'Language Model'}</h3>
                                <p className="text-sm text-text-secondary">{modelToDownload?.sizeGB} GB • Primary reasoning engine</p>
                            </div>
                        </div>
                        <div className="text-end">
                            <span className="font-mono text-lg font-medium">{modelProgress}%</span>
                        </div>
                    </div>

                    <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden mb-2">
                        <div
                            className={clsx("h-full transition-all duration-300 rounded-full", modelDone ? "bg-emerald-500" : "bg-accent")}
                            style={{ width: `${modelProgress}%` }}
                        />
                    </div>
                    <div className="text-sm text-text-muted font-mono truncate">
                        {modelError ? <span className="text-red-500 flex items-center gap-1"><AlertCircle size={14} /> {modelError}</span> : modelStatus}
                    </div>
                </div>

                {/* Embedding Model Progress */}
                <div className={clsx("bg-surface p-6 rounded-lg border transition-all duration-300", modelDone ? "border-border opacity-100" : "border-transparent opacity-50")}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={clsx("p-2 rounded-full", embedDone ? "bg-emerald-500/10 text-emerald-500" : "bg-text-secondary/10 text-text-secondary")}>
                                {embedDone ? <CheckCircle2 size={24} /> : <DownloadCloud size={24} />}
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Embeddings Engine</h3>
                                <p className="text-sm text-text-secondary">274 MB • Required for document search</p>
                            </div>
                        </div>
                        <div className="text-end">
                            <span className="font-mono text-lg font-medium">{embedProgress}%</span>
                        </div>
                    </div>

                    <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden mb-2">
                        <div
                            className={clsx("h-full transition-all duration-300 rounded-full", embedDone ? "bg-emerald-500" : "bg-text-secondary")}
                            style={{ width: `${embedProgress}%` }}
                        />
                    </div>
                    <div className="text-sm text-text-muted font-mono truncate">
                        {embedError ? <span className="text-red-500 flex items-center gap-1"><AlertCircle size={14} /> {embedError}</span> : embedStatus}
                    </div>
                </div>

            </div>

            <div className="flex justify-end items-center mt-8 border-t border-border pt-6">
                <button
                    onClick={nextStep}
                    disabled={!allDone}
                    className="px-8 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {allDone ? 'Continue' : 'Downloading...'}
                </button>
            </div>
        </div>
    );
};
