import React, { useState, useRef, useEffect } from 'react';
import { useAskStore } from '../../store/ask';
import { useCollectionsStore } from '../../store/collections';
import { Send, ArrowLeft, MessageSquare, Info, Shield, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface ResponsePayload {
    model: string;
    response: string;
    done: boolean;
}

export const AskMode: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const collections = useCollectionsStore((state) => state.collections);
    const { sessions, createSession, addMessage, activeSessionId } = useAskStore();

    const [selectedCollectionId, setSelectedCollectionId] = useState<string>(collections[0]?.id || '');
    const [query, setQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStreamingResponse, setCurrentStreamingResponse] = useState('');
    const [selectedCitation, setSelectedCitation] = useState<any>(null);

    const activeSession = sessions.find((s) => s.id === activeSessionId) || { messages: [] };
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeSession.messages, currentStreamingResponse]);

    useEffect(() => {
        const unlisten = listen<ResponsePayload>('generation-progress', (event) => {
            if (event.payload.done) {
                setIsGenerating(false);
            } else {
                setCurrentStreamingResponse((prev) => prev + event.payload.response);
            }
        });

        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    const handleSend = async () => {
        if (!query.trim() || isGenerating) return;

        let sessionId = activeSessionId;
        if (!sessionId) {
            sessionId = createSession(selectedCollectionId, query.substring(0, 30));
        }

        const userQuery = query.trim();
        setQuery('');
        addMessage(sessionId, { role: 'user', content: userQuery });
        setIsGenerating(true);
        setCurrentStreamingResponse('');

        try {
            // 1. Prepare RAG Context
            const ragResult = await invoke<any>('prepare_rag_context', {
                collectionId: selectedCollectionId,
                query: userQuery,
            });

            const systemPrompt = ragResult.found
                ? `You are an AI assistant. Use the following context to answer the user's question precisely. If you cannot find the answer in the context, say you don't know based on the provided documents. Always cite sources as [Source X].\n\nCONTEXT:\n${ragResult.context}`
                : "You are an AI assistant. You could not find specific context for this question, so please answer from your general knowledge but mention that this is not in the private documents.";

            // 2. Start Streaming Generation
            // Note: generate_text emits 'generation-progress' events
            await invoke('generate_text', {
                modelName: 'llama3.2', // Should be dynamic from settings in a real app
                prompt: `${systemPrompt}\n\nUSER QUESTION: ${userQuery}\n\nAI RESPONSE:`,
            });

            // The loop in generation-progress will update currentStreamingResponse
            // When done is true, we should save the final message to the store
            // Wait, I need a callback or an effect to save when finished.
        } catch (e) {
            console.error('Ask error:', e);
            setIsGenerating(false);
        }
    };

    // Callback when generation finishes
    useEffect(() => {
        if (!isGenerating && currentStreamingResponse && activeSessionId) {
            // Save final assistant message to store
            addMessage(activeSessionId, {
                role: 'assistant',
                content: currentStreamingResponse,
                // In a real implementation we'd also store RAG metadata here (confidence, citations)
            });
            setCurrentStreamingResponse('');
        }
    }, [isGenerating]);

    return (
        <div className="flex bg-background text-text-primary h-full w-full overflow-hidden">
            {/* Left Panel: Chat Interface */}
            <div className={clsx("flex-1 flex flex-col h-full border-r border-border", selectedCitation && "w-3/5")}>

                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-1 hover:bg-surface-elevated rounded-md text-text-secondary transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex items-center gap-2">
                            <MessageSquare size={18} className="text-accent" />
                            <h2 className="font-semibold text-sm">Ask Documents</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-green-400/10 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                            <Shield size={10} /> 100% Offline
                        </div>
                        <select
                            value={selectedCollectionId}
                            onChange={(e) => setSelectedCollectionId(e.target.value)}
                            className="bg-background border border-border text-xs rounded-sm px-2 py-1 outline-none focus:ring-1 focus:ring-accent"
                        >
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeSession.messages.length === 0 && !isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center">
                                <MessageSquare size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium">Start a conversation</h3>
                                <p className="text-sm max-w-xs px-4">Ask any question about the documents in this collection.</p>
                            </div>
                        </div>
                    )}

                    {activeSession.messages.map((m) => (
                        <div key={m.id} className={clsx("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                            <div className={clsx(
                                "max-w-[85%] p-4 rounded-lg text-sm leading-relaxed",
                                m.role === 'user'
                                    ? "bg-accent/10 border border-accent/20 text-text-primary"
                                    : "bg-surface border border-border text-text-primary"
                            )}>
                                {m.content}
                            </div>
                            <div className="mt-1 text-[10px] text-text-muted px-1 flex items-center gap-2">
                                {m.role === 'assistant' && <span className="uppercase font-bold tracking-tighter text-accent">AI Advisor</span>}
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}

                    {(isGenerating || currentStreamingResponse) && (
                        <div className="flex flex-col items-start translate-y-0 animate-in fade-in duration-300">
                            <div className="max-w-[85%] p-4 rounded-lg text-sm leading-relaxed bg-surface border border-border text-text-primary">
                                {currentStreamingResponse || "Thinking..."}
                                {isGenerating && <span className="inline-block w-1.5 h-4 bg-accent ml-1 animate-pulse" />}
                            </div>
                            <div className="mt-1 text-[10px] text-text-muted px-1 uppercase font-bold tracking-tighter text-accent">
                                AI Advisor (Streaming)
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-surface/30">
                    <div className="relative max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your question..."
                            className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent shadow-sm"
                            disabled={isGenerating}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!query.trim() || isGenerating}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent hover:bg-accent/90 disabled:bg-surface-elevated text-white rounded-md transition-all shadow-sm"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    <div className="mt-2 text-[10px] text-center text-text-muted font-medium uppercase tracking-widest flex items-center justify-center gap-2">
                        <Shield size={10} /> Local Execution • No Data Leaves This Device
                    </div>
                </div>
            </div>

            {/* Right Panel: Source Viewer (Task 4.10) */}
            {selectedCitation && (
                <div className="w-2/5 flex flex-col h-full bg-surface border-l border-border animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Info size={16} className="text-accent" />
                            <span>Source Fragment</span>
                        </div>
                        <button onClick={() => setSelectedCitation(null)} className="p-1 hover:bg-surface-elevated rounded text-text-muted">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded uppercase tracking-wider">
                                Source {selectedCitation.id}
                            </span>
                            <span className="text-xs text-text-muted">Confidence: {(selectedCitation.score * 100).toFixed(1)}%</span>
                        </div>
                        <h4 className="text-sm font-semibold mb-2">Document: {selectedCitation.filename || 'Unknown'}</h4>
                        <div className="text-sm p-4 bg-background border border-border rounded-lg leading-relaxed text-text-secondary italic">
                            "{selectedCitation.text}"
                        </div>
                    </div>
                    <div className="p-4 border-t border-border flex justify-end">
                        <button className="text-xs text-accent font-medium flex items-center gap-1 hover:underline">
                            Open Full Document <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
