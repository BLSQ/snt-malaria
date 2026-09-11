import React, { FC } from 'react';
import { Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MapLegendConfig } from '../../dataLayerMap/DataLayerMap';
import { OpenHexaImportStatus } from '../../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../../messages';
import { MetricTypeFormModel, MetricValue } from '../../types/metrics';
import { StandardValueMethod, WizardLayerType } from '../constants';
import { ManualValueGrid } from '../ManualValueGrid';
import { OpenHexaImportStatusMessage } from '../OpenHexaImportStatusMessage';
import { WizardDataMapPreview } from '../WizardDataMapPreview';
import { WizardMainCard } from '../WizardMainCard';

type Props = {
    layerType: WizardLayerType;
    method: StandardValueMethod;
    csvFile: File | null;
    orgUnits: OrgUnit[];
    gridValues: Record<number, string>;
    onGridChange: (orgUnitId: number, value: string) => void;
    values: MetricTypeFormModel;
    createdMetricTypeId?: number;
    openHexaStatus?: OpenHexaImportStatus;
    previewReady: boolean;
    previewMetricValues?: MetricValue[];
    previewLegendConfig: MapLegendConfig;
};

export const StepDataMain: FC<Props> = ({
    layerType,
    method,
    csvFile,
    orgUnits,
    gridValues,
    onGridChange,
    values,
    openHexaStatus,
    previewReady,
    previewMetricValues,
    previewLegendConfig,
}) => {
    const { formatMessage } = useSafeIntl();
    const header = (
        <Typography variant="h6">
            {formatMessage(MESSAGES.wizardStepData)}
        </Typography>
    );

    if (layerType === 'openhexa') {
        if (previewReady) {
            return (
                <WizardDataMapPreview
                    header={header}
                    legendConfig={previewLegendConfig}
                    metricValues={previewMetricValues}
                    orgUnits={orgUnits}
                />
            );
        }
        return (
            <WizardMainCard header={header} centered>
                <Typography variant="h6">{values.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {values.code}
                    {values.units ? ` · ${values.units}` : ''}
                </Typography>
                <OpenHexaImportStatusMessage status={openHexaStatus} />
            </WizardMainCard>
        );
    }

    if (method === 'manual') {
        return (
            <WizardMainCard header={header}>
                <ManualValueGrid
                    orgUnits={orgUnits}
                    values={gridValues}
                    onChange={onGridChange}
                    units={values.units}
                    unitSymbol={values.unit_symbol}
                />
            </WizardMainCard>
        );
    }

    if (csvFile) {
        return (
            <WizardDataMapPreview
                header={
                    <Stack>
                        {header}
                        <Typography variant="caption" color="text.secondary">
                            {csvFile.name}
                        </Typography>
                    </Stack>
                }
                legendConfig={previewLegendConfig}
                metricValues={previewMetricValues}
                orgUnits={orgUnits}
            />
        );
    }

    return (
        <WizardMainCard header={header} centered>
            <Typography variant="body1">
                {formatMessage(MESSAGES.importCSV)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {formatMessage(MESSAGES.importCSVYearCaption)}
            </Typography>
        </WizardMainCard>
    );
};
