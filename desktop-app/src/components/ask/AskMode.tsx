import React, { useState, useRef, useEffect } from 'react';
import { useAskStore } from '../../store/ask';
import { useCollectionsStore } from '../../store/collections';
import { useOnboardingStore } from '../../store/onboarding';
import { Send, Shield, X, Plus, Trash2, FileText, ChevronRight, Clock, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useDateFormat } from '../../hooks/useDateFormat';

interface ResponsePayload { model: string; response: string; done: boolean; }

export const AskMode: React.FC<{ onBack?: () => void }> = () => {
    const collections = useCollectionsStore((state) => state.collections);
    const { formatTime } = useDateFormat();
    const { sessions, createSession, addMessage, activeSessionId, deleteSession, clearSession } = useAskStore();

    const [selectedCollectionId, setSelectedCollectionId] = useState<string>(collections[0]?.id || '');
    const [query, setQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStreamingResponse, setCurrentStreamingResponse] = useState('');
    const [selectedCitation, setSelectedCitation] = useState<any>(null);
    const [lastRagResult, setLastRagResult] = useState<any>(null);
    const [activeCiteIndex, setActiveCiteIndex] = useState<number | null>(null);

    const activeSession = sessions.find((s) => s.id === activeSessionId) || { messages: [] };
    const chatEndRef = useRef<HTMLDivElement>(null);
    const { vertical, selectedModelId } = useOnboardingStore();

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeSession.messages, currentStreamingResponse]);

    useEffect(() => {
        const unlisten = listen<ResponsePayload>('generation-progress', (event) => {
            if (event.payload.done) setIsGenerating(false);
            else setCurrentStreamingResponse((prev) => prev + event.payload.response);
        });
        return () => { unlisten.then((f) => f()); };
    }, []);

    useEffect(() => {
        if (!isGenerating && currentStreamingResponse && activeSessionId) {
            addMessage(activeSessionId, {
                role: 'assistant', content: currentStreamingResponse,
                confidence: lastRagResult?.confidence || 'none',
                citations: lastRagResult?.citations || []
            });
            setCurrentStreamingResponse('');
        }
    }, [isGenerating, currentStreamingResponse, activeSessionId, lastRagResult]);

    const handleSend = async () => {
        if (!query.trim() || isGenerating) return;
        let sessionId = activeSessionId;
        if (!sessionId) sessionId = createSession(selectedCollectionId, query.substring(0, 40));
        const userQuery = query.trim();
        setQuery('');
        addMessage(sessionId, { role: 'user', content: userQuery });
        setIsGenerating(true);
        setCurrentStreamingResponse('');
        setLastRagResult(null);
        try {
            const modelName = selectedModelId || 'qwen3.5:4b';
            const ragResult = await invoke<any>('prepare_rag_context', { collectionId: selectedCollectionId, query: userQuery });
            setLastRagResult(ragResult);

            if (!ragResult.found) {
                addMessage(sessionId, {
                    role: 'assistant',
                    content: 'Not found in your documents. Try rephrasing the question or adding more files to this matter.',
                    confidence: 'none',
                    citations: [],
                });
                setIsGenerating(false);
                return;
            }

            const tone = vertical === 'legal'
                ? 'You are a precise legal research assistant for a solo lawyer or small firm. You are not a substitute for legal advice. Prefer quoting the documents.'
                : vertical === 'medical' ? 'You are a Medical Research Assistant. Provide evidence-based info with a disclaimer.'
                    : vertical === 'finance' ? 'You are a Financial Analyst. Be objective and mention risks.'
                        : 'You are a knowledgeable AI assistant.';
            const systemPrompt = `${tone}
Answer ONLY using the CONTEXT below. If the answer is not clearly supported, say "Not found in your documents."
Do not use outside knowledge. Always cite sources as [Source X].
This is a research aid — the attorney remains responsible for verification.

CONTEXT:
${ragResult.context}`;
            await invoke('generate_text', { modelName, prompt: `${systemPrompt}\n\nUSER QUESTION: ${userQuery}\n\nAI RESPONSE:` });
        } catch (e) { console.error('Ask error:', e); setIsGenerating(false); }
    };

    const confidenceColor = (c: string) =>
        c === 'high' ? 'text-emerald-400' : c === 'medium' ? 'text-amber-400' : 'text-red-400';
    const confidenceSegments = (c: string) =>
        c === 'high' ? 3 : c === 'medium' ? 2 : 1;

    const relatedPassages = lastRagResult?.citations?.slice(0, 3) || [];

    return (
        <div className="flex h-full w-full overflow-hidden rounded-xl border border-white/[0.07] shadow-2xl bg-[#0E0F11] text-[#F0F0F2]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

            {/* === LEFT SIDEBAR: Chat History === */}
            <div className="w-48 min-w-[192px] border-r border-white/[0.07] bg-[#16181C] flex flex-col">
                <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
                    <span className="text-[10px] font-medium text-[#5A5B66] uppercase tracking-[0.08em]">History</span>
                    <button
                        onClick={() => createSession(selectedCollectionId)}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/5 text-[#9A9BA8] hover:text-[#F0F0F2] transition-colors"
                        title="New Chat"
                    >
                        <Plus size={12} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                    {sessions.length === 0 && (
                        <div className="px-4 py-8 text-center text-[#5A5B66] text-[11px]">No chats yet</div>
                    )}
                    {sessions.map(s => (
                        <div key={s.id} className="group relative">
                            <button
                                onClick={() => useAskStore.setState({ activeSessionId: s.id })}
                                className={clsx(
                                    "w-full text-left px-3 py-2 text-[12px] truncate pe-8 transition-colors",
                                    s.id === activeSessionId
                                        ? "bg-[rgba(79,142,247,0.12)] text-[#4F8EF7]"
                                        : "text-[#9A9BA8] hover:bg-[#1E2026] hover:text-[#F0F0F2]"
                                )}
                            >
                                {s.title}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[#5A5B66] hover:text-red-400 transition-all"
                            >
                                <X size={11} />
                            </button>
                        </div>
                    ))}
                </div>
                {/* Collection selector */}
                <div className="p-3 border-t border-white/[0.07]">
                    <div className="text-[10px] text-[#5A5B66] uppercase tracking-[0.08em] mb-1.5">Collection</div>
                    <select
                        value={selectedCollectionId}
                        onChange={(e) => setSelectedCollectionId(e.target.value)}
                        className="w-full bg-[#1E2026] border border-white/[0.07] text-[#9A9BA8] text-[11px] rounded px-2 py-1.5 outline-none focus:border-[rgba(79,142,247,0.3)]"
                    >
                        {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* === MIDDLE: Chat === */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.07]">
                {/* Topbar */}
                <div className="h-12 min-h-[48px] bg-[#16181C] border-b border-white/[0.07] flex items-center px-4 gap-3">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#1E2026] border border-white/[0.07] text-[11px] text-[#9A9BA8]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4F8EF7]" />
                        {collections.find(c => c.id === selectedCollectionId)?.name || 'No collection'}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {activeSessionId && (
                            <button
                                onClick={() => clearSession(activeSessionId)}
                                className="p-1.5 rounded hover:bg-white/5 text-[#5A5B66] hover:text-red-400 transition-colors"
                                title="Clear chat"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                        <div className="flex items-center gap-1.5 text-[#3DD68C] bg-[rgba(61,214,140,0.1)] border border-[rgba(61,214,140,0.2)] rounded-full px-2.5 py-1 text-[11px]">
                            <Shield size={10} />
                            100% offline
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}>
                    {activeSession.messages.length === 0 && !isGenerating && (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-40 space-y-3">
                            <MessageSquare size={36} className="text-[#5A5B66]" />
                            <div>
                                <p className="text-sm font-medium text-[#9A9BA8]">Ask your documents anything</p>
                                <p className="text-[11px] text-[#5A5B66] mt-1">All answers are sourced from your private collection</p>
                            </div>
                        </div>
                    )}

                    {activeSession.messages.map((m, idx) => (
                        <div key={m.id} className={clsx("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                            {m.role === 'user' ? (
                                <div className="max-w-[65%] px-3.5 py-2.5 rounded-[12px_12px_2px_12px] bg-[#4F8EF7] text-white text-[13px] leading-[1.5]">
                                    {m.content}
                                </div>
                            ) : (
                                <div className="max-w-[85%] space-y-1">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <div className="w-5 h-5 rounded-[5px] bg-[rgba(79,142,247,0.12)] border border-[rgba(79,142,247,0.3)] flex items-center justify-center">
                                            <svg viewBox="0 0 11 11" width="11" height="11" fill="none" stroke="#4F8EF7" strokeWidth="1.5">
                                                <circle cx="5.5" cy="5.5" r="3"/><path d="M5.5 2.5v1M5.5 8v1M2.5 5.5h1M8 5.5h1"/>
                                            </svg>
                                        </div>
                                        <span className="text-[11px] text-[#5A5B66]">LocalMind</span>
                                    </div>
                                    <div className="px-3.5 py-3 rounded-[2px_12px_12px_12px] bg-[#1E2026] border border-white/[0.07] text-[13px] leading-[1.65] text-[#F0F0F2]">
                                        {/* Render content with clickable citation chips */}
                                        <div>
                                            {m.content.split(/(\[Source \d+\])/g).map((part, i) => {
                                                const match = part.match(/\[Source (\d+)\]/);
                                                if (match) {
                                                    const sourceId = parseInt(match[1]);
                                                    const citation = m.citations?.find((c: any) => c.id === sourceId);
                                                    const isActive = activeCiteIndex === idx * 100 + sourceId;
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                setActiveCiteIndex(isActive ? null : idx * 100 + sourceId);
                                                                citation && setSelectedCitation({ ...citation, text: (citation as any).chunk || (citation as any).text || '' });
                                                            }}
                                                            className={clsx(
                                                                "inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-medium mx-0.5 align-middle border transition-all",
                                                                isActive
                                                                    ? "bg-[#4F8EF7] text-white border-[#4F8EF7]"
                                                                    : "bg-[rgba(79,142,247,0.12)] text-[#4F8EF7] border-[rgba(79,142,247,0.3)] hover:bg-[#4F8EF7] hover:text-white"
                                                            )}
                                                        >
                                                            {sourceId}
                                                        </button>
                                                    );
                                                }
                                                return <span key={i}>{part}</span>;
                                            })}
                                        </div>

                                        {/* Confidence bar */}
                                        {m.confidence && m.confidence !== 'none' && (
                                            <div className={clsx("flex items-center gap-1.5 mt-2 text-[10px]", confidenceColor(m.confidence))}>
                                                <div className="flex gap-0.5">
                                                    {[1,2,3].map(n => (
                                                        <div key={n} className={clsx("w-4 h-[3px] rounded-sm", n <= confidenceSegments(m.confidence ?? 'low') ? 'bg-current' : 'bg-white/10')} />
                                                    ))}
                                                </div>
                                                {m.confidence.charAt(0).toUpperCase() + m.confidence.slice(1)} confidence
                                                {m.citations?.length ? ` · ${m.citations.length} source${m.citations.length > 1 ? 's' : ''}` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-[#5A5B66]">
                                <Clock size={9} />
                                {formatTime(m.timestamp)}
                            </div>
                        </div>
                    ))}

                    {/* Streaming bubble */}
                    {(isGenerating || currentStreamingResponse) && (
                        <div className="flex flex-col items-start animate-in fade-in duration-300">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-5 h-5 rounded-[5px] bg-[rgba(79,142,247,0.12)] border border-[rgba(79,142,247,0.3)] flex items-center justify-center">
                                    <svg viewBox="0 0 11 11" width="11" height="11" fill="none" stroke="#4F8EF7" strokeWidth="1.5">
                                        <circle cx="5.5" cy="5.5" r="3"/><path d="M5.5 2.5v1M5.5 8v1M2.5 5.5h1M8 5.5h1"/>
                                    </svg>
                                </div>
                                <span className="text-[11px] text-[#5A5B66]">LocalMind · typing</span>
                            </div>
                            <div className="max-w-[85%] px-3.5 py-3 rounded-[2px_12px_12px_12px] bg-[#1E2026] border border-white/[0.07] text-[13px] leading-[1.65] text-[#9A9BA8]">
                                <span className="text-[#F0F0F2]">{currentStreamingResponse || 'Searching documents…'}</span>
                                {isGenerating && <span className="inline-block w-0.5 h-3.5 bg-[#4F8EF7] ml-0.5 align-middle animate-pulse" />}
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-white/[0.07] bg-[#16181C]">
                    <div className="flex items-center gap-2 bg-[#1E2026] border border-white/[0.12] rounded-[10px] px-3 py-2">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Ask anything about your documents…"
                            disabled={isGenerating}
                            className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#F0F0F2] placeholder-[#5A5B66]"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!query.trim() || isGenerating}
                            className="w-7 h-7 rounded-[7px] bg-[#4F8EF7] disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-opacity"
                        >
                            <Send size={13} color="white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* === RIGHT PANEL: Source Viewer === */}
            <div className={clsx(
                "flex flex-col bg-[#16181C] transition-all duration-300 overflow-hidden",
                selectedCitation ? "w-72 min-w-[288px]" : "w-0 min-w-0"
            )}>
                {selectedCitation && (
                    <>
                        {/* Source header */}
                        <div className="px-3.5 py-3 border-b border-white/[0.07] flex items-center gap-2">
                            <FileText size={12} className="text-[#9A9BA8]" />
                            <span className="text-[11px] text-[#9A9BA8] font-medium truncate flex-1">
                                {selectedCitation.filename || 'Source document'}
                            </span>
                            <span className="text-[10px] text-[#5A5B66] ml-auto shrink-0">
                                {selectedCitation.score != null ? `${(selectedCitation.score * 100).toFixed(0)}% match` : ''}
                            </span>
                            <button onClick={() => setSelectedCitation(null)} className="text-[#5A5B66] hover:text-[#F0F0F2] transition-colors">
                                <X size={13} />
                            </button>
                        </div>

                        {/* Source body */}
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
                            <div>
                                <div className="flex items-center gap-1.5 text-[10px] text-[#5A5B66] mb-2">
                                    <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="3"/><path d="M5 3.5v2l1 1"/></svg>
                                    Cited passage
                                </div>
                                <div className="text-[12px] leading-[1.7] text-[#9A9BA8] border-l-2 border-[#4F8EF7] pl-2.5">
                                    {selectedCitation.text || selectedCitation.chunk || 'Source text not available.'}
                                </div>
                            </div>

                            {/* Related passages */}
                            {relatedPassages.filter((p: any) => p.id !== selectedCitation.id).length > 0 && (
                                <div>
                                    <div className="text-[10px] text-[#5A5B66] uppercase tracking-[0.06em] font-medium mb-2">Related passages</div>
                                    <div className="space-y-1.5">
                                        {relatedPassages
                                            .filter((p: any) => p.id !== selectedCitation.id)
                                            .map((p: any, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedCitation(p)}
                                                    className="w-full text-left p-2 bg-[#1E2026] rounded-md border border-white/[0.07] hover:border-[rgba(79,142,247,0.3)] transition-colors"
                                                >
                                                    <div className="text-[10px] text-[#5A5B66] mb-0.5">{p.filename || 'Document'}</div>
                                                    <div className="text-[11px] text-[#9A9BA8] line-clamp-2">{p.chunk || p.text || ''}</div>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-3.5 py-2.5 border-t border-white/[0.07] flex justify-end">
                            <button className="text-[11px] text-[#4F8EF7] flex items-center gap-1 hover:underline">
                                Open full document <ChevronRight size={11} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
