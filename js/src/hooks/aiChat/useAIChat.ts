import { useCallback, useRef, useState } from 'react';
import { UseMutateFunction } from 'react-query';
import {
    applyQuickReplyAnswer,
    ChatMessage,
    PendingAttachment,
    SendMessageOptions,
} from 'Iaso/components/ChatPanel/ChatPanel';
import {
    AIChatRequest,
    AIChatResponse,
    AttachmentReference,
    ConversationEntry,
} from './types';
import { useAIChatAttachments } from './useAIChatAttachments';

type Args<
    TRequest extends AIChatRequest,
    TResponse extends AIChatResponse,
    TSnapshot,
> = {
    // Collection endpoint of the chat resource, e.g. '/api/snt_malaria/scenario_rule_ai/'.
    endpoint: string;
    sendMessage: UseMutateFunction<TResponse, Error, TRequest>;
    isLoading: boolean;
    /** Adds the feature's own request fields (e.g. the scenario, the open graph) to a turn. */
    buildRequest: (base: AIChatRequest) => TRequest;
    /** Applies a successful reply's payload, for a feature that acts on it client-side. */
    onReply?: (data: TResponse) => void;
    errorMessage: string;
    uploadErrorMessage: (filename: string) => string;
    /** Captures the pre-turn state to restore to, taken synchronously before the message is sent.
     * Only stored when `didApplyChange` marks the resulting reply as an applied change. Return
     * value is opaque and passed back verbatim to `onRevertSnapshot`; `null` is a valid snapshot
     * (e.g. "the canvas was empty"). Omit entirely for a chat with no revert support. */
    captureRevertSnapshot?: () => TSnapshot;
    /** Whether a successful reply actually applied a change - only those messages get a Revert
     * action (e.g. `data => !!data.rules`). */
    didApplyChange?: (data: TResponse) => boolean;
    /** Feature-specific restore of a snapshot from `captureRevertSnapshot`. May be async; a
     * rejection surfaces `errorMessage` and leaves the message revertable for a retry. */
    onRevertSnapshot?: (snapshot: TSnapshot) => Promise<unknown> | void;
    /** Assistant-bubble line appended after a successful revert. */
    revertNoteMessage?: string;
};

type Result = {
    messages: ChatMessage[];
    isLoading: boolean;
    sendMessage: (message: string, options?: SendMessageOptions) => void;
    revert: (messageId: string) => void;
    reset: () => void;
    pendingAttachments: PendingAttachment[];
    onAttachFiles: (files: File[]) => void;
    onRemoveAttachment: (id: string) => void;
};

/** Conversation state, quick replies and document attachments for an AI chat, owned by the wrapper
 * page so the chat panel itself stays presentational. */
export const useAIChat = <
    TRequest extends AIChatRequest,
    TResponse extends AIChatResponse,
    TSnapshot = unknown,
>({
    endpoint,
    sendMessage,
    isLoading,
    buildRequest,
    onReply,
    errorMessage,
    uploadErrorMessage,
    captureRevertSnapshot,
    didApplyChange,
    onRevertSnapshot,
    revertNoteMessage,
}: Args<TRequest, TResponse, TSnapshot>): Result => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationHistory, setConversationHistory] = useState<
        ConversationEntry[]
    >([]);
    // Pre-turn snapshots keyed by the assistant message they can restore to. A ref, not state:
    // nothing rendered reads it, it only needs to be current when `revert` fires.
    const revertSnapshots = useRef<Map<string, TSnapshot>>(new Map());
    const {
        pendingAttachments,
        onAttachFiles,
        onRemoveAttachment,
        clearSent,
        reset: resetAttachments,
    } = useAIChatAttachments({ endpoint, uploadErrorMessage });

    const handleSendMessage = useCallback(
        (message: string, options?: SendMessageOptions) => {
            const { displayContent, quickReplyAnswer, attachments } =
                options ?? {};
            const attachmentRefs: AttachmentReference[] = (
                attachments ?? []
            ).map(attachment => ({
                file_id: attachment.id,
                filename: attachment.filename,
            }));
            setMessages(prev => {
                const messagesWithAnswer = quickReplyAnswer
                    ? applyQuickReplyAnswer(prev, quickReplyAnswer)
                    : prev;
                return [
                    ...messagesWithAnswer,
                    {
                        role: 'user',
                        content: displayContent ?? message,
                        id: crypto.randomUUID(),
                        attachments,
                    },
                ];
            });
            clearSent((attachments ?? []).map(a => a.id));

            sendMessage(
                buildRequest({
                    message,
                    conversation_history: conversationHistory,
                    attachments: attachmentRefs.length
                        ? attachmentRefs
                        : undefined,
                }),
                {
                    onSuccess: data => {
                        const assistantId = crypto.randomUUID();
                        const revertable =
                            Boolean(captureRevertSnapshot) &&
                            !!didApplyChange?.(data);
                        // Capture the pre-turn state only now that the reply is known to be an
                        // applied change - a plain Q&A turn never needs a snapshot. The reply is
                        // applied by `onReply` further down, so the state read here is still pre-turn.
                        if (revertable) {
                            revertSnapshots.current.set(
                                assistantId,
                                captureRevertSnapshot!(),
                            );
                        }
                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: data.assistant_message,
                                id: assistantId,
                                quickReplies: data.quick_replies ?? undefined,
                                revertable,
                            },
                        ]);
                        setConversationHistory(data.conversation_history);
                        onReply?.(data);
                    },
                    onError: () => {
                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: errorMessage,
                                id: crypto.randomUUID(),
                            },
                        ]);
                    },
                },
            );
        },
        [
            conversationHistory,
            sendMessage,
            buildRequest,
            onReply,
            errorMessage,
            clearSent,
            captureRevertSnapshot,
            didApplyChange,
        ],
    );

    const revert = useCallback(
        async (messageId: string) => {
            const target = messages.find(m => m.id === messageId);
            if (!target?.revertable || target.reverted) {
                return;
            }
            try {
                await onRevertSnapshot?.(
                    revertSnapshots.current.get(messageId) as TSnapshot,
                );
            } catch {
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: errorMessage,
                        id: crypto.randomUUID(),
                    },
                ]);
                return;
            }
            // The reverted turn and every later one now describe a state that no longer exists;
            // marking them `reverted` disables their own revert action. The current state the model
            // sees is rebuilt fresh each turn, so no conversation-history fixup is needed.
            setMessages(prev => {
                const targetIndex = prev.findIndex(m => m.id === messageId);
                const updated = prev.map((m, index) =>
                    m.revertable && !m.reverted && index >= targetIndex
                        ? { ...m, reverted: true }
                        : m,
                );
                return revertNoteMessage
                    ? [
                          ...updated,
                          {
                              role: 'assistant' as const,
                              content: revertNoteMessage,
                              id: crypto.randomUUID(),
                          },
                      ]
                    : updated;
            });
        },
        [messages, onRevertSnapshot, revertNoteMessage, errorMessage],
    );

    const reset = useCallback(() => {
        resetAttachments();
        revertSnapshots.current.clear();
        setMessages([]);
        setConversationHistory([]);
    }, [resetAttachments]);

    return {
        messages,
        isLoading,
        sendMessage: handleSendMessage,
        revert,
        reset,
        pendingAttachments,
        onAttachFiles,
        onRemoveAttachment,
    };
};
