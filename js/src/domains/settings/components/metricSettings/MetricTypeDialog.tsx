import React, { FC, useMemo, useRef, useState } from 'react';
import { Alert, AlertTitle } from '@mui/material';
import { ConfirmCancelModal, useSafeIntl } from 'bluesquare-components';
import { MetricType } from '../../../planning/types/metrics';
import { useCreateOrUpdateMetricType } from '../../hooks/useCreateOrUpdateMetricType';
import { MESSAGES } from '../../messages';
import { MetricTypeForm } from './MetricTypeForm';

interface MetricTypeDialogProps {
    open: boolean;
    closeDialog: () => void;
    metricType?: MetricType;
}

export const MetricTypeDialog: FC<MetricTypeDialogProps> = ({
    open,
    closeDialog,
    metricType = undefined,
}) => {
    const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
    const { formatMessage } = useSafeIntl();
    const { mutate: submitMetricType } = useCreateOrUpdateMetricType({
        onError: errorCode => setErrorCode(`${errorCode}Error`),
        onSuccess: () => {
            setErrorCode(undefined);
            closeDialog();
        },
    });
    const callbackRef = useRef<() => void>();
    const handleOnRef = (callback: () => void) => {
        callbackRef.current = callback;
    };

    const metricTypeFormModel = useMemo(() => {
        if (metricType) {
            return {
                id: metricType.id,
                name: metricType.name,
                code: metricType.code,
                description: metricType.description,
                source: metricType.source,
                units: metricType.units,
                unit_symbol: metricType.unit_symbol,
                comments: metricType.comments,
                category: metricType.category,
                scale: JSON.stringify(metricType.legend_config.domain),
                legend_type: metricType.legend_type,
                origin: metricType.origin,
            };
        }
        return undefined;
    }, [metricType]);

    const handleConfirm = () => {
        if (callbackRef?.current) {
            callbackRef.current();
        }
    };

    const handleCancel = () => {
        setErrorCode(undefined);
        closeDialog();
    };

    return (
        <ConfirmCancelModal
            open={open}
            onClose={closeDialog}
            id={''}
            dataTestId={''}
            titleMessage={
                metricType
                    ? formatMessage(MESSAGES.editMetricType)
                    : formatMessage(MESSAGES.createMetricType)
            }
            closeDialog={closeDialog}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            confirmMessage={MESSAGES.create}
            cancelMessage={MESSAGES.cancel}
            closeOnConfirm={false}
        >
            <MetricTypeForm
                metricType={metricTypeFormModel}
                onSubmitFormRef={handleOnRef}
                onSubmit={submitMetricType}
            />
            {errorCode && (
                <Alert severity="error" variant="filled" sx={{ mt: 2 }}>
                    <AlertTitle>
                        {formatMessage(
                            MESSAGES[errorCode + 'Headline'] ||
                                MESSAGES.genericErrorHeadline,
                        )}
                    </AlertTitle>
                    {formatMessage(
                        MESSAGES[errorCode] || MESSAGES.genericError,
                    )}
                </Alert>
            )}
        </ConfirmCancelModal>
    );
};
