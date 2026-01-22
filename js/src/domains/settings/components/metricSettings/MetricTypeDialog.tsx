import React, { FC } from 'react';
import { ConfirmCancelModal, useSafeIntl } from 'bluesquare-components';
import { MetricType } from '../../../planning/types/metrics';
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
    const handleConfirm = () => {
        // TODO: Submit the form
        closeDialog();
    };

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
            closeOnConfirm={true}
        >
            <MetricTypeForm metricType={metricType} />
        </ConfirmCancelModal>
    );
};
