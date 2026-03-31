import React, { FC, useCallback, useMemo, useState } from 'react';
import { Alert, AlertTitle } from '@mui/material';
import {
    ConfirmCancelModal,
    IntlMessage,
    useSafeIntl,
} from 'bluesquare-components';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { MetricType, MetricTypeFormModel } from '../../planning/types/metrics';
import { useCreateOrUpdateMetricType } from '../hooks/useCreateOrUpdateMetricType';
import { useMetricTypeFormState } from '../hooks/useMetricTypeFormState';
import { MESSAGES } from '../messages';
import { MetricTypeForm } from './DataLayerForm';

interface MetricTypeDialogProps {
    open: boolean;
    closeDialog: () => void;
    metricType?: MetricType;
}

export const DataLayerDialog: FC<MetricTypeDialogProps> = ({
    open,
    closeDialog,
    metricType = undefined,
}) => {
    const [errorMessage, setErrorMessage] = useState<IntlMessage | undefined>();
    const [errorHeadline, setErrorHeadline] = useState<
        IntlMessage | undefined
    >();
    const { formatMessage } = useSafeIntl();

    const setErrorCode = useCallback(
        (code?: string) => {
            if (!code) {
                setErrorMessage(undefined);
                setErrorHeadline(undefined);
                return;
            }

            setErrorMessage(
                MESSAGES[code as keyof typeof MESSAGES] ??
                    MESSAGES.genericError,
            );
            setErrorHeadline(
                MESSAGES[`${code}Headline` as keyof typeof MESSAGES] ??
                    MESSAGES.genericErrorHeadline,
            );
        },
        [setErrorMessage, setErrorHeadline],
    );

    const { mutate: submitMetricType } = useCreateOrUpdateMetricType({
        onError: (errorCode: string) => setErrorCode(`${errorCode}Error`),
        onSuccess: () => {
            setErrorCode(undefined);
            closeDialog();
        },
    });

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
                scale: JSON.stringify(
                    metricType.legend_config.domain,
                ).replaceAll('"', ''),
                legend_type: metricType.legend_type,
                origin: metricType.origin,
                legend_config: metricType.legend_config.domain.map(
                    (value, index) => ({
                        value,
                        color: metricType.legend_config.range[index],
                    }),
                ),
            };
        }
        return undefined;
    }, [metricType]);

    const onSubmit = (values: MetricTypeFormModel) => {
        const payload = {
            ...values,
            legend_config: {
                domain: values.legend_config.map(item => item.value),
                range: values.legend_config.map(item => item.color),
            },
        };
        submitMetricType(payload);
    };

    const formik = useMetricTypeFormState(metricTypeFormModel, onSubmit);

    const handleCancel = () => {
        setErrorCode(undefined);
        closeDialog();
    };

    return (
        <ConfirmCancelModal
            open={open}
            onClose={closeDialog}
            id={'metric-type-dialog'}
            dataTestId={'metric-type-dialog'}
            titleMessage={
                metricType
                    ? formatMessage(MESSAGES.editLayer)
                    : formatMessage(MESSAGES.createLayer)
            }
            closeDialog={closeDialog}
            onConfirm={formik.handleSubmit}
            onCancel={handleCancel}
            confirmMessage={
                metricType ? MESSAGES.editLayer : MESSAGES.createLayer
            }
            cancelMessage={MESSAGES.cancel}
            closeOnConfirm={false}
            allowConfirm={formik.isValid && formik.dirty && !formik.isSubmitting}
        >
            <ExtendedFormikProvider formik={formik}>
                <MetricTypeForm metricType={metricTypeFormModel} />
            </ExtendedFormikProvider>
            {errorMessage && (
                <Alert severity="error" variant="filled" sx={{ mt: 2 }}>
                    <AlertTitle>{formatMessage(errorHeadline)}</AlertTitle>
                    {formatMessage(errorMessage)}
                </Alert>
            )}
        </ConfirmCancelModal>
    );
};
