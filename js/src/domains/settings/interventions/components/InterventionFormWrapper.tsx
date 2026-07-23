import React, { FC, useCallback, useEffect, useMemo } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, Stack, Typography } from '@mui/material';
import { LoadingSpinner, makeFullModal, useSafeIntl } from 'bluesquare-components';
import { DeleteRestoreModal } from 'Iaso/components/DeleteRestoreModals/DeleteRestoreModal';
import { CardStyled } from '../../../../components/CardStyled';
import { SettingsFormContainer } from '../../../../components/styledComponents';
import { ExtendedFormikProvider } from '../../../../hooks/useGetExtendedFormikContext';
import { useGetMetricTypes } from '../../../dataLayers/hooks/useGetMetrics';
import { useDeleteIntervention } from '../../../interventions/hooks/useDeleteIntervention';
import { useGetInterventionCostBreakdownLineCategories } from '../../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { useGetInterventionCostUnitTypes } from '../../../interventions/hooks/useGetInterventionCostUnitType';
import { useGetInterventionDetails } from '../../../interventions/hooks/useGetInterventionDetails';
import { useSaveIntervention } from '../../../interventions/hooks/useSaveIntervention';
import { useSaveInterventionDetails } from '../../../interventions/hooks/useSaveInterventionDetails';
import {
    Intervention,
    InterventionDetails,
    InterventionPayload,
} from '../../../interventions/types';
import { MESSAGES } from '../../../messages';
import { useGetGrants } from '../../grants/hooks/useGetGrants';
import { InterventionProvider } from '../contexts/InterventionContext';
import { useGetBudgetSettings } from '../hooks/useGetBudgetSettings';
import { useInterventionBasicFormState } from '../hooks/useInterventionBasicFormState';
import { useInterventionFormState } from '../hooks/useInterventionFormState';
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

    const { data: interventionCostCategories = [] } =
        useGetInterventionCostBreakdownLineCategories();

    const { data: interventionCostUnitTypes = [] } =
        useGetInterventionCostUnitTypes();

    const { data: metricTypes = [] } = useGetMetricTypes(true);
    const { data: budgetSettings } = useGetBudgetSettings();
    const { data: grants = [] } = useGetGrants();

    const grantOptions = useMemo(
        () =>
            grants.map(grant => ({
                label: grant.name,
                value: grant.id,
            })),
        [grants],
    );

    const { mutate: saveIntervention, isLoading: isSavingIntervention } =
        useSaveIntervention();
    const { mutate: deleteIntervention, isLoading: isDeleting } =
        useDeleteIntervention();

    const basicInitialValues = useMemo(
        () => ({
            id: intervention?.id,
            intervention_category: intervention?.intervention_category ?? null,
            name: intervention?.name ?? '',
            short_name: intervention?.short_name ?? '',
            code: intervention?.code ?? '',
            description: intervention?.description ?? '',
        }),
        [intervention],
    );

    const onSubmitBasic = useCallback(
        (values: InterventionPayload) => {
            saveIntervention(values, {
                onSuccess: (saved: unknown) => {
                    if (isNew) {
                        onSaved((saved as Intervention)?.id);
                    }
                },
            });
        },
        [saveIntervention, isNew, onSaved],
    );

    const basicFormik = useInterventionBasicFormState({
        onSubmit: onSubmitBasic,
        initialValues: basicInitialValues,
    });

    const {
        mutate: saveInterventionDetails,
        isLoading: isSavingInterventionDetails,
    } = useSaveInterventionDetails(interventionId);
    const onSubmitDetails = useCallback(
        (values: Partial<InterventionDetails>) =>
            saveInterventionDetails(values),
        [saveInterventionDetails],
    );

    const {
        data: interventionDetails,
        isFetching: isFetchingInterventionDetails,
    } = useGetInterventionDetails({
        interventionId,
    });

    const detailsFormik = useInterventionFormState({
        onSubmit: onSubmitDetails,
    });

    useEffect(() => {
        if (!interventionDetails) {
            return;
        }

        detailsFormik.resetForm({
            values: {
                ...interventionDetails,
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interventionDetails, metricTypes]); // Only run when interventionDetails or metricTypes changes

    const handleSave = useCallback(async () => {
        await basicFormik.submitForm();
        if (!isNew) {
            await detailsFormik.submitForm();
        }
    }, [basicFormik, detailsFormik, isNew]);

    const handleDelete = useCallback(() => {
        if (!intervention) {
            return;
        }
        deleteIntervention(intervention.id, { onSuccess: onDeleted });
    }, [intervention, deleteIntervention, onDeleted]);

    const isSaving = isSavingIntervention || isSavingInterventionDetails;

    return (
        <InterventionProvider
            costCategoryOptions={interventionCostCategories}
            costUnitTypeOptions={interventionCostUnitTypes}
            grantOptions={grantOptions}
            metricTypes={metricTypes}
            budgetSettings={budgetSettings}
        >
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

                <ExtendedFormikProvider formik={basicFormik}>
                    <SettingsFormContainer>
                        <InterventionBasicForm />
                    </SettingsFormContainer>
                </ExtendedFormikProvider>

                {!isNew && (
                    <ExtendedFormikProvider formik={detailsFormik}>
                        <SettingsFormContainer>
                            <InterventionForm />
                        </SettingsFormContainer>
                    </ExtendedFormikProvider>
                )}
            </CardStyled>
        </InterventionProvider>
    );
};
