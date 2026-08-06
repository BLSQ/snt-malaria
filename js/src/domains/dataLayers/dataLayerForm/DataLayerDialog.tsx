import React, { FC, useCallback, useMemo, useState } from 'react';
import { Alert, AlertTitle } from '@mui/material';
import {
    ConfirmCancelModal,
    DropdownOptions,
    IntlMessage,
    useSafeIntl,
} from 'bluesquare-components';
import { isConcreteLegend } from '../../../constants/legend';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { useSaveCompositeLayer } from '../../compositeLayerEditor/hooks/useSaveCompositeLayer';
import { CompositeLayerListItem } from '../../compositeLayerEditor/types/compositeLayer';
import { useCreateOrUpdateMetricType } from '../hooks/useCreateOrUpdateMetricType';
import { useMetricTypeFormState } from '../hooks/useMetricTypeFormState';
import { MESSAGES } from '../messages';
import { MetricType, MetricTypeFormModel } from '../types/metrics';
import { MetricTypeForm } from './DataLayerForm';

interface MetricTypeDialogProps {
    open: boolean;
    closeDialog: () => void;
    metricType?: MetricType;
    categoryOptions: DropdownOptions<string>[];
    showCompositeLayers?: boolean;
    /** Composite layer record of the edited layer, when it is a composite. */
    compositeLayer?: CompositeLayerListItem;
    /** Called with the id of a freshly created composite, to continue into the node editor. */
    onCompositeCreated?: (compositeLayerId: number) => void;
}

export const DataLayerDialog: FC<MetricTypeDialogProps> = ({
    open,
    closeDialog,
    metricType = undefined,
    categoryOptions,
    showCompositeLayers = false,
    compositeLayer = undefined,
    onCompositeCreated = undefined,
}) => {
    const [errorMessage, setErrorMessage] = useState<IntlMessage | undefined>();
    const [errorHeadline, setErrorHeadline] = useState<
        IntlMessage | undefined
    >();
    const { formatMessage } = useSafeIntl();

    const isEditingComposite = compositeLayer !== undefined;
    const { mutate: saveCompositeLayer } = useSaveCompositeLayer();

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
            // A composite's legend lives on its composite layer record; the MetricType holds what
            // the last run resolved it to.
            const legendSource = isEditingComposite
                ? compositeLayer.legend_config
                : metricType.legend_config;
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
                legend_type: isEditingComposite
                    ? compositeLayer.legend_type
                    : metricType.legend_type,
                origin: metricType.origin,
                is_population: metricType.metric_kind === 'population',
                is_composite: isEditingComposite,
                legend_config: (legendSource.domain || []).map(
                    (value, index) => ({
                        value,
                        color: (legendSource.range || [])[index],
                    }),
                ),
            };
        }
        return undefined;
    }, [metricType, isEditingComposite, compositeLayer]);

    // A composite's values come from its graph, so only the metadata + legend are saved here.
    const submitCompositeLayer = (values: MetricTypeFormModel) => {
        saveCompositeLayer(
            {
                id: compositeLayer?.id,
                name: values.name,
                category: values.category,
                description: values.description,
                units: values.units,
                unit_symbol: values.unit_symbol,
                is_population: !!values.is_population,
                legend_type: values.legend_type,
                legend_config: isConcreteLegend(values.legend_type)
                    ? {
                          domain: values.legend_config.map(item => item.value),
                          range: values.legend_config.map(item => item.color),
                      }
                    : undefined,
            },
            {
                onSuccess: saved => {
                    setErrorCode(undefined);
                    closeDialog();
                    if (!compositeLayer) {
                        onCompositeCreated?.(saved.id);
                    }
                },
            },
        );
    };

    const submitDataLayer = ({
        is_composite: _isComposite,
        ...values
    }: MetricTypeFormModel) => {
        submitMetricType({
            ...values,
            metric_kind: values.is_population ? 'population' : 'any',
            legend_config: {
                domain: values.legend_config.map(item => item.value),
                range: values.legend_config.map(item => item.color),
            },
        });
    };

    const onSubmit = (values: MetricTypeFormModel) =>
        values.is_composite
            ? submitCompositeLayer(values)
            : submitDataLayer(values);

    const formik = useMetricTypeFormState(metricTypeFormModel, onSubmit);

    const handleCancel = () => {
        setErrorCode(undefined);
        closeDialog();
    };

    // Creating a composite saves it, then continues into the node editor.
    const isCreatingComposite = !metricType && formik.values.is_composite;
    const confirmMessage =
        (metricType && MESSAGES.editLayer) ||
        (isCreatingComposite && MESSAGES.continueToEditor) ||
        MESSAGES.createLayer;

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
            confirmMessage={confirmMessage}
            cancelMessage={MESSAGES.cancel}
            closeOnConfirm={false}
            allowConfirm={
                formik.isValid && formik.dirty && !formik.isSubmitting
            }
        >
            <ExtendedFormikProvider formik={formik}>
                <MetricTypeForm
                    metricType={metricTypeFormModel}
                    isRestricted={metricType?.origin === 'openhexa'}
                    categoryOptions={categoryOptions}
                    showCompositeLayers={showCompositeLayers}
                />
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
