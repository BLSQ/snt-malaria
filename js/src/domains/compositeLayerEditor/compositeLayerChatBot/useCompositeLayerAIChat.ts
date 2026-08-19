import { useCallback, useRef, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import {
    applyQuickReplyAnswer,
    ChatMessage,
    PendingAttachment,
    SendMessageOptions,
} from 'Iaso/components/ChatPanel/ChatPanel';
import { openSnackBar } from 'Iaso/components/snackBars/EventDispatcher';
import { errorSnackBar } from 'Iaso/constants/snackBars';
import { MESSAGES } from '../messages';
import {
    AttachmentReference,
    ConversationEntry,
    CurrentGraph,
    GeneratedGraph,
} from './types';
import { useDeleteCompositeLayerAIAttachment } from './useDeleteCompositeLayerAIAttachment';
import { useSendCompositeLayerAIMessage } from './useSendCompositeLayerAIMessage';
import { useUploadCompositeLayerAIAttachment } from './useUploadCompositeLayerAIAttachment';

// The upload endpoint's validation errors (wrong file type, too large, failed the safety scan)
// already explain what's wrong and aren't fixed by retrying the same file - surfacing them
// verbatim beats a generic "try again" that doesn't apply to a permanent rejection.
const getUploadErrorMessage = (error: unknown): string | undefined => {
    const details = (error as { details?: Record<string, unknown> } | undefined)
        ?.details;
    if (!details) return undefined;
    if (typeof details.error === 'string') return details.error;
    if (Array.isArray(details.file)) return details.file.join(' ');
    return undefined;
};

type Args = {
    // Sent with each message so the AI can iterate on the current canvas (null when empty).
    getCurrentGraph: () => CurrentGraph | null;
    onGenerate: (graph: GeneratedGraph) => void;
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

/** Conversation state + send logic for the composite-layer AI chat, owned by the wrapper page so
 * the chat panel itself stays presentational. */
export const useCompositeLayerAIChat = ({
    getCurrentGraph,
    onGenerate,
}: Args): Result => {
    const { formatMessage } = useSafeIntl();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationHistory, setConversationHistory] = useState<
        ConversationEntry[]
    >([]);
    const [pendingAttachments, setPendingAttachments] = useState<
        PendingAttachment[]
    >([]);
    const { mutate: sendMessage, isLoading } = useSendCompositeLayerAIMessage();
    const { mutateAsync: uploadAttachment } =
        useUploadCompositeLayerAIAttachment();
    const { mutate: deleteAttachment } = useDeleteCompositeLayerAIAttachment();
    // Ids removed while their upload was still in flight - the upload may still succeed after
    // removal, so its result is deleted from Anthropic instead of being added back to the list.
    const removedWhileUploadingRef = useRef<Set<string>>(new Set());

    const onAttachFiles = useCallback(
        (files: File[]) => {
            files.forEach(file => {
                const localId = crypto.randomUUID();
                setPendingAttachments(prev => [
                    ...prev,
                    { id: localId, filename: file.name, status: 'uploading' },
                ]);
                uploadAttachment(file)
                    .then(uploaded => {
                        if (removedWhileUploadingRef.current.delete(localId)) {
                            deleteAttachment(uploaded.file_id);
                            return;
                        }
                        setPendingAttachments(prev =>
                            prev.map(attachment =>
                                attachment.id === localId
                                    ? {
                                          id: uploaded.file_id,
                                          filename: uploaded.filename,
                                          status: 'ready',
                                      }
                                    : attachment,
                            ),
                        );
                    })
                    .catch((error: unknown) => {
                        removedWhileUploadingRef.current.delete(localId);
                        setPendingAttachments(prev =>
                            prev.map(attachment =>
                                attachment.id === localId
                                    ? { ...attachment, status: 'error' }
                                    : attachment,
                            ),
                        );
                        openSnackBar(
                            errorSnackBar(
                                undefined,
                                getUploadErrorMessage(error) ??
                                    formatMessage(
                                        MESSAGES.compositeLayerAIAttachmentUploadError,
                                        { filename: file.name },
                                    ),
                            ),
                        );
                    });
            });
        },
        [uploadAttachment, deleteAttachment, formatMessage],
    );

    const onRemoveAttachment = useCallback(
        (id: string) => {
            const attachment = pendingAttachments.find(a => a.id === id);
            if (attachment?.status === 'uploading') {
                removedWhileUploadingRef.current.add(id);
            } else if (attachment?.status === 'ready') {
                deleteAttachment(attachment.id);
            }
            setPendingAttachments(prev => prev.filter(a => a.id !== id));
        },
        [pendingAttachments, deleteAttachment],
    );

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
            // Only clear the attachments actually included in this send - one left in an 'error'
            // state stays visible, so the user can see it wasn't sent rather than it vanishing.
            const sentIds = new Set((attachments ?? []).map(a => a.id));
            setPendingAttachments(prev =>
                prev.filter(a => !sentIds.has(a.id)),
            );

            sendMessage(
                {
                    message,
                    conversation_history: conversationHistory,
                    current_graph: getCurrentGraph(),
                    attachments: attachmentRefs.length
                        ? attachmentRefs
                        : undefined,
                },
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
                        if (data.graph) {
                            onGenerate(data.graph);
                        }
                    },
                    onError: () => {
                        setMessages(prev => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: formatMessage(
                                    MESSAGES.compositeLayerAIError,
                                ),
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
            onGenerate,
            getCurrentGraph,
            formatMessage,
        ],
    );

    const reset = useCallback(() => {
        pendingAttachments
            .filter(attachment => attachment.status === 'ready')
            .forEach(attachment => deleteAttachment(attachment.id));
        setMessages([]);
        setConversationHistory([]);
        setPendingAttachments([]);
    }, [pendingAttachments, deleteAttachment]);

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
