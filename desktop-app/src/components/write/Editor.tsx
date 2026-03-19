import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { Sparkles, X, Check } from 'lucide-react';

interface EditorProps {
    content: string;
    onUpdate: (html: string) => void;
    contextDocIds: string[];
    vertical: string;
}

export const Editor: React.FC<EditorProps> = ({ content, onUpdate, contextDocIds, vertical }) => {
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown,
            Placeholder.configure({
                placeholder: "Start writing, or use AI tools...",
            })
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onUpdate(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-invert focus:outline-none max-w-none min-h-[500px] text-text-primary p-4 leading-relaxed font-sans selection:bg-accent/20',
            }
        },
    });

    const handleAccept = () => {
        if (suggestion) {
            editor?.commands.insertContent(suggestion);
            setSuggestion(null);
        }
    };

    const handleReject = () => {
        setSuggestion(null);
    };

    const executeCommand = async (command: 'expand' | 'rewrite' | 'summarize' | 'extract') => {
        if (!editor || isThinking) return;

        const selection = editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
        );

        setIsThinking(true);
        setSuggestion(null);

        let fullResponse = "";
        const unlisten = await listen<{ response: string, done: boolean }>('generation-progress', (event) => {
            if (event.payload.done) {
                setIsThinking(false);
            } else {
                fullResponse += event.payload.response;
                setSuggestion(fullResponse);
            }
        });

        try {
            const tone = vertical === 'legal' ? 'Legal Advisor' :
                vertical === 'medical' ? 'Medical Researcher' :
                    vertical === 'finance' ? 'Financial Analyst' : 'Professional Writer';

            let prompt = `You are a ${tone}. `;
            if (contextDocIds.length > 0) {
                prompt += `Use the information from context documents (IDs: ${contextDocIds.join(', ')}) to aid your task. `;
            }

            if (command === 'rewrite') {
                prompt += `Rewrite the following text to be more formal and professional: "${selection}"`;
            } else if (command === 'expand') {
                prompt += `Expand on the following text with more detail: "${selection}"`;
            }

            await invoke('generate_text', {
                modelName: 'llama3.2',
                prompt: prompt,
            });
        } catch (e) {
            console.error(e);
            setIsThinking(false);
        }

        unlisten();
    };

    useEffect(() => {
        if (editor && content !== editor.getHTML() && !editor.isFocused) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="relative flex flex-col gap-4">
            <div className="flex bg-surface border border-border rounded-lg p-2 gap-2 shadow-sm sticky top-0 z-10">
                <button
                    onClick={() => executeCommand('expand')}
                    disabled={isThinking}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
                >
                    Expand
                </button>
                <button
                    onClick={() => executeCommand('rewrite')}
                    disabled={isThinking}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
                >
                    Rewrite
                </button>
            </div>

            <div className="relative border border-border rounded-lg bg-surface/30 min-h-[500px]">
                <EditorContent editor={editor} />

                {suggestion && (
                    <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300 mx-4 mb-4">
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase text-accent tracking-widest">
                            <Sparkles size={12} className={isThinking ? "animate-spin" : ""} /> AI Suggestion {isThinking && "(Thinking...)"}
                        </div>
                        <div className="text-sm text-text-secondary italic mb-4 whitespace-pre-wrap">
                            {suggestion}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAccept} className="px-3 py-1.5 bg-accent text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1">
                                <Check size={12} /> Accept
                            </button>
                            <button onClick={handleReject} className="px-3 py-1.5 border border-border rounded text-[10px] font-bold uppercase text-text-muted transition-colors flex items-center gap-1">
                                <X size={12} /> Reject
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

