import { useCallback, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { PendingAttachment } from 'Iaso/components/ChatPanel/ChatPanel';
import { openSnackBar } from 'Iaso/components/snackBars/EventDispatcher';
import { errorSnackBar } from 'Iaso/constants/snackBars';
import { deleteRequest, postRequest } from 'Iaso/libs/Api';
import { UploadedAttachment } from './types';

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
    // Collection endpoint of the chat resource, e.g. '/api/snt_malaria/scenario_rule_ai/'.
    endpoint: string;
    uploadErrorMessage: (filename: string) => string;
};

type Result = {
    pendingAttachments: PendingAttachment[];
    onAttachFiles: (files: File[]) => void;
    onRemoveAttachment: (id: string) => void;
    /** Attachment ids to send with the next message, and clearing them once sent. */
    clearSent: (ids: string[]) => void;
    /** Discards every staged attachment, deleting the ones already uploaded. */
    reset: () => void;
};

/** Staging of documents attached to an AI chat message: uploaded to the Anthropic Files API as soon
 * as they're picked, then referenced by id when the message is sent. */
export const useAIChatAttachments = ({
    endpoint,
    uploadErrorMessage,
}: Args): Result => {
    const [pendingAttachments, setPendingAttachments] = useState<
        PendingAttachment[]
    >([]);
    const { mutateAsync: uploadAttachment } = useMutation<
        UploadedAttachment,
        Error,
        File
    >((file: File) =>
        postRequest(`${endpoint}attachments/`, undefined, { file }),
    );
    const { mutate: deleteAttachment } = useMutation<boolean, Error, string>(
        (fileId: string) => deleteRequest(`${endpoint}attachments/${fileId}/`),
    );
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
                                    uploadErrorMessage(file.name),
                            ),
                        );
                    });
            });
        },
        [uploadAttachment, deleteAttachment, uploadErrorMessage],
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

    const clearSent = useCallback((ids: string[]) => {
        // Only clear the attachments actually included in the send - one left in an 'error' state
        // stays visible, so the user can see it wasn't sent rather than it vanishing.
        const sentIds = new Set(ids);
        setPendingAttachments(prev => prev.filter(a => !sentIds.has(a.id)));
    }, []);

    const reset = useCallback(() => {
        pendingAttachments
            .filter(attachment => attachment.status === 'ready')
            .forEach(attachment => deleteAttachment(attachment.id));
        setPendingAttachments([]);
    }, [pendingAttachments, deleteAttachment]);

    return {
        pendingAttachments,
        onAttachFiles,
        onRemoveAttachment,
        clearSent,
        reset,
    };
};
