import React, { useState } from 'react';
import { useWriteStore } from '../../store/write';
import { useCollectionsStore } from '../../store/collections';
import { useOnboardingStore } from '../../store/onboarding';
import { ArrowLeft, BookOpen, Plus, X, ChevronRight, PenTool, Globe, Save, Download, FileText, Search } from 'lucide-react';
import { Editor } from './Editor';
import { useDateFormat } from '../../hooks/useDateFormat';

export const WriteMode: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { drafts, activeDraftId, updateDraft, addDocToContext, removeDocFromContext, setActiveDraft } = useWriteStore();
    const collections = useCollectionsStore((state) => state.collections);
    const { vertical } = useOnboardingStore();
    const { formatDate } = useDateFormat();

    const activeDraft = drafts.find((d) => d.id === activeDraftId);
    const [isSelectingDocs, setIsSelectingDocs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const currentContext = activeDraft?.contextDocs || [];

    const handleUpdateContent = (html: string) => {
        if (activeDraftId) {
            updateDraft(activeDraftId, { content: html });
        }
    };

    const handleAddDocToContext = (docId: string) => {
        if (activeDraftId) {
            addDocToContext(activeDraftId, docId);
        }
    };

    const handleRemoveDocFromContext = (docId: string) => {
        if (activeDraftId) {
            removeDocFromContext(activeDraftId, docId);
        }
    };

    if (!activeDraft) {
        return (
            <div className="flex flex-col h-full p-8 max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Your Drafts</h1>
                    <button
                        onClick={() => useWriteStore.getState().createDraft()}
                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors text-sm"
                    >
                        <Plus size={16} /> New Draft
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drafts.map(d => (
                        <div
                            key={d.id}
                            onClick={() => setActiveDraft(d.id)}
                            className="p-6 bg-surface border border-border rounded-lg hover:border-accent transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
                        >
                            <div>
                                <h3 className="font-semibold text-lg mb-2">{d.title}</h3>
                                <div className="text-xs text-text-muted mb-4 uppercase font-bold tracking-widest">{formatDate(d.updatedAt)}</div>
                            </div>
                            <div className="flex items-center justify-between mt-auto border-t border-border pt-4">
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                    <Globe size={12} /> {d.contextDocs.length} Context Docs
                                </span>
                                <ChevronRight size={18} className="text-text-muted group-hover:text-accent transition-colors" />
                            </div>
                        </div>
                    ))}
                    {drafts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-text-muted opacity-50 flex flex-col items-center">
                            <PenTool size={48} className="mb-4" />
                            <p>You haven't created any drafts yet.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-background h-screen overflow-hidden">
            <div className="w-80 border-e border-border bg-surface/30 flex flex-col h-full animate-in slide-in-from-left duration-300">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-accent" />
                        <h2 className="font-semibold text-xs uppercase tracking-widest">Document Context</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="space-y-2">
                        {currentContext.map(docId => (
                            <div key={docId} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg text-xs group">
                                <div className="flex items-center gap-2 truncate">
                                    <FileText size={14} className="text-text-muted" />
                                    <span className="truncate">{docId.substring(0, 15)}...</span>
                                </div>
                                <button onClick={() => handleRemoveDocFromContext(docId)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {!isSelectingDocs && (
                        <button
                            onClick={() => setIsSelectingDocs(true)}
                            className="w-full py-2 border border-border rounded hover:bg-surface-elevated text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus size={14} /> Add Documents
                        </button>
                    )}

                    {isSelectingDocs && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold uppercase text-text-muted">Select from Collections</h4>
                                <button onClick={() => setIsSelectingDocs(false)} className="text-[10px] text-accent">Done</button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search documents..."
                                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                                <Search size={12} className="absolute end-2 top-1/2 -translate-y-1/2 text-text-muted" />
                            </div>
                            <div className="space-y-1 max-h-64 overflow-y-auto bg-background/50 p-1 rounded border border-border">
                                {collections.map(c => (
                                    <div key={c.id} className="p-2 border-b border-border/10 last:border-0 hover:bg-accent/5 rounded transition-colors cursor-pointer text-[10px] line-clamp-1" onClick={() => handleAddDocToContext(c.id)}>
                                        📁 {c.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className="p-2 hover:bg-surface-elevated rounded-md text-text-secondary transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex flex-col">
                            <input
                                value={activeDraft.title}
                                onChange={(e) => updateDraft(activeDraftId as string, { title: e.target.value })}
                                className="bg-transparent font-bold text-lg border-none focus:outline-none focus:ring-0 w-64"
                                placeholder="Draft Title"
                            />
                            <div className="text-[10px] text-text-muted uppercase font-bold tracking-tighter flex items-center gap-2">
                                <span className="flex items-center gap-1"><Save size={10} /> Auto-saved</span>
                                <span>|</span>
                                <span>{activeDraft.content.length} characters</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="px-3 py-1 text-xs hover:bg-surface-elevated rounded border border-border transition-colors flex items-center gap-2 font-medium">
                            <Download size={14} /> Export
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                    <div className="w-full max-w-3xl animate-in zoom-in-95 duration-500">
                        <Editor
                            content={activeDraft.content}
                            onUpdate={handleUpdateContent}
                            contextDocIds={activeDraft.contextDocs}
                            vertical={vertical}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
