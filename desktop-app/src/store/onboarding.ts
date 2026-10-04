import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Vertical = 'general' | 'legal' | 'medical' | 'finance' | 'research' | 'consulting';
export type HardwareTier = 0 | 1 | 2 | 3;

interface OnboardingState {
    completed: boolean;
    step: number;
    vertical: Vertical;
    hardwareTier: HardwareTier | null;
    selectedModelId: string | null;
    name: string;
    organization: string;
    language: string;

    // Actions
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    setVertical: (vertical: Vertical) => void;
    setHardwareTier: (tier: HardwareTier) => void;
    setSelectedModelId: (id: string) => void;
    setProfile: (profile: { name?: string; organization?: string; language?: string }) => void;
    completeOnboarding: () => void;
    resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set) => ({
            completed: false,
            step: 1,
            vertical: 'legal',
            hardwareTier: null,
            selectedModelId: null,
            name: '',
            organization: '',
            language: 'en',

            setStep: (step) => set({ step }),
            nextStep: () => set((state) => ({ step: state.step + 1 })),
            prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
            setVertical: (vertical) => set({ vertical }),
            setHardwareTier: (hardwareTier) => set({ hardwareTier }),
            setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
            setProfile: (profile) => set((state) => ({ ...state, ...profile })),
            completeOnboarding: () => set({ completed: true }),
            resetOnboarding: () => set({
                completed: false,
                step: 1,
                vertical: 'legal',
                hardwareTier: null,
                selectedModelId: null,
                name: '',
                organization: '',
                language: 'en'
            }),
        }),
        {
            name: 'localmind-onboarding-storage',
            storage: createJSONStorage(() => localStorage),
            // In a real app we'd map this to Tauri SQL, but localStorage is fine for early MVP setup
        }
    )
);
