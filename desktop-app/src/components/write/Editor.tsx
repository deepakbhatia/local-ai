import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { MathExtension } from '@aarkue/tiptap-math-extension';
import 'katex/dist/katex.min.css';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import {
    Sparkles, X, Check, RotateCcw,
    Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote,
    Minus, Code, Undo, Redo,
    Image as ImageIcon, Table as TableIcon, Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
    AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { clsx } from 'clsx';

interface EditorProps {
    content: string;
    onUpdate: (html: string) => void;
    contextDocIds: string[];
    vertical: string;
    modelName?: string;
    collectionId?: string;
}

type AiCommand = 'expand' | 'rewrite' | 'cite' | 'summarize';

export const Editor: React.FC<EditorProps> = ({ content, onUpdate, contextDocIds, vertical, modelName, collectionId }) => {
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [activeCommand, setActiveCommand] = useState<AiCommand | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
    const [hasSelection, setHasSelection] = useState(false);
    const editorWrapRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'Start writing… Select text to reveal AI tools.' }),
            MathExtension.configure({ evaluation: false }),
            Image.configure({ inline: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Superscript,
            Subscript,
            Link.configure({ openOnClick: false }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onUpdate(editor.getHTML());
            const text = editor.state.doc.textContent;
            setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to } = editor.state.selection;
            const selected = from !== to;
            setHasSelection(selected);

            if (selected && editorWrapRef.current) {
                const domSel = window.getSelection();
                if (domSel && domSel.rangeCount > 0) {
                    const range = domSel.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const wrapRect = editorWrapRef.current.getBoundingClientRect();
                    setBubblePos({
                        top: rect.top - wrapRect.top - 44,    // 44px above selection
                        left: rect.left - wrapRect.left + rect.width / 2,
                    });
                }
            } else {
                setBubblePos(null);
            }
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-invert focus:outline-none max-w-none text-[#F0F0F2] leading-[1.75]',
                style: 'min-height: 420px; font-family: "DM Sans", system-ui, sans-serif; font-size: 13px;',
            },
        },
    });

    const handleAccept = () => {
        if (suggestion && editor) {
            const { from, to } = editor.state.selection;
            if (from !== to) {
                editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, suggestion).run();
            } else {
                editor.commands.insertContent(suggestion);
            }
            setSuggestion(null);
            setActiveCommand(null);
        }
    };

    const handleReject = () => { setSuggestion(null); setActiveCommand(null); };

    const executeCommand = useCallback(async (command: AiCommand) => {
        if (!editor || isThinking) return;
        const selectedText = editor.state.doc.textBetween(
            editor.state.selection.from, editor.state.selection.to, ' '
        );
        if (!selectedText && command !== 'summarize') return;

        setIsThinking(true);
        setActiveCommand(command);
        setSuggestion(null);
        setBubblePos(null);

        let fullResponse = '';
        const unlisten = await listen<{ response: string; done: boolean }>('generation-progress', (event) => {
            if (event.payload.done) setIsThinking(false);
            else {
                fullResponse += event.payload.response;
                setSuggestion(fullResponse);
            }
        });

        try {
            const activeModel = modelName || 'qwen3.5:4b';
            let contextText = '';
            if (collectionId && contextDocIds.length > 0) {
                try {
                    const ragResult = await invoke<{ found: boolean; context: string }>('prepare_rag_context', {
                        collectionId,
                        query: selectedText || 'key facts from the matter documents',
                    });
                    if (ragResult.found) contextText = ragResult.context;
                } catch (ragErr) {
                    console.error('Write RAG context failed', ragErr);
                }
            }

            const tone = vertical === 'legal' ? 'legal drafting assistant for a solo lawyer or small firm' :
                vertical === 'medical' ? 'Medical Researcher' :
                    vertical === 'finance' ? 'Financial Analyst' : 'Professional Writer';
            let prompt = `You are a ${tone}. Ground claims in the CONTEXT when provided. If context is missing, say so. Return only the requested text.\n\n`;
            if (contextText) prompt += `CONTEXT:\n${contextText}\n\n`;

            if (command === 'expand') prompt += `Expand the following text with more specific detail and professional prose: "${selectedText}"`;
            else if (command === 'rewrite') prompt += `Rewrite the following text to be more formal and precise: "${selectedText}"`;
            else if (command === 'cite') prompt += `Suggest a citation or supporting argument from CONTEXT for the following claim: "${selectedText}"`;
            else if (command === 'summarize') prompt += `Summarise the key facts from CONTEXT as a concise bulleted list.`;

            await invoke('generate_text', { modelName: activeModel, prompt });
        } catch (e) {
            console.error(e);
            setIsThinking(false);
        }
        unlisten();
    }, [editor, isThinking, vertical, contextDocIds, modelName, collectionId]);

    useEffect(() => {
        if (editor && content !== editor.getHTML() && !editor.isFocused) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) return null;

    const ToolbarBtn = ({ onClick, active, title, children }: {
        onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
    }) => (
        <button
            onClick={onClick}
            title={title}
            className={clsx(
                "w-7 h-7 flex items-center justify-center rounded transition-all text-[#9A9BA8]",
                active ? "bg-[rgba(79,142,247,0.15)] text-[#4F8EF7]" : "hover:bg-white/5 hover:text-[#F0F0F2]"
            )}
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-col h-full min-h-0 relative">
            {/* Formatting toolbar */}
            <div className="px-4 py-2 border-b border-white/[0.07] flex items-center gap-0.5 bg-[#16181C] flex-wrap flex-shrink-0">
                <ToolbarBtn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
                    <Bold size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
                    <Italic size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>
                    <Code size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Superscript" onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')}>
                    <SuperscriptIcon size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Subscript" onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')}>
                    <SubscriptIcon size={13} />
                </ToolbarBtn>
                <div className="w-px h-5 bg-white/[0.07] mx-1" />
                <ToolbarBtn title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
                    <Heading1 size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
                    <Heading2 size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
                    <List size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
                    <ListOrdered size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
                    <Quote size={13} />
                </ToolbarBtn>
                <div className="w-px h-5 bg-white/[0.07] mx-1" />
                <ToolbarBtn title="Align Left" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>
                    <AlignLeft size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Align Center" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>
                    <AlignCenter size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Align Right" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>
                    <AlignRight size={13} />
                </ToolbarBtn>
                <div className="w-px h-5 bg-white/[0.07] mx-1" />
                <ToolbarBtn title="Insert Image" onClick={() => { const url = window.prompt('URL'); if (url) editor.chain().focus().setImage({ src: url }).run(); }}>
                    <ImageIcon size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Insert Table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                    <TableIcon size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule()?.run()}>
                    <Minus size={13} />
                </ToolbarBtn>
                <div className="w-px h-5 bg-white/[0.07] mx-1" />
                <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
                    <Undo size={13} />
                </ToolbarBtn>
                <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
                    <Redo size={13} />
                </ToolbarBtn>
                <span className="ml-auto text-[10px] text-[#5A5B66]">{wordCount} words</span>
            </div>

            {/* Editor area with floating AI toolbar */}
            <div className="flex-1 overflow-y-auto relative" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}>
                <div ref={editorWrapRef} className="relative px-8 py-6">
                    {/* Floating AI bubble menu on selection */}
                    {hasSelection && bubblePos && !isThinking && (
                        <div
                            className="absolute z-50 flex items-center gap-0.5 bg-[#1E2026] border border-white/[0.12] rounded-md px-1 py-0.5 shadow-xl pointer-events-auto"
                            style={{ top: bubblePos.top, left: bubblePos.left, transform: 'translateX(-50%)' }}
                        >
                            {(['expand', 'rewrite', 'cite'] as AiCommand[]).map((cmd) => (
                                <button
                                    key={cmd}
                                    onMouseDown={(e) => { e.preventDefault(); executeCommand(cmd); }}
                                    className={clsx(
                                        "px-2 py-1 rounded text-[10px] font-medium capitalize transition-all",
                                        cmd === 'expand'
                                            ? "bg-[#4F8EF7] text-white"
                                            : "text-[#9A9BA8] hover:bg-[rgba(79,142,247,0.12)] hover:text-[#4F8EF7]"
                                    )}
                                >
                                    {cmd.charAt(0).toUpperCase() + cmd.slice(1)}
                                </button>
                            ))}
                            <div className="w-px h-4 bg-white/[0.07] mx-0.5" />
                            <div className="px-1.5 py-0.5 flex items-center gap-1 text-[10px] text-[#5A5B66]">
                                <Sparkles size={9} /> AI
                            </div>
                        </div>
                    )}
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* Suggestion bar — slides up from bottom per spec */}
            {(suggestion || (isThinking && activeCommand)) && (
                <div className="mx-6 mb-4 bg-[#1E2026] border border-[rgba(79,142,247,0.3)] rounded-lg overflow-hidden animate-in slide-in-from-bottom-3 duration-200 shadow-lg flex-shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.07] bg-[rgba(79,142,247,0.08)]">
                        <Sparkles size={10} className={clsx("text-[#4F8EF7]", isThinking && "animate-spin")} />
                        <span className="text-[10px] text-[#4F8EF7] font-medium uppercase tracking-[0.06em]">
                            AI suggestion · {activeCommand || 'thinking'}{isThinking && '…'}
                        </span>
                    </div>
                    <div className="px-3 py-2.5 text-[12px] leading-[1.6] text-[#9A9BA8] whitespace-pre-wrap">
                        {suggestion}
                        {isThinking && <span className="inline-block w-0.5 h-3.5 bg-[#4F8EF7] ml-0.5 align-middle animate-pulse" />}
                    </div>
                    <div className="flex gap-1.5 px-3 pb-2.5">
                        <button onClick={handleAccept} disabled={isThinking} className="flex items-center gap-1 px-3 py-1 bg-[#4F8EF7] text-white rounded text-[11px] font-medium disabled:opacity-40 transition-opacity">
                            <Check size={11} /> Accept
                        </button>
                        {activeCommand && (
                            <button onClick={() => executeCommand(activeCommand)} disabled={isThinking} className="flex items-center gap-1 px-3 py-1 border border-white/[0.12] text-[#9A9BA8] rounded text-[11px] hover:bg-white/5 disabled:opacity-40 transition-all">
                                <RotateCcw size={11} /> Retry
                            </button>
                        )}
                        <button onClick={handleReject} className="flex items-center gap-1 px-3 py-1 border border-white/[0.12] text-[#9A9BA8] rounded text-[11px] hover:bg-white/5 transition-all">
                            <X size={11} /> Discard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
