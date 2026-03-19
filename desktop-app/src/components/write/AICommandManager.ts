import { invoke } from '@tauri-apps/api/core';

export interface AICommandResult {
    content: string;
    isSuggestion: boolean;
}

export const executeAICommand = async (
    command: 'expand' | 'rewrite' | 'summarize' | 'extract',
    selection: string,
    contextDocIds: string[],
    vertical: string
): Promise<string> => {
    // 1. Fetch context from provided document IDs
    // Since RAG is in the backend, we might need a command that takes doc IDs and a query
    // Or we just fetch all text from these docs if they are small.
    // Let's assume a backend command 'get_context_from_docs'

    let contextText = "";
    if (contextDocIds.length > 0) {
        try {
            // For MVP, we'll just use the first document's content as context or similar
            // Ideally we'd RAG across these specific docs.
            const result = await invoke<any>('prepare_rag_context', {
                collectionId: contextDocIds[0], // Using first collection for simplify
                query: selection || "writing context"
            });
            contextText = result.context;
        } catch (e) {
            console.error("Failed to fetch context", e);
        }
    }

    const tone = vertical === 'legal' ? 'Legal Advisor' :
        vertical === 'medical' ? 'Medical Researcher' :
            vertical === 'finance' ? 'Financial Analyst' : 'Professional Writer';

    let prompt = `You are a ${tone}. `;

    switch (command) {
        case 'expand':
            prompt += `Expand on the following text using the provided context. Maintain the existing tone.\n\nCONTEXT:\n${contextText}\n\nTEXT TO EXPAND:\n${selection}`;
            break;
        case 'rewrite':
            prompt += `Rewrite the following text to be more formal and professional. Use the context if relevant.\n\nCONTEXT:\n${contextText}\n\nTEXT TO REWRITE:\n${selection}`;
            break;
        case 'summarize':
            prompt += `Summarize the following context docs into a concise overview for a document.\n\nCONTEXT:\n${contextText}`;
            break;
        case 'extract':
            prompt += `Extract 5 key facts or data points from the following context and present them as a bulleted list.\n\nCONTEXT:\n${contextText}`;
            break;
    }

    // Call the streaming generator or a non-streaming version
    // For editor commands, non-streaming might be easier to insert, but let's stick to the pattern.
    // We'll use a promise-based wrapper for the event-based generation if needed.

    // For simplicity in this step, let's assume we have a non-streaming invoke or we wait for completion
    // I'll use the existing 'generate_text' and capture events.

    return prompt;
};
