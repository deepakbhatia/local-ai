import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
    User,
    Cpu,
    Shield,
    Settings as SettingsIcon,
    Trash2,
    Download,
    Upload,
    ExternalLink,
    Briefcase,
    Languages,
    Activity,
    Paintbrush,
    MessageSquare,
    Info
} from 'lucide-react';
import { useOnboardingStore, Vertical } from '../../store/onboarding';
import { useTranslation } from 'react-i18next';

import modelsConfig from '../../config/models.json';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

type SettingsTab = 'profile' | 'model' | 'vertical' | 'privacy' | 'data' | 'advanced' | 'feedback' | 'about';

const AdvancedSettings: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await invoke<string[]>('get_network_activity_log');
            setLogs(data);
        };
        fetchLogs();
    }, []);

    const checkForUpdates = async () => {
        setUpdating(true);
        try {
            const update = await check();
            if (update) {
                if (confirm(`Update v${update.version} is available. Install and restart now?`)) {
                    await update.downloadAndInstall();
                    await relaunch();
                }
            } else {
                alert("LocalMind is already up to date.");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to check for updates: " + e);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity size={20} className="text-accent" /> Network Activity Log
                </h3>
                <p className="text-sm text-text-muted">LocalMind verifies that no data leaves your machine. These are the internal communication logs with the Ollama service.</p>
                <div className="bg-background border border-border rounded-lg p-4 h-64 overflow-y-auto font-mono text-[10px] text-text-secondary">
                    {logs.length === 0 ? "No activity detected yet." : logs.map((l, i) => (
                        <div key={i} className="py-1 border-b border-white/5 last:border-0">{l}</div>
                    ))}
                </div>
            </section>

            <section className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Paintbrush size={20} className="text-accent" /> App Theme
                </h3>
                <div className="flex gap-2">
                    {['Light', 'Dark', 'System'].map((theme) => (
                        <button
                            key={theme}
                            className="px-6 py-3 rounded-xl border border-border bg-surface text-sm font-bold opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-not-allowed"
                            title="Coming soon in v0.2"
                        >
                            {theme}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-text-muted mt-2 italic">Color theming is currently locked to your Vertical selection to ensure optimal accessibility.</p>
            </section>

            <section className="pt-6 border-t border-border">
                <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                            <Shield size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-bold">Privacy Guard Active</div>
                            <div className="text-[10px] text-text-muted">Automatic blocking of outbound cloud APIs.</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                    <Activity size={20} className="text-accent" /> Software Updates
                </h3>
                <p className="text-sm text-text-muted mb-4">Check for the latest version of LocalMind.</p>
                <button 
                    onClick={checkForUpdates}
                    disabled={updating}
                    className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all disabled:opacity-50"
                >
                    {updating ? "Checking..." : "Check for Updates"}
                </button>
            </section>
        </div>
    );
};

const FeedbackSettings: React.FC = () => {
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // For beta, we'll log it and show a success state
        console.log("Feedback submitted:", feedback);
        setSubmitted(true);
        setFeedback('');
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <Activity size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Thank you!</h3>
                <p className="text-text-secondary text-sm">Your feedback helps us make LocalMind better. No personal data was collected.</p>
                <button onClick={() => setSubmitted(false)} className="mt-6 text-accent text-sm font-bold hover:underline">Send another report</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare size={20} className="text-accent" /> Beta Feedback
                </h3>
                <p className="text-sm text-text-muted">Tell us about bugs, feature requests, or your general experience. All feedback is anonymised.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <textarea 
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="What's on your mind?..."
                        className="w-full h-32 bg-surface border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                        required
                    />
                    <button type="submit" className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all flex items-center gap-2">
                         Send Feedback
                    </button>
                </form>
            </section>
        </div>
    );
};

const AboutSettings: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="text-center py-6">
                <div className="w-20 h-20 bg-accent/10 text-accent rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Shield size={40} />
                </div>
                <h2 className="text-3xl font-bold tracking-tighter">LocalMind</h2>
                <p className="text-text-muted text-sm font-mono mt-1">v0.1.0-beta</p>
            </section>

            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold">The Mission</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                    LocalMind was built to bridge the gap between powerful AI capabilities and absolute data sovereignty. 
                    In a world of cloud-first intelligence, we believe your professional research, legal counsel, and personal drafts 
                    should never leave your hardware.
                </p>
            </section>

            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold">Open Source Acknowledgements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        { name: "Ollama", desc: "Local inference engine", link: "ollama.com" },
                        { name: "Tauri", desc: "Next-gen desktop framework", link: "tauri.app" },
                        { name: "LanceDB", desc: "Vector database for AI", link: "lancedb.com" },
                        { name: "Lucide", desc: "Beautiful vector icons", link: "lucide.dev" },
                    ].map(lib => (
                        <a key={lib.name} href={`https://${lib.link}`} target="_blank" rel="noreferrer" className="p-3 bg-surface border border-border rounded-xl hover:border-accent group transition-all">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-sm tracking-tight group-hover:text-accent">{lib.name}</span>
                                <ExternalLink size={12} className="text-text-muted" />
                            </div>
                            <div className="text-[10px] text-text-muted">{lib.desc}</div>
                        </a>
                    ))}
                </div>
            </section>

            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold">Licence</h3>
                <p className="text-xs text-text-muted bg-surface p-4 rounded-xl font-mono leading-relaxed">
                    MIT License<br/><br/>
                    Copyright (c) 2026 LocalMind Contributors<br/><br/>
                    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software...
                </p>
            </section>
        </div>
    );
};

const ModelSettings: React.FC = () => {
    const { selectedModelId, setSelectedModelId, hardwareTier } = useOnboardingStore();
    const [installedModels, setInstalledModels] = useState<any[]>([]);
    const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ completed: number; total: number; status: string }>({ completed: 0, total: 100, status: '' });
    const [isBenchmarking, setIsBenchmarking] = useState(false);
    const [benchmarkResult, setBenchmarkResult] = useState<any>(null);

    const refreshInstalled = async () => {
        try {
            const models = await invoke<any[]>('list_installed_models');
            setInstalledModels(models);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        refreshInstalled();
    }, []);

    const isInstalled = (modelPullCommand: string) => {
        return installedModels.some(m => m.name === modelPullCommand || m.name === `${modelPullCommand}:latest`);
    };

    const handleDownload = async (modelPullCommand: string) => {
        setDownloadingModelId(modelPullCommand);

        try {
            const sanitizeEventName = (name: string) => name.replace(/[^a-zA-Z0-9-]/g, '-');
            const chunks: Record<string, { completed: number, total: number }> = {};
            
            const unlisten = await listen<any>(`download-progress-${sanitizeEventName(modelPullCommand)}`, (event) => {
                const { digest, completed, total, status } = event.payload;
                
                if (digest && total > 0) {
                    chunks[digest] = { completed, total };
                    let tmpTotal = 0;
                    let tmpCompleted = 0;
                    Object.values(chunks).forEach(c => {
                        tmpTotal += c.total;
                        tmpCompleted += c.completed;
                    });
                    
                    setProgress(prev => {
                        const newPct = Math.round((tmpCompleted / tmpTotal) * 100);
                        // Convert to raw numbers for state
                        return { 
                            completed: Math.max(prev.completed, newPct), 
                            total: 100, 
                            status 
                        };
                    });
                } else {
                    setProgress(prev => ({ ...prev, status }));
                }
            });

            await invoke('download_model', { modelName: modelPullCommand });
            refreshInstalled();
            unlisten();
        } catch (e) {
            console.error(e);
            alert(`Download error: ${e}`);
        } finally {
            setDownloadingModelId(null);
        }
    };

    const handleBenchmark = async (modelId: string) => {
        setIsBenchmarking(true);
        setBenchmarkResult(null);
        try {
            const result = await invoke('run_benchmark', { modelName: modelId });
            setBenchmarkResult(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsBenchmarking(false);
        }
    };

    const handleDelete = async (modelId: string) => {
        if (!confirm(`Are you sure you want to delete ${modelId} from your device?`)) return;
        try {
            await invoke('delete_model', { modelName: modelId });
            refreshInstalled();
            
            // If they deleted the active model, fall back safely
            if (selectedModelId === modelsConfig.models.find(m => m.pullCommand === modelId)?.id) {
                setSelectedModelId(modelsConfig.models[0].id);
            }
        } catch (e) {
            console.error(e);
            alert(`Failed to delete model: ${e}`);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Cpu size={20} className="text-accent" /> Installed Models
                    </h3>
                    <button
                        onClick={refreshInstalled}
                        className="text-xs text-accent font-bold hover:underline"
                    >
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {modelsConfig.models.map((m) => {
                        const installed = isInstalled(m.pullCommand);
                        const isDownloading = downloadingModelId === m.pullCommand;
                        const isSelected = selectedModelId === m.id;

                        return (
                            <div
                                key={m.id}
                                className={clsx(
                                    "p-4 rounded-xl border flex items-center justify-between transition-all",
                                    isSelected ? "border-accent bg-accent/5 ring-1 ring-accent" : "bg-surface border-border"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase",
                                        installed ? "bg-green-500/20 text-green-500" : "bg-text-muted/10 text-text-muted"
                                    )}>
                                        {m.tier}
                                    </div>
                                    <div className="text-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold uppercase tracking-tighter">{m.name}</span>
                                            {m.tier === hardwareTier && (
                                                <span className="text-[8px] bg-accent/20 text-accent px-1 py-0.5 rounded font-bold">REC</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-text-muted">{m.description} • {m.sizeGB}GB</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isDownloading ? (
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="text-[10px] text-accent font-bold">{progress.status}... {Math.round((progress.completed / (progress.total || 1)) * 100)}%</div>
                                            <div className="w-24 h-1 bg-border rounded-full overflow-hidden">
                                                <div className="h-full bg-accent" style={{ width: `${(progress.completed / (progress.total || 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                    ) : installed ? (
                                        <>
                                            <button
                                                onClick={() => handleBenchmark(m.pullCommand)}
                                                disabled={isBenchmarking}
                                                className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase hover:bg-surface-elevated transition-colors"
                                            >
                                                {isBenchmarking ? "Running..." : "Bench"}
                                            </button>
                                            <button
                                                onClick={() => setSelectedModelId(m.id)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors shadow-sm",
                                                    isSelected ? "bg-accent text-white" : "bg-surface-elevated border border-border text-text-primary hover:border-accent"
                                                )}
                                            >
                                                {isSelected ? "Active" : "Use"}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(m.pullCommand)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-text-muted hover:bg-red-500/10 hover:text-red-500 hover:border-red-500 transition-colors"
                                                title="Delete Model"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleDownload(m.pullCommand)}
                                            className="px-3 py-1.5 rounded-lg border border-accent text-accent bg-accent/5 text-[10px] font-bold uppercase hover:bg-accent hover:text-white transition-colors flex items-center gap-1 shadow-sm"
                                        >
                                            <Download size={12} /> Pull
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {benchmarkResult && (
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent mb-2">
                        <Activity size={16} /> Benchmark Report
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="text-sm text-text-secondary">Model Efficiency:</div>
                        <div className="text-2xl font-bold tracking-tight text-text-primary">{benchmarkResult.tokens_per_second.toFixed(2)} <span className="text-xs text-text-muted">t/s</span></div>
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 mt-2">Measured tokens per second on your local hardware. High performance (&gt; 15 t/s) is recommended for real-time writing.</p>
                </div>
            )}
        </div>
    );
};

export const Settings: React.FC = () => {
    const { i18n } = useTranslation();
    const { name, organization, language, vertical, setProfile, setVertical, resetOnboarding } = useOnboardingStore();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    const verticals: { id: Vertical; label: string; icon: React.ReactNode }[] = [
        { id: 'general', label: 'General', icon: <Briefcase size={20} /> },
        { id: 'legal', label: 'Legal Counsel', icon: <Briefcase size={20} /> },
        { id: 'medical', label: 'Medical Research', icon: <Briefcase size={20} /> },
        { id: 'finance', label: 'Financial Analysis', icon: <Briefcase size={20} /> },
        { id: 'research', label: 'Academic Research', icon: <Briefcase size={20} /> },
        { id: 'consulting', label: 'Strategy Consulting', icon: <Briefcase size={20} /> },
    ];

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setProfile({ language: lng });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <User size={20} className="text-accent" /> User Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setProfile({ name: e.target.value })}
                                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Organization</label>
                                    <input
                                        type="text"
                                        value={organization}
                                        onChange={(e) => setProfile({ organization: e.target.value })}
                                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Languages size={20} className="text-accent" /> Preferred Language
                            </h3>
                            <div className="flex gap-2">
                                {['en', 'fr', 'de', 'es'].map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => changeLanguage(lang)}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                                            language === lang
                                                ? "bg-accent/10 border-accent text-accent"
                                                : "bg-surface border-border text-text-muted hover:border-text-muted"
                                        )}
                                    >
                                        {lang.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                );
            case 'vertical':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Paintbrush size={20} className="text-accent" /> Vertical Specialization
                            </h3>
                            <p className="text-sm text-text-muted max-w-2xl">
                                Switching your vertical will change the default AI personality, color accents, and templates available in Write Mode.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {verticals.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setVertical(v.id)}
                                        className={clsx(
                                            "p-4 rounded-xl border flex items-center gap-3 transition-all",
                                            vertical === v.id
                                                ? "bg-accent/10 border-accent text-accent ring-1 ring-accent shadow-sm shadow-accent/20"
                                                : "bg-surface border-border text-text-secondary hover:border-text-muted hover:text-text-primary"
                                        )}
                                    >
                                        {v.icon}
                                        <div className="text-start">
                                            <div className="text-sm font-bold uppercase tracking-tighter">{v.label}</div>
                                            <div className="text-[10px] opacity-70">Optimized context</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                );
            case 'data':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Download size={20} className="text-accent" /> Backup & Export
                            </h3>
                            <p className="text-sm text-text-muted">Export all your private data, including collections, drafts, and chat history of your local Mind.</p>
                            <button
                                onClick={async () => {
                                    try {
                                        await invoke('export_data_archive', { targetPath: 'LocalMind_Backup' });
                                        alert("Data exported to LocalMind_Backup in your documents folder.");
                                    } catch (e) { alert("Export failed: " + e); }
                                }}
                                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold flex items-center gap-2"
                            >
                                <Upload size={16} /> Export All Data
                            </button>
                        </section>

                        <section className="space-y-4 pt-6 border-t border-border">
                            <h3 className="text-lg font-semibold text-red-500 flex items-center gap-2">
                                <Trash2 size={20} /> Danger Zone
                            </h3>
                            <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl">
                                <p className="text-sm text-text-secondary mb-4">
                                    Deleting all data will permanently remove all your indexed documents, vector embeddings, and personal drafts. This action cannot be undone.
                                </p>
                                <button
                                    onClick={async () => {
                                        if (confirm("Are you absolutely sure? This will delete EVERYTHING.")) {
                                            const code = prompt("Type DELETE to confirm:");
                                            if (code === "DELETE") {
                                                await invoke('delete_all_data');
                                                window.location.reload();
                                            }
                                        }
                                    }}
                                    className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-lg text-sm font-bold"
                                >
                                    Delete All Application Data
                                </button>
                            </div>
                        </section>
                    </div>
                );
            case 'advanced':
                return <AdvancedSettings />;
            case 'model':
                return <ModelSettings />;
            case 'feedback':
                return <FeedbackSettings />;
            case 'about':
                return <AboutSettings />;
            default:
                return (
                    <div className="p-12 text-center text-text-muted opacity-50 flex flex-col items-center">
                        <SettingsIcon size={48} className="mb-4" />
                        <p>This settings tab is under construction.</p>
                    </div>
                );
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: 'Profile', icon: <User size={16} /> },
        { id: 'model', label: 'AI Model', icon: <Cpu size={16} /> },
        { id: 'vertical', label: 'Vertical', icon: <Paintbrush size={16} /> },
        { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
        { id: 'data', label: 'Data', icon: <Download size={16} /> },
        { id: 'advanced', label: 'Advanced', icon: <Activity size={16} /> },
        { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} /> },
        { id: 'about', label: 'About', icon: <Info size={16} /> },
    ];

    return (
        <div className="flex bg-background h-full w-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-e border-border bg-surface/30 flex flex-col h-full animate-in slide-in-from-left duration-500">
                <div className="p-6">
                    <h2 className="text-2xl font-bold tracking-tight mb-1">Settings</h2>
                    <p className="text-xs text-text-muted">Manage your local instance</p>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                activeTab === tab.id
                                    ? "bg-accent/10 text-accent font-semibold"
                                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            )}
                        >
                            <span className={clsx(
                                activeTab === tab.id ? "text-accent" : "text-text-muted group-hover:text-text-primary"
                            )}>
                                {tab.icon}
                            </span>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 mt-auto border-t border-border">
                    <button
                        onClick={() => {
                            if (confirm("Reset everything? This will wipe your local profile but keep your indexed documents.")) {
                                resetOnboarding();
                                window.location.reload();
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-xs font-bold uppercase tracking-widest text-text-muted hover:bg-red-500/10 hover:text-red-500 hover:border-red-500 transition-all"
                    >
                        <Trash2 size={14} /> Reset App
                    </button>
                    <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-text-muted uppercase font-bold tracking-tighter">
                        <span>Version 0.1.0-beta</span>
                        <div className="w-1 h-1 bg-border rounded-full" />
                        <a href="https://localmind.ai" target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-accent">
                            Docs <ExternalLink size={10} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-surface/10 p-10">
                <div className="max-w-3xl">
                    <header className="mb-10">
                        <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-[0.2em] mb-3">
                            <SettingsIcon size={14} /> System Configuration
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-text-primary capitalize">{activeTab} Settings</h1>
                        <p className="text-text-secondary mt-2">Adjust details for your {activeTab} preference.</p>
                    </header>

                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};
