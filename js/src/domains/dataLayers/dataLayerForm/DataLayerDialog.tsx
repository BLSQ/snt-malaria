import React, { FC, useCallback, useMemo, useState } from 'react';
import { Alert, AlertTitle } from '@mui/material';
import {
    ConfirmCancelModal,
    DropdownOptions,
    IntlMessage,
    LoadingSpinner,
    useSafeIntl,
} from 'bluesquare-components';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { useGetCompositeLayer } from '../../compositeLayerEditor/hooks/useGetCompositeLayers';
import { useSaveCompositeLayer } from '../../compositeLayerEditor/hooks/useSaveCompositeLayer';
import { CompositeDraft } from '../../compositeLayerEditor/types/compositeLayer';
import { FlumeGraph } from '../../compositeLayerEditor/types/flumeGraph';
import { findOutputNode } from '../../compositeLayerEditor/utils/graph';
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
    /** Whether composite layers are available (dev-features flag + settings-write permission). */
    showCompositeLayers?: boolean;
    /** Set when the edited layer is a composite: identifies its composite layer record. */
    compositeLayerId?: number;
    /** Opens the node editor for a brand-new composite with the metadata collected here. */
    onCreateCompositeDraft?: (draft: CompositeDraft) => void;
}

/** Read the legend choice + any manual buckets stored on a composite graph's output node. */
const readGraphLegend = (
    graph?: FlumeGraph,
): {
    legendType: string;
    legendConfig?: { domain: (number | string)[]; range: string[] };
} => {
    const outputNode = graph ? findOutputNode(graph) : undefined;
    const legend = outputNode?.inputData?.legend;
    return {
        legendType: (legend?.legendType as string) || 'auto',
        legendConfig: legend?.legendConfig,
    };
};

/** Legend types that need manually-configured buckets (as opposed to auto/from-connected-layer). */
const isConcreteLegend = (legendType: string): boolean =>
    legendType !== 'auto' && legendType !== 'reference';

export const DataLayerDialog: FC<MetricTypeDialogProps> = ({
    open,
    closeDialog,
    metricType = undefined,
    categoryOptions,
    showCompositeLayers = false,
    compositeLayerId = undefined,
    onCreateCompositeDraft = undefined,
}) => {
    const [errorMessage, setErrorMessage] = useState<IntlMessage | undefined>();
    const [errorHeadline, setErrorHeadline] = useState<
        IntlMessage | undefined
    >();
    const { formatMessage } = useSafeIntl();

    const isEditingComposite = compositeLayerId !== undefined;
    // Editing a composite needs its graph to read the legend choice (the MetricType only stores the
    // resolved concrete legend) and to write the choice back on save.
    const { data: compositeLayer, isLoading: isLoadingComposite } =
        useGetCompositeLayer(isEditingComposite ? compositeLayerId : undefined);
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
            // For a composite the legend choice lives in the graph, not the resolved MetricType;
            // prefer any manual buckets stored there, falling back to the resolved config.
            const graphLegend = isEditingComposite
                ? readGraphLegend(compositeLayer?.graph)
                : undefined;
            const legendSource =
                graphLegend?.legendConfig ?? metricType.legend_config;
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
                legend_type: graphLegend
                    ? graphLegend.legendType
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

    const onSubmit = (values: MetricTypeFormModel) => {
        // Composite variant: name/legend are owned here, the values themselves come from a graph.
        if (values.is_composite) {
            const metadata = {
                name: values.name,
                category: values.category,
                description: values.description,
                units: values.units,
                unit_symbol: values.unit_symbol,
                is_population: !!values.is_population,
            };
            // Concrete legend types carry manually-configured buckets; auto/reference compute them.
            const legendConfig = isConcreteLegend(values.legend_type)
                ? {
                      domain: values.legend_config.map(item => item.value),
                      range: values.legend_config.map(item => item.color),
                  }
                : undefined;
            if (isEditingComposite && compositeLayer?.graph) {
                // Write the legend choice (+ manual buckets) back into the graph's output node, then
                // re-run server-side. Dropping legendConfig for auto/reference clears any stale buckets.
                const graph: FlumeGraph = JSON.parse(
                    JSON.stringify(compositeLayer.graph),
                );
                const outputNode = findOutputNode(graph);
                if (outputNode) {
                    outputNode.inputData = {
                        ...outputNode.inputData,
                        legend: {
                            legendType: values.legend_type,
                            ...(legendConfig ? { legendConfig } : {}),
                        },
                    };
                }
                saveCompositeLayer(
                    { graph, id: compositeLayerId, ...metadata },
                    {
                        onSuccess: () => {
                            setErrorCode(undefined);
                            closeDialog();
                        },
                    },
                );
            } else if (onCreateCompositeDraft) {
                // Brand-new composite: hand the metadata + legend choice to the node editor.
                onCreateCompositeDraft({
                    ...metadata,
                    legendType: values.legend_type,
                    legendConfig,
                });
                closeDialog();
            }
            return;
        }

        const payload = {
            ...values,
            metric_kind: values.is_population ? 'population' : 'any',
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

    // Creating a composite continues into the node editor rather than saving straight away.
    const isCreatingComposite = !metricType && formik.values.is_composite;
    const confirmMessage = metricType
        ? MESSAGES.editLayer
        : isCreatingComposite
          ? MESSAGES.continueToEditor
          : MESSAGES.createLayer;

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
            {isEditingComposite && isLoadingComposite ? (
                <LoadingSpinner absolute />
            ) : (
                <ExtendedFormikProvider formik={formik}>
                    <MetricTypeForm
                        metricType={metricTypeFormModel}
                        isRestricted={metricType?.origin === 'openhexa'}
                        categoryOptions={categoryOptions}
                        showCompositeLayers={showCompositeLayers}
                    />
                </ExtendedFormikProvider>
            )}
            {errorMessage && (
                <Alert severity="error" variant="filled" sx={{ mt: 2 }}>
                    <AlertTitle>{formatMessage(errorHeadline)}</AlertTitle>
                    {formatMessage(errorMessage)}
                </Alert>
            )}
        </ConfirmCancelModal>
    );
};
