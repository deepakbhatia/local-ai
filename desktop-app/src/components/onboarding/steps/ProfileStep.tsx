import React, { useState } from 'react';
import { useOnboardingStore } from '../../../store/onboarding';

export const ProfileStep: React.FC = () => {
    const { name, organization, language, setProfile, completeOnboarding } = useOnboardingStore();
    const [localName, setLocalName] = useState(name);
    const [localOrg, setLocalOrg] = useState(organization);
    const [localLang, setLocalLang] = useState(language);

    const handleFinish = () => {
        setProfile({
            name: localName.trim(),
            organization: localOrg.trim(),
            language: localLang
        });
        completeOnboarding();
    };

    return (
        <div className="flex flex-col w-full h-full animate-in slide-in-from-right-8 fade-in duration-300">
            <div className="mb-12">
                <h2 className="text-3xl font-semibold mb-3">Almost done.</h2>
                <p className="text-text-secondary">
                    Just a few details to personalize your experience. No account is created.
                </p>
            </div>

            <div className="space-y-6 max-w-md w-full mx-auto flex-1">

                <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary block">
                        Your Name <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        className="w-full bg-surface-elevated border border-border rounded-md px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="How should the AI address you?"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary block">
                        Organization <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={localOrg}
                        onChange={(e) => setLocalOrg(e.target.value)}
                        className="w-full bg-surface-elevated border border-border rounded-md px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Used for document templates"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary block">
                        Interface Language
                    </label>
                    <select
                        value={localLang}
                        onChange={(e) => setLocalLang(e.target.value)}
                        className="w-full bg-surface-elevated border border-border rounded-md px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent appearance-none"
                    >
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="es">Español</option>
                        <option value="pt">Português</option>
                        <option value="ar">العربية</option>
                        <option value="ja">日本語</option>
                    </select>
                </div>

            </div>

            <div className="flex justify-end items-center mt-8 border-t border-border pt-6">
                <button
                    onClick={handleFinish}
                    className="px-8 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors"
                >
                    Finish Setup
                </button>
            </div>
        </div>
    );
};
