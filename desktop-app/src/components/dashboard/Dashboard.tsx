import React, { useState } from 'react';
import { useCollectionsStore } from '../../store/collections';
import { useOnboardingStore } from '../../store/onboarding';
import {
    FolderPlus,
    Book,
    Settings as SettingsIcon,
    ChevronRight,
    FileText,
    MessageSquare,
    LayoutDashboard,
    PenTool,
    ChevronLeft,
    Monitor,
    ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CollectionDetail } from './CollectionDetail';
import { Overview } from './Overview';
import { AskMode } from '../ask/AskMode';
import { WriteMode } from '../write/WriteMode';
import { Settings } from '../settings/Settings';

export const Dashboard: React.FC = () => {
    const collections = useCollectionsStore(state => state.collections);
    const { name, organization, selectedModelId } = useOnboardingStore();
    const [activeView, setActiveView] = useState<string>('overview');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const getInitials = (n: string) => n.substring(0, 2).toUpperCase() || 'LM';

    return (
        <div className="flex bg-background text-text-primary h-screen w-full font-sans overflow-hidden">

            {/* Sidebar */}
            <div className={clsx(
                "border-r border-border bg-surface flex flex-col transition-all duration-300 relative",
                isSidebarCollapsed ? "w-20" : "w-72"
            )}>
                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-20 bg-surface border border-border rounded-full p-1 z-50 hover:bg-surface-elevated text-text-muted hover:text-accent transition-all shadow-sm"
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className={clsx("p-6 border-b border-border flex items-center gap-3 overflow-hidden", isSidebarCollapsed && "justify-center px-0")}>
                    <div className="w-10 h-10 bg-accent text-white font-bold flex shrink-0 items-center justify-center rounded-sm text-lg shadow-sm shadow-accent/20">
                        {getInitials(name)}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="animate-in fade-in slide-in-from-left-2 duration-300 truncate">
                            <h2 className="font-bold tracking-tight truncate w-40">{name || 'LocalMind User'}</h2>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted truncate w-40">{organization || 'Personal Device'}</p>
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <button
                        onClick={() => setActiveView('overview')}
                        className={twMerge(
                            clsx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group",
                                activeView === 'overview'
                                    ? "bg-accent/10 text-accent"
                                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            )
                        )}
                        title={isSidebarCollapsed ? "Overview" : ""}
                    >
                        <LayoutDashboard size={20} className={activeView === 'overview' ? "text-accent" : "text-text-muted group-hover:text-text-primary"} />
                        {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Overview</span>}
                    </button>

                    <div className={clsx("h-[1px] bg-border/50 mx-2 my-4", isSidebarCollapsed && "mx-4")} />

                    <button
                        onClick={() => setActiveView('collections')}
                        className={twMerge(
                            clsx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group",
                                activeView === 'collections' || activeView.startsWith('col:')
                                    ? "bg-accent/10 text-accent"
                                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            )
                        )}
                        title={isSidebarCollapsed ? "Knowledge Collections" : ""}
                    >
                        <Book size={20} className={(activeView === 'collections' || activeView.startsWith('col:')) ? "text-accent" : "text-text-muted group-hover:text-text-primary"} />
                        {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Knowledge Base</span>}
                    </button>

                    <button
                        onClick={() => setActiveView('ask')}
                        className={twMerge(
                            clsx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group",
                                activeView === 'ask'
                                    ? "bg-accent/10 text-accent"
                                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            )
                        )}
                        title={isSidebarCollapsed ? "Ask Documents" : ""}
                    >
                        <MessageSquare size={20} className={activeView === 'ask' ? "text-accent" : "text-text-muted group-hover:text-text-primary"} />
                        {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Ask Documents</span>}
                    </button>

                    <button
                        onClick={() => setActiveView('write')}
                        className={twMerge(
                            clsx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group",
                                activeView === 'write'
                                    ? "bg-accent/10 text-accent"
                                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            )
                        )}
                        title={isSidebarCollapsed ? "Write Assistant" : ""}
                    >
                        <PenTool size={20} className={activeView === 'write' ? "text-accent" : "text-text-muted group-hover:text-text-primary"} />
                        {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Write Assistant</span>}
                    </button>

                    <div className={clsx("h-[1px] bg-border/50 mx-2 my-4", isSidebarCollapsed && "mx-4")} />

                    <button
                        onClick={() => setActiveView('settings')}
                        className={twMerge(
                            clsx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group",
                                activeView === 'settings'
                                    ? "bg-accent/10 text-accent"
                                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            )
                        )}
                        title={isSidebarCollapsed ? "Settings" : ""}
                    >
                        <SettingsIcon size={20} className={activeView === 'settings' ? "text-accent" : "text-text-muted group-hover:text-text-primary"} />
                        {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Settings</span>}
                    </button>
                </nav>

                {/* Model Status Indicator */}
                <div className={clsx("p-4 border-t border-border bg-surface/50", isSidebarCollapsed && "px-0")}>
                    {!isSidebarCollapsed ? (
                        <div className="bg-background/50 rounded-xl p-3 border border-border/50 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary">Engine Ready</span>
                                </div>
                                <ShieldCheck size={12} className="text-accent" />
                            </div>
                            <div className="text-[10px] text-text-muted font-medium truncate mb-1 flex items-center gap-1">
                                <Monitor size={10} /> {selectedModelId || 'llama3.2:1b'}
                            </div>
                            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-accent w-full opacity-30" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Engine Ready" />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
                {/* Global Privacy Gradient */}
                <div className="absolute top-0 right-0 p-4 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-green-500 backdrop-blur-md">
                        <ShieldCheck size={12} /> 100% Offline
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-10 max-w-6xl mx-auto w-full">

                        {activeView === 'overview' && (
                            <Overview onNavigate={setActiveView} />
                        )}

                        {activeView === 'collections' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex justify-between items-end mb-10">
                                    <div>
                                        <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-[0.2em] mb-3">
                                            <Book size={14} /> Knowledge Repository
                                        </div>
                                        <h1 className="text-4xl font-bold tracking-tight mb-2">Collections</h1>
                                        <p className="text-text-secondary">Organize and manage your private data for AI grounding.</p>
                                    </div>
                                    <button className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-lg transition-all text-sm shadow-lg shadow-accent/25 active:scale-95">
                                        <FolderPlus size={18} /> New Collection
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {collections.map(col => (
                                        <div
                                            key={col.id}
                                            onClick={() => setActiveView(`col:${col.id}`)}
                                            className="bg-surface border border-border rounded-xl p-6 hover:border-accent hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 cursor-pointer group flex flex-col h-full border-b-4 border-b-transparent hover:border-b-accent"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-300 transform group-hover:rotate-3 shadow-inner">
                                                    <Book size={24} />
                                                </div>
                                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-surface-elevated rounded-lg text-text-muted hover:text-accent">
                                                    <SettingsIcon size={18} />
                                                </button>
                                            </div>

                                            <h3 className="text-xl font-bold mb-2 tracking-tight group-hover:text-accent transition-colors">{col.name}</h3>
                                            <p className="text-sm text-text-secondary mb-6 flex-1 line-clamp-2 leading-relaxed">
                                                {col.description}
                                            </p>

                                            <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                                                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-text-muted">
                                                    <FileText size={14} className="text-accent" /> {col.documentCount} document{col.documentCount !== 1 ? 's' : ''}
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-border/30 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {collections.length === 0 && (
                                        <div className="col-span-full py-20 border-2 border-dashed border-border rounded-2xl text-center">
                                            <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
                                                <FolderPlus size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold mb-1">No collections yet</h3>
                                            <p className="text-text-secondary text-sm mb-6">Create your first collection to start indexing documents.</p>
                                            <button className="px-6 py-2 bg-accent text-white font-bold rounded-lg text-sm">Create Collection</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeView.startsWith('col:') && (
                            <CollectionDetail
                                collectionId={activeView.replace('col:', '')}
                                onBack={() => setActiveView('collections')}
                            />
                        )}

                        {activeView === 'ask' && (
                            <AskMode onBack={() => setActiveView('overview')} />
                        )}

                        {activeView === 'write' && (
                            <WriteMode onBack={() => setActiveView('overview')} />
                        )}

                        {activeView === 'settings' && (
                            <Settings />
                        )}

                    </div>
                </div>
            </div>

        </div>
    );
};
