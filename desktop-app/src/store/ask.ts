import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Citation {
    id: number;
    doc_id: string;
    chunk_index: number;
    score: number;
    filename?: string;
    text?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    confidence?: 'high' | 'medium' | 'low' | 'none';
    citations?: Citation[];
}

export interface ChatSession {
    id: string;
    collectionId: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

interface AskState {
    sessions: ChatSession[];
    activeSessionId: string | null;

    // Actions
    createSession: (collectionId: string, title?: string) => string;
    addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
    clearSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
}

export const useAskStore = create<AskState>()(
    persist(
        (set) => ({
            sessions: [],
            activeSessionId: null,

            createSession: (collectionId, title) => {
                const id = crypto.randomUUID();
                const newSession: ChatSession = {
                    id,
                    collectionId,
                    title: title || 'New Chat',
                    messages: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                set((state) => ({
                    sessions: [newSession, ...state.sessions],
                    activeSessionId: id,
                }));
                return id;
            },

            addMessage: (sessionId, messageData) => {
                const id = crypto.randomUUID();
                const timestamp = Date.now();
                const newMessage: Message = { ...messageData, id, timestamp };

                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === sessionId
                            ? {
                                ...s,
                                messages: [...s.messages, newMessage],
                                updatedAt: timestamp,
                                title: s.messages.length === 0 && messageData.role === 'user'
                                    ? messageData.content.substring(0, 30) + (messageData.content.length > 30 ? '...' : '')
                                    : s.title
                            }
                            : s
                    ),
                }));
            },

            clearSession: (sessionId) => set((state) => ({
                sessions: state.sessions.map((s) =>
                    s.id === sessionId ? { ...s, messages: [], updatedAt: Date.now() } : s
                ),
            })),

            deleteSession: (sessionId) => set((state) => ({
                sessions: state.sessions.filter((s) => s.id !== sessionId),
                activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
            })),
        }),
        {
            name: 'localmind-ask-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
