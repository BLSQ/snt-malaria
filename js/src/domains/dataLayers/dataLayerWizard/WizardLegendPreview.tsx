import React, { FC, useEffect, useMemo, useState } from 'react';
import { Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { isConcreteLegend } from '../../../constants/legend';
import { legendConfigFromForm } from '../dataLayerForm/legendScale';
import { DataLayerMap, MapLegendConfig } from '../dataLayerMap/DataLayerMap';
import { MESSAGES } from '../messages';
import { MetricValue, ScaleDomainRange } from '../types/metrics';
import { parseTemplateCsv } from './csvFromGrid';
import { DataLayerWizardController } from './useDataLayerWizardController';
import { WizardMainCard } from './WizardMainCard';
import { WizardPreviewPlaceholder } from './WizardPreviewPlaceholder';

type Props = {
    controller: DataLayerWizardController;
    orgUnits: OrgUnit[];
};

const toMetricValue = (orgUnitId: number, raw: string): MetricValue => {
    const numeric = Number(raw);
    return {
        id: -orgUnitId,
        metric_type: -1,
        org_unit: orgUnitId,
        year: null,
        value: Number.isFinite(numeric) ? numeric : (null as unknown as number),
        string_value: Number.isFinite(numeric) ? '' : raw,
    };
};

/** Legend-step map preview built from the values staged in the wizard (manual grid
 *  or the uploaded CSV) and the legend currently being edited — never the layer that
 *  happened to be selected before the wizard opened. Composite layers configure
 *  their legend before the graph exists, and OpenHexa values arrive only after the
 *  post-create import, so both get a placeholder here. */
export const WizardLegendPreview: FC<Props> = ({ controller, orgUnits }) => {
    const { formatMessage } = useSafeIntl();
    const { formik, staged } = controller;
    const values = formik.values;

    // Decode the uploaded file once; re-parsing on a `code` change is cheap.
    const [csvText, setCsvText] = useState<string>('');
    useEffect(() => {
        if (staged.method !== 'csv' || !staged.csvFile) {
            setCsvText('');
            return undefined;
        }
        let cancelled = false;
        staged.csvFile.text().then(text => {
            if (!cancelled) setCsvText(text);
        });
        return () => {
            cancelled = true;
        };
    }, [staged.method, staged.csvFile]);

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

    const metricValues = useMemo(() => {
        if (staged.method === 'manual') {
            return Object.entries(staged.gridValues)
                .filter(([, raw]) => raw.trim() !== '')
                .map(([orgUnitId, raw]) =>
                    toMetricValue(Number(orgUnitId), raw.trim()),
                );
        }
        return parseTemplateCsv(csvText, values.code).map(row =>
            toMetricValue(row.orgUnitId, row.value),
        );
    }, [staged.method, staged.gridValues, csvText, values.code]);

    if (staged.layerType === 'composite') {
        return <WizardPreviewPlaceholder />;
    }
    if (staged.layerType === 'openhexa') {
        return (
            <WizardPreviewPlaceholder
                message={MESSAGES.wizardPreviewAfterImport}
            />
        );
    }

    return (
        <WizardMainCard
            header={
                <Typography variant="h6" noWrap>
                    {values.name || formatMessage(MESSAGES.wizardStepLegend)}
                </Typography>
            }
        >
            <DataLayerMap
                legendConfig={legendConfig}
                metricValues={metricValues}
                orgUnits={orgUnits}
            />
        </WizardMainCard>
    );
};
