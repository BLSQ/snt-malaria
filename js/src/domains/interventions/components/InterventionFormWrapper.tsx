import React, { FC, useCallback, useMemo } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, Stack, Typography } from '@mui/material';
import {
    LoadingSpinner,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { setNestedObjectValues } from 'formik';
import { DeleteRestoreModal } from 'Iaso/components/DeleteRestoreModals/DeleteRestoreModal';
import { CardStyled } from '../../../components/CardStyled';
import { SettingsFormContainer } from '../../../components/styledComponents';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { useGetGrants } from '../../costManagement/grants/hooks/useGetGrants';
import { MESSAGES } from '../../messages';
import { useDeleteIntervention } from '../hooks/useDeleteIntervention';
import { useDuplicateIntervention } from '../hooks/useDuplicateIntervention';
import { useGetInterventionDetails } from '../hooks/useGetInterventionDetails';
import { useInterventionFormState } from '../hooks/useInterventionFormState';
import { useSaveIntervention } from '../hooks/useSaveIntervention';
import { useSaveInterventionDetails } from '../hooks/useSaveInterventionDetails';
import { Intervention, InterventionPayload } from '../types';
import { InterventionFormValues } from '../types/interventionForm';
import { InterventionBasicForm } from './InterventionBasicForm';
import { InterventionForm } from './InterventionForm';

type Props = {
    intervention?: Intervention | null;
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

const DeleteInterventionModal = makeFullModal(
    DeleteRestoreModal,
    DeleteTriggerButton,
);

export const InterventionFormWrapper: FC<Props> = ({
    intervention,
    onSaved,
    onDeleted,
    onCancel,
}) => {
    const { formatMessage } = useSafeIntl();

    const isNew = !intervention;
    const interventionId = intervention?.id;

    const { data: grants = [] } = useGetGrants();

    const grantOptions = useMemo(
        () =>
            grants.map(grant => ({
                label: grant.name,
                value: grant.id,
            })),
        [grants],
    );

    const { mutateAsync: saveIntervention, isLoading: isSavingIntervention } =
        useSaveIntervention();
    const { mutate: deleteIntervention, isLoading: isDeleting } =
        useDeleteIntervention();
    const { mutateAsync: duplicateIntervention, isLoading: isDuplicating } =
        useDuplicateIntervention();
    const {
        mutateAsync: saveInterventionDetails,
        isLoading: isSavingInterventionDetails,
    } = useSaveInterventionDetails();

    const {
        data: interventionDetails,
        isFetching: isFetchingInterventionDetails,
    } = useGetInterventionDetails({
        interventionId,
    });

    const initialValues: InterventionFormValues = useMemo(
        () => ({
            id: intervention?.id,
            intervention_category: intervention?.intervention_category ?? null,
            name: intervention?.name ?? '',
            short_name: intervention?.short_name ?? '',
            code: intervention?.code ?? '',
            description: intervention?.description ?? '',
            impact_ref: interventionDetails?.impact_ref ?? '',
            grant: interventionDetails?.grant ?? null,
        }),
        [intervention, interventionDetails],
    );

    // Save the basic fields and the details together, in one submit, so an
    // edit can never save one half without the other. Cost lines are managed
    // from Cost Management and deliberately not sent: `update_details` would
    // delete any line missing from the payload.
    const onSubmit = useCallback(
        async (values: InterventionFormValues) => {
            const { impact_ref, grant, ...basicValues } = values;

            const savedIntervention = (await saveIntervention(
                basicValues as InterventionPayload,
            )) as Intervention;

            const savedId = savedIntervention?.id ?? (values.id as number);

            await saveInterventionDetails({
                interventionId: savedId,
                impact_ref,
                grant,
            });

            if (isNew) {
                onSaved(savedId);
            }
        },
        [saveIntervention, saveInterventionDetails, isNew, onSaved],
    );

    const formik = useInterventionFormState({
        onSubmit,
        initialValues,
    });

    const handleSave = useCallback(async () => {
        const errors = await formik.validateForm();
        if (Object.keys(errors).length > 0) {
            formik.setTouched(setNestedObjectValues(errors, true));
            return;
        }
        await formik.submitForm();
    }, [formik]);

    const handleDelete = useCallback(() => {
        if (!intervention) {
            return;
        }
        deleteIntervention(intervention.id, { onSuccess: onDeleted });
    }, [intervention, deleteIntervention, onDeleted]);

    const handleDuplicate = useCallback(async () => {
        if (!intervention) {
            return;
        }
        const duplicated = (await duplicateIntervention(
            intervention.id,
        )) as Intervention;
        if (duplicated?.id != null) {
            onSaved(duplicated.id);
        }
    }, [intervention, duplicateIntervention, onSaved]);

    const isSaving = isSavingIntervention || isSavingInterventionDetails;

    return (
        <CardStyled
            header={
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6">
                        {isNew
                            ? formatMessage(MESSAGES.newIntervention)
                            : intervention?.name}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        {!isNew && (
                            <Button
                                onClick={handleDuplicate}
                                variant="outlined"
                                color="primary"
                                startIcon={<ContentCopyIcon />}
                                disabled={isDuplicating}
                            >
                                {formatMessage(MESSAGES.duplicate)}
                            </Button>
                        )}
                        {!isNew && (
                            <DeleteInterventionModal
                                titleMessage={formatMessage(
                                    MESSAGES.deleteInterventionConfirmTitle,
                                )}
                                onConfirm={handleDelete}
                                iconProps={{
                                    label: formatMessage(
                                        MESSAGES.deleteIntervention,
                                    ),
                                    disabled: isDeleting,
                                }}
                            >
                                {formatMessage(
                                    MESSAGES.deleteInterventionConfirmMessage,
                                )}
                            </DeleteInterventionModal>
                        )}
                        {isNew && (
                            <Button onClick={onCancel} color="primary">
                                {formatMessage(MESSAGES.cancel)}
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
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
            {isFetchingInterventionDetails && (
                <LoadingSpinner absolute={true} />
            )}

            <ExtendedFormikProvider formik={formik}>
                <SettingsFormContainer>
                    <InterventionBasicForm />
                </SettingsFormContainer>
                <SettingsFormContainer>
                    <InterventionForm grantOptions={grantOptions} />
                </SettingsFormContainer>
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
