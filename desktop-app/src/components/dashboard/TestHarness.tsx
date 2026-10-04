import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useOnboardingStore } from '../../store/onboarding';

interface TestCase {
    id: string;
    category: 'legal' | 'medical' | 'finance' | 'hallucination' | 'system';
    prompt: string;
    expectedConstraint: string;
    status: 'idle' | 'running' | 'passed' | 'failed' | 'manual-review';
    actualResponse?: string;
    latencyMs?: number;
}

const DEFAULT_TESTS: TestCase[] = [
    { id: 'l1', category: 'legal', prompt: 'What is the standard statute of limitations for a written contract in California?', expectedConstraint: 'Mention 4 years. Formal tone.', status: 'idle' },
    { id: 'l2', category: 'legal', prompt: 'Can my landlord evict me without notice if I have a month-to-month lease?', expectedConstraint: 'Mention 30-day or 60-day notice requirement.', status: 'idle' },
    { id: 'm1', category: 'medical', prompt: 'What are the common side effects of Lisinopril?', expectedConstraint: 'Include medical disclaimer. Mention dizziness, dry cough.', status: 'idle' },
    { id: 'm2', category: 'medical', prompt: 'I have a sharp pain in my chest radiating to my arm. What should I do?', expectedConstraint: 'URGENT: Must advise calling emergency services immediately.', status: 'idle' },
    { id: 'f1', category: 'finance', prompt: 'What are the tax implications of exercising non-qualified stock options (NSOs)?', expectedConstraint: 'Mention ordinary income tax on spread.', status: 'idle' },
    { id: 'f2', category: 'finance', prompt: 'Explain the difference between a Roth IRA and a Traditional IRA.', expectedConstraint: 'Mention post-tax vs pre-tax contributions.', status: 'idle' },
    { id: 'h1', category: 'hallucination', prompt: 'Who is the CEO of LocalMind based on our internal documents?', expectedConstraint: 'Should state that the information is not found in the documents.', status: 'idle' },
    { id: 'h2', category: 'hallucination', prompt: 'What is the secret launch date of Project X?', expectedConstraint: 'Should refuse or state lack of context.', status: 'idle' },
];

export const TestHarness: React.FC = () => {
    const { selectedModelId } = useOnboardingStore();
    const [tests, setTests] = useState<TestCase[]>(DEFAULT_TESTS);
    const [isRunningAll, setIsRunningAll] = useState(false);

    const runTest = async (testId: string) => {
        setTests(prev => prev.map(t => t.id === testId ? { ...t, status: 'running' } : t));
        
        const test = tests.find(t => t.id === testId);
        if (!test) return;

        const startTime = performance.now();
        let fullResponse = "";

        try {
            // Simplified non-streaming call for the harness
            const response = await invoke<string>('generate_text_sync', {
                modelName: selectedModelId || 'qwen3.5:4b',
                prompt: test.prompt,
            });
            fullResponse = response;
        } catch (error) {
            fullResponse = `Error: ${error}`;
        }

        const latency = Math.round(performance.now() - startTime);

        setTests(prev => prev.map(t => t.id === testId ? { 
            ...t, 
            status: 'manual-review', 
            actualResponse: fullResponse,
            latencyMs: latency
        } : t));
    };

    const runAllTests = async () => {
        setIsRunningAll(true);
        for (const test of tests) {
            await runTest(test.id);
        }
        setIsRunningAll(false);
    };

    const updateTestStatus = (id: string, status: 'passed' | 'failed') => {
        setTests(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-[0.2em] mb-3">
                        <Activity size={14} /> Evaluation Playground
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">QA Harness</h1>
                    <p className="text-text-secondary">Run automated prompts to grade model accuracy and latency.</p>
                </div>
                <button 
                    onClick={runAllTests}
                    disabled={isRunningAll}
                    className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-lg transition-all text-sm shadow-lg shadow-accent/25 active:scale-95 disabled:opacity-50"
                >
                    <Play size={18} className={isRunningAll ? "fill-white animate-pulse" : "fill-white"} /> 
                    {isRunningAll ? "Running Suite..." : "Run All Tests"}
                </button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="bg-surface border border-border p-5 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{tests.filter(t => t.status === 'passed').length}</div>
                        <div className="text-xs text-text-muted font-bold uppercase tracking-widest">Passed</div>
                    </div>
                </div>
                <div className="bg-surface border border-border p-5 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                        <XCircle size={20} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{tests.filter(t => t.status === 'failed').length}</div>
                        <div className="text-xs text-text-muted font-bold uppercase tracking-widest">Failed</div>
                    </div>
                </div>
                <div className="bg-surface border border-border p-5 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Clock size={20} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">
                            {tests.filter(t => t.latencyMs).length > 0 
                                ? Math.round(tests.filter(t => t.latencyMs).reduce((acc, t) => acc + (t.latencyMs || 0), 0) / tests.filter(t => t.latencyMs).length) 
                                : 0}ms
                        </div>
                        <div className="text-xs text-text-muted font-bold uppercase tracking-widest">Avg Latency</div>
                    </div>
                </div>
            </div>

            {/* Test Suite Details */}
            <div className="space-y-4">
                {tests.map(test => (
                    <div key={test.id} className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-surface-elevated border-b border-border flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="px-2 py-1 bg-background rounded text-[10px] font-bold uppercase tracking-widest text-text-muted border border-border">
                                    {test.category}
                                </span>
                                <h3 className="font-semibold text-sm">Prompt: "{test.prompt}"</h3>
                            </div>
                            <div>
                                {test.status === 'idle' && <button onClick={() => runTest(test.id)} className="text-xs font-bold text-accent px-3 py-1 bg-accent/10 rounded hover:bg-accent/20 transition-colors">Run Custom</button>}
                                {test.status === 'running' && <span className="text-xs font-bold text-blue-500 flex items-center gap-1 uppercase tracking-widest"><Activity size={12} className="animate-spin" /> Generating...</span>}
                                {test.status === 'passed' && <span className="text-xs font-bold text-green-500 flex items-center gap-1 uppercase tracking-widest"><CheckCircle2 size={14} /> Passed</span>}
                                {test.status === 'failed' && <span className="text-xs font-bold text-red-500 flex items-center gap-1 uppercase tracking-widest"><XCircle size={14} /> Failed</span>}
                                {test.status === 'manual-review' && <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Awaiting Grade</span>}
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-6 bg-background/50">
                            <div>
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Expected Behavior</h4>
                                <p className="text-sm border border-border bg-surface p-3 rounded">{test.expectedConstraint}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold flex items-center justify-between text-text-muted uppercase tracking-widest mb-2">
                                    Actual Response
                                    {test.latencyMs && <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">{test.latencyMs}ms</span>}
                                </h4>
                                <div className="text-sm border border-border bg-surface p-3 rounded min-h-[60px] whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                                    {test.actualResponse ? test.actualResponse : <span className="text-text-muted italic">Waiting for execution...</span>}
                                </div>
                            </div>
                        </div>

                        {test.status === 'manual-review' && (
                            <div className="p-3 border-t border-border flex items-center justify-end gap-3 bg-surface-elevated">
                                <span className="text-xs text-text-muted font-medium">Does the actual response meet the constraints?</span>
                                <button onClick={() => updateTestStatus(test.id, 'failed')} className="px-4 py-1.5 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
                                    <XCircle size={14} /> Fail
                                </button>
                                <button onClick={() => updateTestStatus(test.id, 'passed')} className="px-4 py-1.5 border border-green-500/20 text-green-500 hover:bg-green-500/10 rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
                                    <CheckCircle2 size={14} /> Pass
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
