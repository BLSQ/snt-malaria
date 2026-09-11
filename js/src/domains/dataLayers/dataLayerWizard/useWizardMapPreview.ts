import { useMemo } from 'react';
import { isConcreteLegend } from '../../../constants/legend';
import { isSuccessTaskStatus } from '../../../constants/taskStatus';
import { legendConfigFromForm } from '../dataLayerForm/legendScale';
import { MapLegendConfig } from '../dataLayerMap/DataLayerMap';
import { useGetMetricValues } from '../hooks/useGetMetrics';
import {
    OpenHexaImportStatus,
    useGetOpenHexaImportStatus,
} from '../hooks/useGetOpenHexaImportStatus';
import { MetricValue, ScaleDomainRange } from '../types/metrics';
import { DataLayerWizardController } from './useDataLayerWizardController';

export type WizardMapPreview = {
    /** Real values exist to show: a standard/composite layer as soon as it's
     *  created, an OpenHexa one only once its background import task succeeds. */
    ready: boolean;
    isOpenHexa: boolean;
    isComposite: boolean;
    createdMetricTypeId?: number;
    /** OpenHexa's raw import status, so a consumer showing its own progress
     *  message (`OpenHexaImportStatusMessage`) doesn't have to poll it again. */
    openHexaStatus?: OpenHexaImportStatus;
    metricValues?: MetricValue[];
    legendConfig: MapLegendConfig;
};

/** Real values shared by the wizard's Data and Legend steps — never client-parsed,
 *  since every layer type's record already exists by the Data step (see
 *  `useDataLayerWizardController.goNext`). */
export const useWizardMapPreview = (
    controller: DataLayerWizardController,
): WizardMapPreview => {
    const { formik, staged } = controller;
    const values = formik.values;

    const isComposite = staged.layerType === 'composite';
    const isOpenHexa = staged.layerType === 'openhexa';
    const createdMetricTypeId = staged.createdMetricTypeId;

    const { data: openHexaImportStatuses } = useGetOpenHexaImportStatus(
        isOpenHexa && Boolean(createdMetricTypeId),
    );
    const openHexaStatus =
        isOpenHexa && createdMetricTypeId
            ? openHexaImportStatuses?.[createdMetricTypeId]
            : undefined;
    const openHexaReady = isSuccessTaskStatus(openHexaStatus?.status);
    const ready = isOpenHexa ? openHexaReady : Boolean(createdMetricTypeId);

    // Composite's created id lives in the same `createdMetricTypeId` field (set once
    // its shell is minted), so no per-type branch is needed here.
    const previewMetricTypeId = (ready && createdMetricTypeId) || undefined;
    const { data: metricValues } = useGetMetricValues({
        metricTypeId: previewMetricTypeId,
    });

    const legendConfig: MapLegendConfig = useMemo(
        () => ({
            units: values.units,
            unit_symbol: values.unit_symbol,
            legend_type: values.legend_type,
            legend_config: (isConcreteLegend(values.legend_type)
                ? legendConfigFromForm(
                      values.legend_type,
                      values.legend_config,
                      values.legend_top_color,
                  )
                : { domain: [], range: [] }) as ScaleDomainRange,
        }),
        [
            values.units,
            values.unit_symbol,
            values.legend_type,
            values.legend_config,
            values.legend_top_color,
        ],
    );

    return {
        ready,
        isOpenHexa,
        isComposite,
        createdMetricTypeId,
        openHexaStatus,
        metricValues,
        legendConfig,
    };
};
