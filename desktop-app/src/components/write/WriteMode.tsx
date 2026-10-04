import React, { useState } from 'react';
import { useWriteStore } from '../../store/write';
import { useCollectionsStore } from '../../store/collections';
import { useOnboardingStore } from '../../store/onboarding';
import {
    ArrowLeft, FileText, Plus, X, PenTool, Globe,
    Download, Search, ChevronRight, Shield
} from 'lucide-react';
import { Editor } from './Editor';
import { invoke } from '@tauri-apps/api/core';
import { useDateFormat } from '../../hooks/useDateFormat';

const AI_COMMANDS = [
    { key: '⌘K', label: 'Expand paragraph', cmd: 'expand' },
    { key: '⌘J', label: 'Rewrite formally', cmd: 'rewrite' },
    { key: '⌘H', label: 'Summarise context', cmd: 'summarize' },
    { key: '⌘E', label: 'Extract key facts', cmd: 'extract' },
];

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
        if (activeDraftId) updateDraft(activeDraftId, { content: html });
    };

    const handleExport = async () => {
        if (!activeDraft) return;
        try {
            await invoke('export_draft_pdf', { title: activeDraft.title, content: activeDraft.content });
        } catch (e) {
            console.error(e);
        }
    };

    // === DRAFT LIST VIEW ===
    if (!activeDraft) {
        return (
            <div
                className="flex flex-col h-full overflow-hidden rounded-xl border border-white/[0.07] shadow-2xl"
                style={{ background: '#0E0F11', color: '#F0F0F2', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
                <div className="px-8 py-6 border-b border-white/[0.07] flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Your Drafts</h1>
                        <p className="text-[12px] text-[#5A5B66] mt-0.5">Private to this device</p>
                    </div>
                    <button
                        onClick={() => useWriteStore.getState().createDraft()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white font-medium rounded-md transition-colors text-[13px]"
                    >
                        <Plus size={15} /> New Draft
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {drafts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 space-y-3">
                            <PenTool size={40} className="text-[#5A5B66]" />
                            <div className="text-center">
                                <p className="text-sm text-[#9A9BA8]">No drafts yet</p>
                                <p className="text-[11px] text-[#5A5B66]">Create your first document above</p>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
                        {drafts.map(d => (
                            <div
                                key={d.id}
                                onClick={() => setActiveDraft(d.id)}
                                className="p-5 bg-[#16181C] border border-white/[0.07] rounded-xl hover:border-[rgba(79,142,247,0.3)] transition-all cursor-pointer group flex flex-col min-h-[140px]"
                            >
                                <h3 className="font-medium text-[14px] mb-1 truncate">{d.title}</h3>
                                <div className="text-[10px] text-[#5A5B66] uppercase tracking-[0.08em] mb-3">{formatDate(d.updatedAt)}</div>
                                <div className="mt-auto flex items-center justify-between border-t border-white/[0.07] pt-3">
                                    <span className="text-[11px] text-[#5A5B66] flex items-center gap-1">
                                        <Globe size={11} /> {d.contextDocs.length} context doc{d.contextDocs.length !== 1 ? 's' : ''}
                                    </span>
                                    <ChevronRight size={15} className="text-[#5A5B66] group-hover:text-[#4F8EF7] transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // === EDITOR VIEW ===
    return (
        <div
            className="flex h-full overflow-hidden rounded-xl border border-white/[0.07] shadow-2xl"
            style={{ background: '#0E0F11', color: '#F0F0F2', fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
            {/* === LEFT: Context Panel (220px per spec) === */}
            <div className="w-[220px] min-w-[220px] border-r border-white/[0.07] bg-[#16181C] flex flex-col">
                <div className="px-3.5 py-3 border-b border-white/[0.07]">
                    <div className="text-[10px] text-[#5A5B66] uppercase tracking-[0.08em] font-medium">Context</div>
                </div>

                {/* Context docs */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {currentContext.map(docId => {
                        const col = collections.find(c => c.id === docId);
                        return (
                            <div key={docId} className="flex items-start gap-2 p-2 rounded-md bg-[#1E2026] border border-white/[0.07] group">
                                <FileText size={13} className="text-[#5A5B66] flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] text-[#9A9BA8] truncate">{col?.name || docId.substring(0, 16)}</div>
                                    <div className="text-[10px] text-[#5A5B66]">indexed</div>
                                </div>
                                <button
                                    onClick={() => activeDraftId && removeDocFromContext(activeDraftId, docId)}
                                    className="opacity-0 group-hover:opacity-100 text-[#5A5B66] hover:text-red-400 transition-all flex-shrink-0"
                                >
                                    <X size={11} />
                                </button>
                            </div>
                        );
                    })}

                    {/* Add document */}
                    {!isSelectingDocs ? (
                        <button
                            onClick={() => setIsSelectingDocs(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-dashed border-white/[0.12] text-[11px] text-[#5A5B66] hover:border-[rgba(79,142,247,0.3)] hover:text-[#4F8EF7] transition-all"
                        >
                            <Plus size={11} /> Add document
                        </button>
                    ) : (
                        <div className="space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[#5A5B66] uppercase tracking-[0.08em]">Pick a collection</span>
                                <button onClick={() => setIsSelectingDocs(false)} className="text-[10px] text-[#4F8EF7]">Done</button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search…"
                                    className="w-full bg-[#1E2026] border border-white/[0.07] rounded px-2 py-1 text-[11px] text-[#F0F0F2] placeholder-[#5A5B66] outline-none focus:border-[rgba(79,142,247,0.3)] pr-6"
                                />
                                <Search size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5A5B66]" />
                            </div>
                            <div className="space-y-0.5 max-h-40 overflow-y-auto">
                                {collections
                                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => { activeDraftId && addDocToContext(activeDraftId, c.id); setIsSelectingDocs(false); }}
                                            className="w-full text-left px-2 py-1.5 rounded text-[11px] text-[#9A9BA8] hover:bg-[rgba(79,142,247,0.08)] hover:text-[#4F8EF7] transition-colors truncate"
                                        >
                                            📁 {c.name}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Commands reference */}
                <div className="p-3 border-t border-white/[0.07]">
                    <div className="text-[10px] text-[#5A5B66] uppercase tracking-[0.08em] font-medium mb-2">AI Commands</div>
                    <div className="space-y-1">
                        {AI_COMMANDS.map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1E2026] border border-white/[0.07] text-[11px] text-[#9A9BA8] cursor-default">
                                <span className="text-[10px] text-[#5A5B66] font-mono">{key}</span>
                                {label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* === RIGHT: Editor === */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Editor topbar */}
                <div className="h-12 min-h-[48px] bg-[#16181C] border-b border-white/[0.07] flex items-center px-4 gap-3">
                    <button onClick={onBack} className="p-1.5 rounded hover:bg-white/5 text-[#5A5B66] hover:text-[#F0F0F2] transition-colors">
                        <ArrowLeft size={15} />
                    </button>

                    {/* Template chip */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#9A9BA8] bg-[#1E2026] border border-white/[0.07] rounded-md px-2.5 py-1">
                        <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="1" y="1" width="8" height="8" rx="1"/><path d="M3 4h4M3 6h2"/>
                        </svg>
                        {vertical.charAt(0).toUpperCase() + vertical.slice(1)} draft
                    </div>

                    {/* Title */}
                    <input
                        value={activeDraft.title}
                        onChange={e => updateDraft(activeDraftId as string, { title: e.target.value })}
                        className="flex-1 bg-transparent text-[13px] font-medium border-none focus:outline-none text-[#F0F0F2] placeholder-[#5A5B66] min-w-0"
                        placeholder="Untitled draft"
                    />

                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#5A5B66]">Auto-saved</span>
                        <div className="flex items-center gap-1.5 text-[#3DD68C] bg-[rgba(61,214,140,0.1)] border border-[rgba(61,214,140,0.2)] rounded-full px-2.5 py-1 text-[11px]">
                            <Shield size={9} /> 100% offline
                        </div>
                        <button
                            onClick={handleExport}
                            className="px-3 py-1 rounded-md bg-[#4F8EF7] text-white text-[11px] font-medium flex items-center gap-1.5 hover:bg-[#4F8EF7]/90 transition-colors"
                        >
                            <Download size={12} /> Export
                        </button>
                    </div>
                </div>

                {/* Editor body */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Editor
                        content={activeDraft.content}
                        onUpdate={handleUpdateContent}
                        contextDocIds={activeDraft.contextDocs}
                        vertical={vertical}
                    />
                </div>
            </div>
        </div>
    );
};
