import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CollectionDocument {
    id: string;        // doc_id returned by backend
    name: string;      // filename
    path: string;      // original file path
    status: string;    // 'Indexed ✓' | 'Error' | 'Processing...'
    addedAt: number;
}

export interface Collection {
    id: string;
    name: string;
    description: string;
    color: string;
    documentCount: number;
    createdAt: number;
    documents: CollectionDocument[];   // ← persisted document list
}

interface CollectionsState {
    collections: Collection[];

    // Actions
    addCollection: (name: string, description: string, color: string) => void;
    updateCollection: (id: string, updates: Partial<Collection>) => void;
    deleteCollection: (id: string) => void;
    incrementDocCount: (id: string, amount?: number) => void;

    // Document management
    addDocument: (collectionId: string, doc: CollectionDocument) => void;
    updateDocumentStatus: (collectionId: string, docId: string, status: string) => void;
    removeDocument: (collectionId: string, docId: string) => void;
}

export const useCollectionsStore = create<CollectionsState>()(
    persist(
        (set) => ({
            collections: [
                {
                    id: 'default-knowledge',
                    name: 'General Knowledge',
                    description: 'A default collection for general documents.',
                    color: 'blue',
                    documentCount: 0,
                    createdAt: Date.now(),
                    documents: [],
                }
            ],

            addCollection: (name, description, color) => set((state) => ({
                collections: [
                    ...state.collections,
                    {
                        id: crypto.randomUUID(),
                        name,
                        description,
                        color,
                        documentCount: 0,
                        createdAt: Date.now(),
                        documents: [],
                    }
                ]
            })),

            updateCollection: (id, updates) => set((state) => ({
                collections: state.collections.map(c =>
                    c.id === id ? { ...c, ...updates } : c
                )
            })),

            deleteCollection: (id) => set((state) => ({
                collections: state.collections.filter(c => c.id !== id)
            })),

            incrementDocCount: (id, amount = 1) => set((state) => ({
                collections: state.collections.map(c =>
                    c.id === id ? { ...c, documentCount: c.documentCount + amount } : c
                )
            })),

            addDocument: (collectionId, doc) => set((state) => ({
                collections: state.collections.map(c =>
                    c.id === collectionId
                        ? {
                            ...c,
                            documents: [...(c.documents ?? []).filter(d => d.path !== doc.path), doc],
                            documentCount: (c.documents ?? []).filter(d => d.path !== doc.path).length + 1,
                        }
                        : c
                )
            })),

            updateDocumentStatus: (collectionId, docId, status) => set((state) => ({
                collections: state.collections.map(c =>
                    c.id === collectionId
                        ? {
                            ...c,
                            documents: (c.documents ?? []).map(d =>
                                (d.id === docId || d.path === docId) ? { ...d, status } : d
                            )
                        }
                        : c
                )
            })),

            removeDocument: (collectionId, docId) => set((state) => ({
                collections: state.collections.map(c =>
                    c.id === collectionId
                        ? {
                            ...c,
                            documents: (c.documents ?? []).filter(d => d.id !== docId),
                            documentCount: Math.max(0, c.documentCount - 1),
                        }
                        : c
                )
            })),
        }),
        {
            name: 'localmind-collections-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
