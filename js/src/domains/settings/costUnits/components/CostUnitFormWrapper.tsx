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
import { useCostUnitFormState } from '../hooks/useCostUnitFormState';
import { useDeleteCostUnitType } from '../hooks/useDeleteCostUnitType';
import { useSaveCostUnitType } from '../hooks/useSaveCostUnitType';
import { CostUnitType, CostUnitTypePayload } from '../types';
import { CostUnitForm } from './CostUnitForm';

type Props = {
    costUnit?: CostUnitType | null;
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

const DeleteCostUnitModal = makeFullModal(
    DeleteRestoreModal,
    DeleteTriggerButton,
);

export const CostUnitFormWrapper: FC<Props> = ({
    costUnit,
    onSaved,
    onDeleted,
    onCancel,
}) => {
    const { formatMessage } = useSafeIntl();

    const isNew = !costUnit;

    const { mutate: saveCostUnitType, isLoading: isSaving } =
        useSaveCostUnitType();
    const { mutate: deleteCostUnitType, isLoading: isDeleting } =
        useDeleteCostUnitType();

    const initialValues = useMemo(
        () => ({
            id: costUnit?.id,
            name: costUnit?.name ?? '',
            value: costUnit?.value ?? '',
            invert_value: costUnit?.invert_value ?? false,
            is_proportional: costUnit?.is_proportional ?? true,
            description: costUnit?.description ?? '',
        }),
        [costUnit],
    );

    const onSubmit = useCallback(
        (values: CostUnitTypePayload) => {
            const isProportional = values.is_proportional;
            const hasValue = values.value !== '' && values.value !== null;
            // Non-proportional units have no conversion factor: reset value/invert_value.
            const payload: CostUnitTypePayload = {
                id: values.id,
                name: values.name,
                value: isProportional && hasValue ? values.value : null,
                invert_value: isProportional ? values.invert_value : false,
                is_proportional: isProportional,
                description: values.description ?? '',
            };
            saveCostUnitType(payload, {
                onSuccess: (saved: unknown) =>
                    onSaved((saved as CostUnitType)?.id),
            });
        },
        [saveCostUnitType, onSaved],
    );

    const formik = useCostUnitFormState({ onSubmit, initialValues });

    const handleDelete = useCallback(() => {
        if (!costUnit) {
            return;
        }
        deleteCostUnitType(costUnit.id, { onSuccess: onDeleted });
    }, [costUnit, deleteCostUnitType, onDeleted]);

    return (
        <CardStyled
            header={
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6">
                        {isNew
                            ? formatMessage(MESSAGES.newCostUnit)
                            : costUnit?.name}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        {!isNew && (
                            <DeleteCostUnitModal
                                titleMessage={formatMessage(
                                    MESSAGES.deleteCostUnitConfirmTitle,
                                )}
                                onConfirm={handleDelete}
                                iconProps={{
                                    label: formatMessage(
                                        MESSAGES.deleteCostUnit,
                                    ),
                                    disabled: isDeleting,
                                }}
                            >
                                {formatMessage(
                                    MESSAGES.deleteCostUnitConfirmMessage,
                                )}
                            </DeleteCostUnitModal>
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
                    <CostUnitForm />
                </SettingsFormContainer>
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
