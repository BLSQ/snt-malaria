import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAttachments = {
    pendingAttachments: [],
    onAttachFiles: vi.fn(),
    onRemoveAttachment: vi.fn(),
    clearSent: vi.fn(),
    reset: vi.fn(),
};

vi.mock('./useAIChatAttachments', () => ({
    useAIChatAttachments: () => mockAttachments,
}));

type Response = {
    assistant_message: string;
    quick_replies: null;
    conversation_history: { role: string; content: string }[];
    rules?: unknown;
};

const RESPONSE_WITH_CHANGE: Response = {
    assistant_message: 'Applied.',
    quick_replies: null,
    conversation_history: [
        { role: 'user', content: 'do it' },
        { role: 'assistant', content: 'Applied.' },
    ],
    rules: [{ id: 1 }],
};

const baseArgs = () => ({
    endpoint: '/api/test/',
    isLoading: false,
    buildRequest: (base: any) => base,
    errorMessage: 'boom',
    uploadErrorMessage: (f: string) => `bad ${f}`,
});

describe('useAIChat revert', () => {
    beforeEach(() => vi.clearAllMocks());

    const setup = async (overrides: Record<string, unknown> = {}) => {
        const { useAIChat } = await import('./useAIChat');
        let response: Response = RESPONSE_WITH_CHANGE;
        const setResponse = (r: Response) => {
            response = r;
        };
        const sendMessage = vi.fn((_vars, opts) => opts.onSuccess(response));
        const utils = renderHook(() =>
            useAIChat({
                ...baseArgs(),
                sendMessage,
                ...overrides,
            } as any),
        );
        return { ...utils, sendMessage, setResponse };
    };

    it('flags a message revertable only when didApplyChange is true', async () => {
        const captureRevertSnapshot = vi.fn(() => ({ snap: 1 }));
        const { result, setResponse } = await setup({
            captureRevertSnapshot,
            didApplyChange: (data: Response) => data.rules != null,
            onRevertSnapshot: vi.fn(),
            revertNoteMessage: 'Reverted.',
        });

        act(() => result.current.sendMessage('do it'));
        expect(captureRevertSnapshot).toHaveBeenCalledTimes(1);
        const applied = result.current.messages.at(-1)!;
        expect(applied.role).toBe('assistant');
        expect(applied.revertable).toBe(true);

        act(() => {
            setResponse({ ...RESPONSE_WITH_CHANGE, rules: null });
            result.current.sendMessage('just chatting');
        });
        expect(result.current.messages.at(-1)!.revertable).toBeUndefined();
    });

    it('restores the captured snapshot and marks the turn reverted', async () => {
        const onRevertSnapshot = vi.fn();
        const { result } = await setup({
            captureRevertSnapshot: () => ({ snap: 'A' }),
            didApplyChange: () => true,
            onRevertSnapshot,
            revertNoteMessage: 'Reverted.',
        });

        act(() => result.current.sendMessage('do it'));
        const appliedId = result.current.messages.at(-1)!.id;

        await act(async () => {
            await result.current.revert(appliedId);
        });

        expect(onRevertSnapshot).toHaveBeenCalledWith({ snap: 'A' });
        const applied = result.current.messages.find(m => m.id === appliedId)!;
        expect(applied.reverted).toBe(true);
        expect(result.current.messages.at(-1)!.content).toBe('Reverted.');
    });

    it('does not mark reverted when onRevertSnapshot throws', async () => {
        const { result } = await setup({
            captureRevertSnapshot: () => ({ snap: 'A' }),
            didApplyChange: () => true,
            onRevertSnapshot: vi.fn().mockRejectedValue(new Error('nope')),
            revertNoteMessage: 'Reverted.',
        });

        act(() => result.current.sendMessage('do it'));
        const appliedId = result.current.messages.at(-1)!.id;

        await act(async () => {
            await result.current.revert(appliedId);
        });

        const applied = result.current.messages.find(m => m.id === appliedId)!;
        expect(applied.reverted).toBeUndefined();
        expect(result.current.messages.at(-1)!.content).toBe('boom');
    });

    it('clears snapshots and transcript on reset', async () => {
        const { result } = await setup({
            captureRevertSnapshot: () => ({ snap: 'A' }),
            didApplyChange: () => true,
            onRevertSnapshot: vi.fn(),
        });

        act(() => result.current.sendMessage('do it'));
        expect(result.current.messages.length).toBeGreaterThan(0);

        act(() => result.current.reset());
        expect(result.current.messages).toHaveLength(0);
    });
});
