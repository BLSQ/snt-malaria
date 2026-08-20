import { useCallback, useState } from 'react';
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

type Args<TRequest extends AIChatRequest, TResponse extends AIChatResponse> = {
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
};

type Result = {
    messages: ChatMessage[];
    isLoading: boolean;
    sendMessage: (message: string, options?: SendMessageOptions) => void;
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
>({
    endpoint,
    sendMessage,
    isLoading,
    buildRequest,
    onReply,
    errorMessage,
    uploadErrorMessage,
}: Args<TRequest, TResponse>): Result => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationHistory, setConversationHistory] = useState<
        ConversationEntry[]
    >([]);
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
                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: data.assistant_message,
                                id: crypto.randomUUID(),
                                quickReplies: data.quick_replies ?? undefined,
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
        ],
    );

    const reset = useCallback(() => {
        resetAttachments();
        setMessages([]);
        setConversationHistory([]);
    }, [resetAttachments]);

    return {
        messages,
        isLoading,
        sendMessage: handleSendMessage,
        reset,
        pendingAttachments,
        onAttachFiles,
        onRemoveAttachment,
    };
};
