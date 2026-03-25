import { describe, it, expect, beforeEach } from 'vitest';
import { useWriteStore } from './write';

describe('useWriteStore CRUD Operations', () => {
    beforeEach(() => {
        // Reset the store before each test
        useWriteStore.setState({ drafts: [], activeDraftId: null });
    });

    it('should create a new draft', () => {
        const title = 'My First Draft';
        useWriteStore.getState().createDraft(title);
        
        const state = useWriteStore.getState();
        expect(state.drafts.length).toBe(1);
        expect(state.drafts[0].title).toBe(title);
        expect(state.activeDraftId).toBe(state.drafts[0].id);
    });

    it('should read/get a draft', () => {
        const id = useWriteStore.getState().createDraft('Test Read');
        
        const state = useWriteStore.getState();
        const draft = state.drafts.find(d => d.id === id);
        
        expect(draft).toBeDefined();
        expect(draft?.title).toBe('Test Read');
    });

    it('should update a draft content', () => {
        const id = useWriteStore.getState().createDraft('To Update');
        const newContent = '<p>Updated content here</p>';
        
        useWriteStore.getState().updateDraft(id, { content: newContent });
        
        const state = useWriteStore.getState();
        const draft = state.drafts.find(d => d.id === id);
        
        expect(draft?.content).toBe(newContent);
    });

    it('should delete a draft', () => {
        const id1 = useWriteStore.getState().createDraft('Draft 1');
        const id2 = useWriteStore.getState().createDraft('Draft 2');
        
        expect(useWriteStore.getState().drafts.length).toBe(2);
        
        useWriteStore.getState().deleteDraft(id1);
        
        const state = useWriteStore.getState();
        expect(state.drafts.length).toBe(1);
        expect(state.drafts[0].id).toBe(id2);
    });

    it('should add and remove document from context', () => {
        const draftId = useWriteStore.getState().createDraft('Context Draft');
        
        useWriteStore.getState().addDocToContext(draftId, 'doc-123');
        expect(useWriteStore.getState().drafts[0].contextDocs).toContain('doc-123');
        
        useWriteStore.getState().removeDocFromContext(draftId, 'doc-123');
        expect(useWriteStore.getState().drafts[0].contextDocs).not.toContain('doc-123');
    });
});
