import React, { useState, useEffect } from 'react';
import { useCollectionsStore, CollectionDocument } from '../../store/collections';
import { ArrowLeft, UploadCloud, Settings, Plus, Trash2, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { listen } from '@tauri-apps/api/event';
import { clsx } from 'clsx';
import { invoke } from '@tauri-apps/api/core';
import mammoth from 'mammoth';
import { readFile } from '@tauri-apps/plugin-fs';

interface Props {
    collectionId: string;
    onBack: () => void;
}

export const CollectionDetail: React.FC<Props> = ({ collectionId, onBack }) => {
    const collection = useCollectionsStore(state =>
        state.collections.find(c => c.id === collectionId)
    );
    const { addDocument, updateDocumentStatus, removeDocument } = useCollectionsStore();

    const [docProgress, setDocProgress] = useState<Record<string, { stage: string; done: number; total: number }>>({});
    const [isHovering, setIsHovering] = useState(false);
    const [processingPaths, setProcessingPaths] = useState<Set<string>>(new Set());

    // Persisted documents come from the store
    const documents: CollectionDocument[] = collection?.documents ?? [];

    useEffect(() => {
        const unlistenProgress = listen<{
            doc_id: string; filename: string; stage: string;
            chunks_done: number; chunks_total: number; error?: string;
        }>('indexing-progress', (event) => {
            const { doc_id, stage, chunks_done, chunks_total } = event.payload;
            setDocProgress(prev => ({
                ...prev,
                [doc_id]: { stage, done: chunks_done, total: chunks_total }
            }));
            // Sync done status back to the store
            if (stage === 'done') {
                updateDocumentStatus(collectionId, doc_id, 'Indexed ✓');
            }
        });

        // Tauri v2 drag-drop
        const unlistenDrop = getCurrentWebview().onDragDropEvent((event) => {
            const payload = event.payload;
            if (payload.type === 'enter' || payload.type === 'over') {
                setIsHovering(true);
            } else if (payload.type === 'drop') {
                setIsHovering(false);
                if (payload.paths && payload.paths.length > 0) {
                    handleFiles(payload.paths);
                }
            } else if (payload.type === 'leave') {
                setIsHovering(false);
            }
        });

        return () => {
            unlistenProgress.then((f: () => void) => f());
            unlistenDrop.then((f: () => void) => f());
        };
    }, [collectionId]);

    if (!collection) return null;

    const statusLabel = (doc: CollectionDocument): string => {
        const prog = docProgress[doc.id];
        if (prog) {
            if (prog.stage === 'embedding') return `Embedding ${prog.done}/${prog.total}`;
            if (prog.stage === 'done') return 'Indexed ✓';
            return prog.stage.charAt(0).toUpperCase() + prog.stage.slice(1) + '...';
        }
        return doc.status || 'Queued';
    };

    const handleFiles = async (paths: string[]) => {
        // Filter out already-processing or already-indexed paths
        const newPaths = paths.filter(p => !processingPaths.has(p));
        if (newPaths.length === 0) return;

        setProcessingPaths(prev => new Set([...prev, ...newPaths]));

        for (const filePath of newPaths) {
            const parts = filePath.split(/[/\\]/);
            const name = parts[parts.length - 1];

            // Add a placeholder entry immediately so the user sees it
            const tempId = `tmp-${Date.now()}-${name}`;
            const docEntry: CollectionDocument = {
                id: tempId,
                name,
                path: filePath,
                status: 'Processing...',
                addedAt: Date.now(),
            };
            addDocument(collectionId, docEntry);

            try {
                if (filePath.toLowerCase().endsWith('.docx')) {
                    updateDocumentStatus(collectionId, tempId, 'Extracting DOCX...');
                    const bytes = await readFile(filePath);
                    await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
                    updateDocumentStatus(collectionId, tempId, 'Indexed ✓');
                } else {
                    updateDocumentStatus(collectionId, tempId, 'Processing...');
                    const result = await invoke<{ id: string; chunk_count: number }>('process_and_index_document', {
                        collectionId,
                        filePath,
                        embeddingModel: 'nomic-embed-text'
                    });
                    // Replace the temp entry with the real doc_id
                    removeDocument(collectionId, tempId);
                    addDocument(collectionId, {
                        id: result.id,
                        name,
                        path: filePath,
                        status: 'Indexed ✓',
                        addedAt: Date.now(),
                    });
                }
            } catch (e: any) {
                console.error('Processing error:', e);
                updateDocumentStatus(collectionId, tempId, 'Error');
            }
        }

        setProcessingPaths(prev => {
            const next = new Set(prev);
            newPaths.forEach(p => next.delete(p));
            return next;
        });
    };

    const handlePickFile = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{ name: 'Documents', extensions: ['pdf', 'txt', 'md', 'docx'] }]
            });
            if (Array.isArray(selected)) handleFiles(selected);
            else if (selected) handleFiles([selected]);
        } catch (e) { console.error(e); }
    };

    const getStatusIcon = (doc: CollectionDocument) => {
        const s = statusLabel(doc);
        if (s.includes('✓')) return <CheckCircle size={16} className="text-green-400 flex-shrink-0" />;
        if (s === 'Error') return <AlertCircle size={16} className="text-red-400 flex-shrink-0" />;
        return <Loader size={16} className="text-accent animate-spin flex-shrink-0" />;
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-surface-elevated rounded-md transition-colors text-text-secondary"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">{collection.name}</h1>
                    <p className="text-text-secondary">{collection.description}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={handlePickFile}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors text-sm shadow-sm"
                >
                    <Plus size={16} /> Add Documents
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-surface-elevated text-text-primary font-medium rounded-sm transition-colors text-sm">
                    <Settings size={16} /> Collection Settings
                </button>
            </div>

            {/* Drop zone / document list */}
            <div
                className={clsx(
                    "flex-1 border-2 border-dashed rounded-lg flex flex-col transition-colors",
                    isHovering ? "border-accent bg-accent/5" : "border-border bg-surface",
                    documents.length > 0 && "border-solid border-border"
                )}
            >
                {documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center pointer-events-none">
                        <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
                            <UploadCloud size={32} />
                        </div>
                        <h3 className="text-xl font-medium mb-2">Drag & Drop files here</h3>
                        <p className="text-text-secondary max-w-sm">
                            Support for PDF, TXT, MD, and DOCX files. Documents will be processed and stored locally.
                        </p>
                    </div>
                ) : (
                    <div className="w-full p-4">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">
                                Documents ({documents.length})
                            </h3>
                            <span className="text-xs text-red-400">
                                {documents.filter(d => d.status === 'Error').length > 0 &&
                                    `${documents.filter(d => d.status === 'Error').length} failed`
                                }
                            </span>
                        </div>

                        <div className="space-y-2 w-full">
                            {documents.map((doc) => {
                                const label = statusLabel(doc);
                                const isError = label === 'Error';
                                const isDone = label.includes('✓');
                                const badgeClass = isError
                                    ? 'text-red-400 bg-red-400/10'
                                    : isDone
                                        ? 'text-green-400 bg-green-400/10'
                                        : 'text-accent bg-accent/10';

                                return (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-background border border-border rounded-lg group">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {getStatusIcon(doc)}
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm truncate">{doc.name}</div>
                                                <div className="text-xs text-text-muted font-mono truncate max-w-xs">{doc.path}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 ms-4">
                                            <span className={`text-sm font-medium px-2 py-1 rounded whitespace-nowrap ${badgeClass}`}>
                                                {label}
                                            </span>
                                            <button
                                                onClick={() => removeDocument(collectionId, doc.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-400/10 hover:text-red-400 rounded text-text-muted"
                                                title="Remove document"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Drop hint at the bottom when list has items */}
                        <button
                            onClick={handlePickFile}
                            className="mt-4 w-full py-3 border border-dashed border-border rounded-lg text-xs text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Add more documents
                        </button>
                    </div>
                )}
            </div>

            {/* Full-screen drop overlay */}
            {isHovering && (
                <div className="absolute inset-0 z-50 bg-accent/10 backdrop-blur-sm rounded-lg border-2 border-accent border-dashed flex items-center justify-center pointer-events-none">
                    <div className="bg-surface p-6 rounded-lg shadow-xl flex flex-col items-center">
                        <UploadCloud size={48} className="text-accent mb-4" />
                        <span className="text-xl font-bold">Release to Import</span>
                    </div>
                </div>
            )}
        </div>
    );
};
