import React, { FC, useCallback, useMemo } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, Stack, Typography } from '@mui/material';
import { makeFullModal, useSafeIntl } from 'bluesquare-components';
import { DeleteRestoreModal } from 'Iaso/components/DeleteRestoreModals/DeleteRestoreModal';
import { CardStyled } from '../../../../components/CardStyled';
import { SettingsFormContainer } from '../../../../components/styledComponents';
import { ExtendedFormikProvider } from '../../../../hooks/useGetExtendedFormikContext';
import { useDeleteInterventionCategory } from '../../../interventions/hooks/useDeleteInterventionCategory';
import { useSaveInterventionCategory } from '../../../interventions/hooks/useSaveInterventionCategory';
import { MESSAGES } from '../../../messages';
import { useInterventionCategoryFormState } from '../hooks/useInterventionCategoryFormState';
import { InterventionCategory, InterventionCategoryPayload } from '../types';
import { InterventionCategoryForm } from './InterventionCategoryForm';

type Props = {
    interventionCategory?: InterventionCategory | null;
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

const DeleteInterventionCategoryModal = makeFullModal(
    DeleteRestoreModal,
    DeleteTriggerButton,
);

export const InterventionCategoryFormWrapper: FC<Props> = ({
    interventionCategory,
    onSaved,
    onDeleted,
    onCancel,
}) => {
    const { formatMessage } = useSafeIntl();

    const isNew = !interventionCategory;

    const { mutate: saveInterventionCategory, isLoading: isSaving } =
        useSaveInterventionCategory();
    const { mutate: deleteInterventionCategory, isLoading: isDeleting } =
        useDeleteInterventionCategory();

    const initialValues = useMemo(
        () => ({
            id: interventionCategory?.id,
            name: interventionCategory?.name ?? '',
            short_name: interventionCategory?.short_name ?? '',
            description: interventionCategory?.description ?? '',
        }),
        [interventionCategory],
    );

    const onSubmit = useCallback(
        (values: InterventionCategoryPayload) => {
            const payload: InterventionCategoryPayload = {
                id: values.id,
                name: values.name,
                short_name: values.short_name ?? '',
                description: values.description ?? '',
            };
            saveInterventionCategory(payload, {
                onSuccess: (saved: unknown) =>
                    onSaved((saved as InterventionCategory)?.id),
            });
        },
        [saveInterventionCategory, onSaved],
    );

    const formik = useInterventionCategoryFormState({
        onSubmit,
        initialValues,
    });

    const handleDelete = useCallback(() => {
        if (!interventionCategory) {
            return;
        }
        deleteInterventionCategory(interventionCategory.id, {
            onSuccess: onDeleted,
        });
    }, [interventionCategory, deleteInterventionCategory, onDeleted]);

    return (
        <CardStyled
            header={
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6">
                        {isNew
                            ? formatMessage(MESSAGES.newInterventionCategory)
                            : interventionCategory?.name}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        {!isNew && (
                            <DeleteInterventionCategoryModal
                                titleMessage={formatMessage(
                                    MESSAGES.deleteInterventionCategoryConfirmTitle,
                                )}
                                onConfirm={handleDelete}
                                iconProps={{
                                    label: formatMessage(
                                        MESSAGES.deleteInterventionCategory,
                                    ),
                                    disabled: isDeleting,
                                }}
                            >
                                {formatMessage(
                                    MESSAGES.deleteInterventionCategoryConfirmMessage,
                                )}
                            </DeleteInterventionCategoryModal>
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
                            disabled={isSaving}
                        >
                            {formatMessage(MESSAGES.save)}
                        </Button>
                    </Stack>
                </Stack>
            }
        >
            <ExtendedFormikProvider formik={formik}>
                <SettingsFormContainer>
                    <InterventionCategoryForm />
                </SettingsFormContainer>
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
