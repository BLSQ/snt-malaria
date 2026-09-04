import { useCallback, useState } from 'react';
import {
    applyQuickReplyAnswer,
    ChatMessage,
    ChatMessageAttachment,
    QuickReplyAnswer,
} from 'Iaso/components/ChatPanel/ChatPanel';
import { QuickReplyQuestion } from './types';

type UserTurn = {
    content: string;
    quickReplyAnswer?: QuickReplyAnswer;
    attachments?: ChatMessageAttachment[];
};

type AssistantReply = {
    id: string;
    content: string;
    quickReplies?: QuickReplyQuestion[] | null;
    revertable: boolean;
};

type Result = {
    messages: ChatMessage[];
    addUserTurn: (turn: UserTurn) => void;
    addAssistantReply: (reply: AssistantReply) => void;
    /** Appends a standalone assistant line - an error notice or a post-revert note. */
    addAssistantNote: (content: string) => void;
    /** Marks the given turn and every later still-revertable turn as reverted: they now
     * describe a state that no longer exists, so their own revert action is disabled. */
    markRevertedFrom: (messageId: string) => void;
    reset: () => void;
};

/** The messages shown in the chat panel, and the mutations the chat wrapper runs on them. */
export const useChatTranscript = (): Result => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const addUserTurn = useCallback(
        ({ content, quickReplyAnswer, attachments }: UserTurn) => {
            setMessages(prev => {
                const withAnswer = quickReplyAnswer
                    ? applyQuickReplyAnswer(prev, quickReplyAnswer)
                    : prev;
                return [
                    ...withAnswer,
                    {
                        role: 'user',
                        content,
                        id: crypto.randomUUID(),
                        attachments,
                    },
                ];
            });
        },
        [],
    );

    const addAssistantReply = useCallback(
        ({ id, content, quickReplies, revertable }: AssistantReply) => {
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content,
                    id,
                    quickReplies: quickReplies ?? undefined,
                    revertable,
                },
            ]);
        },
        [],
    );

    const addAssistantNote = useCallback((content: string) => {
        setMessages(prev => [
            ...prev,
            { role: 'assistant', content, id: crypto.randomUUID() },
        ]);
    }, []);

    const markRevertedFrom = useCallback((messageId: string) => {
        setMessages(prev => {
            const targetIndex = prev.findIndex(m => m.id === messageId);
            if (targetIndex === -1) {
                return prev;
            }
            return prev.map((m, index) =>
                m.revertable && !m.reverted && index >= targetIndex
                    ? { ...m, reverted: true }
                    : m,
            );
        });
    }, []);

    const reset = useCallback(() => setMessages([]), []);

    return {
        messages,
        addUserTurn,
        addAssistantReply,
        addAssistantNote,
        markRevertedFrom,
        reset,
    };
};
