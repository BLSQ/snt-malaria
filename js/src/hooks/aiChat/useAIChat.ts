import { useCallback } from 'react';
import { UseMutateFunction } from 'react-query';
import {
    ChatMessage,
    ChatMessageAttachment,
    PendingAttachment,
    SendMessageOptions,
} from 'Iaso/components/ChatPanel/ChatPanel';
import { AIChatRequest, AIChatResponse, AttachmentReference } from './types';
import { useAIChatAttachments } from './useAIChatAttachments';
import { useChatTranscript } from './useChatTranscript';
import { useConversationHistory } from './useConversationHistory';
import { useRevertSnapshots } from './useRevertSnapshots';

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

const toAttachmentReferences = (
    attachments: ChatMessageAttachment[] | undefined,
): AttachmentReference[] | undefined =>
    attachments?.length
        ? attachments.map(attachment => ({
              file_id: attachment.id,
              filename: attachment.filename,
          }))
        : undefined;

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
    const {
        messages,
        addUserTurn,
        addAssistantReply,
        addAssistantNote,
        markRevertedFrom,
        reset: resetTranscript,
    } = useChatTranscript();
    const {
        history: conversationHistory,
        record: recordHistory,
        reset: resetHistory,
    } = useConversationHistory();
    const { captureIfApplied, getSnapshot, clearSnapshots } =
        useRevertSnapshots({
            captureRevertSnapshot,
            didApplyChange,
        });
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

            addUserTurn({
                content: displayContent ?? message,
                quickReplyAnswer,
                attachments,
            });
            clearSent((attachments ?? []).map(a => a.id));

            sendMessage(
                buildRequest({
                    message,
                    conversation_history: conversationHistory,
                    attachments: toAttachmentReferences(attachments),
                }),
                {
                    onSuccess: data => {
                        const assistantId = crypto.randomUUID();
                        const revertable = captureIfApplied(assistantId, data);
                        addAssistantReply({
                            id: assistantId,
                            content: data.assistant_message,
                            quickReplies: data.quick_replies,
                            revertable,
                        });
                        recordHistory(data.conversation_history);
                        onReply?.(data);
                    },
                    onError: () => addAssistantNote(errorMessage),
                },
            );
        },
        [
            addUserTurn,
            clearSent,
            sendMessage,
            buildRequest,
            conversationHistory,
            captureIfApplied,
            addAssistantReply,
            recordHistory,
            onReply,
            addAssistantNote,
            errorMessage,
        ],
    );

    const revert = useCallback(
        async (messageId: string) => {
            const target = messages.find(m => m.id === messageId);
            if (!target?.revertable || target.reverted) {
                return;
            }
            try {
                await onRevertSnapshot?.(getSnapshot(messageId) as TSnapshot);
            } catch {
                addAssistantNote(errorMessage);
                return;
            }
            markRevertedFrom(messageId);
            if (revertNoteMessage) {
                addAssistantNote(revertNoteMessage);
            }
        },
        [
            messages,
            onRevertSnapshot,
            getSnapshot,
            addAssistantNote,
            errorMessage,
            markRevertedFrom,
            revertNoteMessage,
        ],
    );

    const reset = useCallback(() => {
        resetAttachments();
        clearSnapshots();
        resetTranscript();
        resetHistory();
    }, [resetAttachments, clearSnapshots, resetTranscript, resetHistory]);

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
