import { create } from 'zustand';

type StartupStage = 'idle' | 'starting-ollama' | 'waiting-ollama' | 'ready' | 'error';

interface StartupState {
    stage: StartupStage;
    error: string | null;
    setStage: (stage: StartupStage) => void;
    setError: (error: string) => void;
}

export const useStartupStore = create<StartupState>()((set) => ({
    stage: 'idle',
    error: null,
    setStage: (stage) => set({ stage }),
    setError: (error) => set({ stage: 'error', error }),
}));
