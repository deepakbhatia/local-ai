import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Collection {
    id: string;
    name: string;
    description: string;
    color: string;
    documentCount: number;
    createdAt: number;
}

interface CollectionsState {
    collections: Collection[];

    // Actions
    addCollection: (name: string, description: string, color: string) => void;
    updateCollection: (id: string, updates: Partial<Collection>) => void;
    deleteCollection: (id: string) => void;
    incrementDocCount: (id: string, amount?: number) => void;
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
                    createdAt: Date.now()
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
                        createdAt: Date.now()
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
            }))
        }),
        {
            name: 'localmind-collections-storage',
            storage: createJSONStorage(() => localStorage),
            // In MVP, we use localStorage for the metadata. Actual text/vectors go to LanceDB.
        }
    )
);
