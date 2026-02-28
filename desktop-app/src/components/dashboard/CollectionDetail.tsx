import React, { useState, useEffect } from 'react';
import { useCollectionsStore } from '../../store/collections';
import { ArrowLeft, UploadCloud, FileText, Settings, Plus } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
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
    const incrementDocCount = useCollectionsStore(state => state.incrementDocCount);

    const [isHovering, setIsHovering] = useState(false);
    const [documents, setDocuments] = useState<{ path: string; name: string; status: string }[]>([]);

    useEffect(() => {
        let unlistenDrop: UnlistenFn;
        let unlistenHover: UnlistenFn;
        let unlistenCancel: UnlistenFn;

        const setupListeners = async () => {
            unlistenDrop = await listen<{ paths: string[] }>('tauri://drop', (event) => {
                setIsHovering(false);
                handleFiles(event.payload.paths);
            });

            unlistenHover = await listen('tauri://drop-hover', () => {
                setIsHovering(true);
            });

            unlistenCancel = await listen('tauri://drop-cancelled', () => {
                setIsHovering(false);
            });
        };

        setupListeners();

        return () => {
            if (unlistenDrop) unlistenDrop();
            if (unlistenHover) unlistenHover();
            if (unlistenCancel) unlistenCancel();
        };
    }, [collectionId]);

    if (!collection) return null;

    const handleFiles = async (paths: string[]) => {
        const newDocs = paths.map(p => {
            const parts = p.split(/[\/\\]/);
            const name = parts[parts.length - 1];
            return { path: p, name, status: 'Processing...' };
        });
        setDocuments(prev => [...prev, ...newDocs]);

        for (const doc of newDocs) {
            try {
                if (doc.path.toLowerCase().endsWith('.docx')) {
                    setDocsStatus(doc.path, 'Extracting DOCX...');
                    const bytes = await readFile(doc.path);
                    await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
                    setDocsStatus(doc.path, 'Chunked (JS)');
                    incrementDocCount(collectionId);
                } else {
                    // Send to Rust
                    await invoke('process_document', { collectionId, filePath: doc.path });
                    setDocsStatus(doc.path, 'Indexed');
                    incrementDocCount(collectionId);
                }
            } catch (e: any) {
                console.error("Processing error:", e);
                setDocsStatus(doc.path, 'Error');
            }
        }
    };

    const setDocsStatus = (path: string, status: string) => {
        setDocuments(prev => prev.map(d => d.path === path ? { ...d, status } : d));
    };

    const handlePickFile = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: 'Documents',
                    extensions: ['pdf', 'txt', 'md', 'docx']
                }]
            });

            if (Array.isArray(selected)) {
                handleFiles(selected);
            } else if (selected) {
                handleFiles([selected]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
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

            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4">
                    <button
                        onClick={handlePickFile}
                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white font-medium rounded-sm transition-colors text-sm shadow-sm"
                    >
                        <Plus size={16} /> Add Documents
                    </button>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-surface-elevated text-text-primary font-medium rounded-sm transition-colors text-sm">
                    <Settings size={16} /> Collection Settings
                </button>
            </div>

            <div
                className={clsx(
                    "flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 transition-colors",
                    isHovering ? "border-accent bg-accent/5" : "border-border bg-surface",
                    documents.length > 0 && "justify-start border-solid border-border"
                )}
            >
                {documents.length === 0 ? (
                    <div className="text-center pointer-events-none">
                        <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
                            <UploadCloud size={32} />
                        </div>
                        <h3 className="text-xl font-medium mb-2">Drag & Drop files here</h3>
                        <p className="text-text-secondary max-w-sm mb-6">
                            Support for PDF, TXT, MD, and DOCX files. Documents will be processed and stored locally.
                        </p>
                    </div>
                ) : (
                    <div className="w-full">
                        <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4 px-2">Documents ({documents.length})</h3>
                        <div className="space-y-2 w-full">
                            {documents.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-text-muted" />
                                        <div>
                                            <div className="font-medium text-sm">{doc.name}</div>
                                            <div className="text-xs text-text-muted font-mono">{doc.path}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-medium text-accent px-2 py-1 bg-accent/10 rounded">{doc.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

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
