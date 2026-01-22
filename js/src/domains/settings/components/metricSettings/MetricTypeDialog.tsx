import React, { FC, useCallback, useMemo, useRef } from 'react';
import { ConfirmCancelModal, useSafeIntl } from 'bluesquare-components';
import {
    MetricType,
    MetricTypeFormModel,
} from '../../../planning/types/metrics';
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
    const { formatMessage } = useSafeIntl();
    const { mutate: submitMetricType } = useCreateOrUpdateMetricType();
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

    const handleSubmit = useCallback(
        (metricType: MetricTypeFormModel) => {
            submitMetricType(metricType);
            // You can handle the submitted metricType here if needed
            // closeDialog();
        },
        [closeDialog],
    );

    const handleCancel = () => {
        // TODO: Clean the form
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
                onSubmit={handleSubmit}
            />
        </ConfirmCancelModal>
    );
};
