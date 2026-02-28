import React, { useState } from 'react';
import { useCollectionsStore } from '../../store/collections';
import { useOnboardingStore } from '../../store/onboarding';
import { FolderPlus, Book, Settings, LogOut, ChevronRight, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Dashboard: React.FC = () => {
    const collections = useCollectionsStore(state => state.collections);
    const { name, organization } = useOnboardingStore();
    const [activeTab, setActiveTab] = useState<'collections' | 'settings'>('collections');

    const getInitials = (n: string) => n.substring(0, 2).toUpperCase() || 'LM';

    return (
        <div className="flex bg-background text-text-primary h-screen w-full font-sans overflow-hidden">

            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-surface flex flex-col">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent text-white font-bold flex items-center justify-center rounded-sm text-lg">
                        {getInitials(name)}
                    </div>
                    <div>
                        <h2 className="font-semibold truncate w-36">{name || 'LocalMind User'}</h2>
                        <p className="text-xs text-text-muted truncate w-36">{organization || 'Personal Device'}</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('collections')}
                        className={twMerge(
                            clsx(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                activeTab === 'collections'
                                    ? "bg-accent/10 text-accent"
                                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            )
                        )}
                    >
                        <Book size={18} /> Knowledge Collections
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={twMerge(
                            clsx(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                activeTab === 'settings'
                                    ? "bg-accent/10 text-accent"
                                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            )
                        )}
                    >
                        <Settings size={18} /> Settings
                    </button>
                </nav>

                <div className="p-4 border-t border-border">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-text-muted hover:text-red-400 hover:bg-red-400/10">
                        <LogOut size={18} /> Reset App
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-background overflow-y-auto">
                <div className="p-8 max-w-6xl mx-auto w-full flex-1">

                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Knowledge Collections</h1>
                            <p className="text-text-secondary">Manage the documents your AI has access to.</p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors text-sm shadow-sm">
                            <FolderPlus size={16} /> New Collection
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {collections.map(col => (
                            <div
                                key={col.id}
                                className="bg-surface border border-border rounded-lg p-6 hover:border-text-muted transition-all duration-200 cursor-pointer group hover:shadow-md h-full flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                                        <Book size={24} />
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-surface-elevated rounded">
                                        <Settings size={16} className="text-text-muted" />
                                    </button>
                                </div>

                                <h3 className="text-xl font-semibold mb-2">{col.name}</h3>
                                <p className="text-sm text-text-secondary mb-6 flex-1 line-clamp-2">
                                    {col.description}
                                </p>

                                <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                        <FileText size={16} /> {col.documentCount} document{col.documentCount !== 1 ? 's' : ''}
                                    </div>
                                    <ChevronRight size={18} className="text-text-muted group-hover:text-accent transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

        </div>
    );
};
