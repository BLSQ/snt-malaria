import React, { FC, useCallback, useMemo } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, Stack, Typography } from '@mui/material';
import { makeFullModal, useSafeIntl } from 'bluesquare-components';
import { DeleteRestoreModal } from 'Iaso/components/DeleteRestoreModals/DeleteRestoreModal';
import { CardStyled } from '../../../../components/CardStyled';
import { SettingsFormContainer } from '../../../../components/styledComponents';
import { ExtendedFormikProvider } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../messages';
import { useCreateDonor } from '../hooks/useCreateDonor';
import { useDeleteGrant } from '../hooks/useDeleteGrant';
import { useGrantFormState } from '../hooks/useGrantFormState';
import { useSaveGrant } from '../hooks/useSaveGrant';
import { Donor, Grant, GrantFormValues, GrantPayload } from '../types';
import { GrantForm } from './GrantForm';

type Props = {
    grant?: Grant | null;
    onSaved: (savedId?: number) => void;
    onDeleted: () => void;
    onCancel: () => void;
};

const DeleteTriggerButton: FC<{
    onClick: () => void;
    label: string;
    disabled?: boolean;
}> = ({ onClick, label, disabled }) => (
    <Button
        onClick={onClick}
        variant="outlined"
        color="error"
        startIcon={<DeleteOutlineIcon />}
        disabled={disabled}
    >
        {label}
    </Button>
);

const DeleteGrantModal = makeFullModal(DeleteRestoreModal, DeleteTriggerButton);

export const GrantFormWrapper: FC<Props> = ({
    grant,
    onSaved,
    onDeleted,
    onCancel,
}) => {
    const { formatMessage } = useSafeIntl();

    const isNew = !grant;

    const { mutate: saveGrant, isLoading: isSaving } = useSaveGrant();
    const { mutate: deleteGrant, isLoading: isDeleting } = useDeleteGrant();
    const { mutateAsync: createDonor, isLoading: isCreatingDonor } =
        useCreateDonor();

    const initialValues = useMemo(
        () => ({
            id: grant?.id,
            name: grant?.name ?? '',
            short_name: grant?.short_name ?? '',
            description: grant?.description ?? '',
            amount: grant?.amount ?? null,
            donor: grant?.donor ?? null,
        }),
        [grant],
    );

    const onSubmit = useCallback(
        async (values: GrantFormValues) => {
            // A free-typed donor name (string) means no existing donor
            // matched: create it implicitly before saving the grant.
            let donorId: number | null;
            if (typeof values.donor === 'string') {
                const createdDonor = (await createDonor(values.donor)) as Donor;
                donorId = createdDonor.id;
            } else {
                donorId = values.donor;
            }

            const payload: GrantPayload = {
                id: values.id,
                name: values.name,
                short_name: values.short_name ?? '',
                description: values.description ?? '',
                amount: values.amount ?? null,
                donor: donorId,
            };
            saveGrant(payload, {
                onSuccess: (saved: unknown) => onSaved((saved as Grant)?.id),
            });
        },
        [createDonor, saveGrant, onSaved],
    );

    const formik = useGrantFormState({ onSubmit, initialValues });

    const handleDelete = useCallback(() => {
        if (!grant) {
            return;
        }
        deleteGrant(grant.id, { onSuccess: onDeleted });
    }, [grant, deleteGrant, onDeleted]);

    return (
        <CardStyled
            header={
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6">
                        {isNew ? formatMessage(MESSAGES.newGrant) : grant?.name}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        {!isNew && (
                            <DeleteGrantModal
                                titleMessage={formatMessage(
                                    MESSAGES.deleteGrantConfirmTitle,
                                )}
                                onConfirm={handleDelete}
                                iconProps={{
                                    label: formatMessage(MESSAGES.deleteGrant),
                                    disabled: isDeleting,
                                }}
                            >
                                {formatMessage(
                                    MESSAGES.deleteGrantConfirmMessage,
                                )}
                            </DeleteGrantModal>
                        )}
                        {isNew && (
                            <Button onClick={onCancel} color="primary">
                                {formatMessage(MESSAGES.cancel)}
                            </Button>
                        )}
                        <Button
                            onClick={() => formik.handleSubmit()}
                            variant="contained"
                            color="primary"
                            startIcon={<CheckIcon />}
                            disabled={isSaving || isCreatingDonor}
                        >
                            {formatMessage(MESSAGES.save)}
                        </Button>
                    </Stack>
                </Stack>
            }
        >
            <ExtendedFormikProvider formik={formik}>
                <SettingsFormContainer>
                    <GrantForm />
                </SettingsFormContainer>
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
