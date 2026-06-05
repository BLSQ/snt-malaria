import React, { FC, useCallback, useMemo, useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { CardStyled } from '../../../../components/CardStyled';
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
};

export const CostUnitFormWrapper: FC<Props> = ({
    costUnit,
    onSaved,
    onDeleted,
}) => {
    const { formatMessage } = useSafeIntl();

    const isNew = !costUnit;
    const [confirmOpen, setConfirmOpen] = useState(false);

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
            description: costUnit?.description ?? '',
        }),
        [costUnit],
    );

    const onSubmit = useCallback(
        (values: CostUnitTypePayload) => {
            const payload: CostUnitTypePayload = {
                id: values.id,
                name: values.name,
                value:
                    values.value === '' || values.value === null
                        ? null
                        : values.value,
                invert_value: values.invert_value,
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
        deleteCostUnitType(costUnit.id, {
            onSuccess: () => {
                setConfirmOpen(false);
                onDeleted();
            },
            onError: () => setConfirmOpen(false),
        });
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
                            <LoadingButton
                                onClick={() => setConfirmOpen(true)}
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteOutlineIcon />}
                                loading={isDeleting}
                            >
                                {formatMessage(MESSAGES.deleteCostUnit)}
                            </LoadingButton>
                        )}
                        <LoadingButton
                            onClick={() => formik.handleSubmit()}
                            variant="outlined"
                            startIcon={<CheckIcon />}
                            loading={isSaving}
                        >
                            {formatMessage(MESSAGES.save)}
                        </LoadingButton>
                    </Stack>
                </Stack>
            }
        >
            <ExtendedFormikProvider formik={formik}>
                <CostUnitForm />
            </ExtendedFormikProvider>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>
                    {formatMessage(MESSAGES.deleteCostUnitConfirmTitle)}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {formatMessage(MESSAGES.deleteCostUnitConfirmMessage)}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmOpen(false)}
                        color="primary"
                    >
                        {formatMessage(MESSAGES.cancel)}
                    </Button>
                    <LoadingButton
                        onClick={handleDelete}
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        loading={isDeleting}
                    >
                        {formatMessage(MESSAGES.deleteCostUnit)}
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </CardStyled>
    );
};
