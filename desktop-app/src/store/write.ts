import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Draft {
    id: string;
    title: string;
    content: string; // HTML format for TipTap
    template?: string;
    contextDocs: string[]; // List of doc ids added to current context
    createdAt: number;
    updatedAt: number;
}

interface WriteState {
    drafts: Draft[];
    activeDraftId: string | null;

    // Actions
    createDraft: (title?: string, template?: string) => string;
    updateDraft: (id: string, updates: Partial<Draft>) => void;
    deleteDraft: (id: string) => void;
    setActiveDraft: (id: string | null) => void;
    addDocToContext: (draftId: string, docId: string) => void;
    removeDocFromContext: (draftId: string, docId: string) => void;
}

export const useWriteStore = create<WriteState>()(
    persist(
        (set) => ({
            drafts: [],
            activeDraftId: null,

            createDraft: (title, template) => {
                const id = crypto.randomUUID();
                const newDraft: Draft = {
                    id,
                    title: title || 'Untitled Draft',
                    content: '',
                    template,
                    contextDocs: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                set((state) => ({
                    drafts: [newDraft, ...state.drafts],
                    activeDraftId: id,
                }));
                return id;
            },

            updateDraft: (id, updates) => set((state) => ({
                drafts: state.drafts.map((d) =>
                    d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
                ),
            })),

            deleteDraft: (id) => set((state) => ({
                drafts: state.drafts.filter((d) => d.id !== id),
                activeDraftId: state.activeDraftId === id ? null : state.activeDraftId,
            })),

            setActiveDraft: (id) => set({ activeDraftId: id }),

            addDocToContext: (draftId, docId) => set((state) => ({
                drafts: state.drafts.map((d) =>
                    d.id === draftId && !d.contextDocs.includes(docId)
                        ? { ...d, contextDocs: [...d.contextDocs, docId], updatedAt: Date.now() }
                        : d
                ),
            })),

            removeDocFromContext: (draftId, docId) => set((state) => ({
                drafts: state.drafts.map((d) =>
                    d.id === draftId
                        ? { ...d, contextDocs: d.contextDocs.filter(id => id !== docId), updatedAt: Date.now() }
                        : d
                ),
            })),
        }),
        {
            name: 'localmind-write-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
