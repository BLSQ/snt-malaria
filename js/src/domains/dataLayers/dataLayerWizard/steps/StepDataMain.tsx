import React, { FC } from 'react';
import { Alert, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MESSAGES } from '../../messages';
import { MetricTypeFormModel } from '../../types/metrics';
import { StandardValueMethod, WizardLayerType } from '../constants';
import { ManualValueGrid } from '../ManualValueGrid';
import { WizardMainCard } from '../WizardMainCard';

type Props = {
    layerType: WizardLayerType;
    method: StandardValueMethod;
    csvFile: File | null;
    orgUnits: OrgUnit[];
    gridValues: Record<number, string>;
    onGridChange: (orgUnitId: number, value: string) => void;
    values: MetricTypeFormModel;
};

export const StepDataMain: FC<Props> = ({
    layerType,
    method,
    csvFile,
    orgUnits,
    gridValues,
    onGridChange,
    values,
}) => {
    const { formatMessage } = useSafeIntl();
    const header = (
        <Typography variant="h6">
            {formatMessage(MESSAGES.wizardStepData)}
        </Typography>
    );

    if (layerType === 'openhexa') {
        return (
            <WizardMainCard header={header} centered>
                <Typography variant="h6">{values.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {values.code}
                    {values.units ? ` · ${values.units}` : ''}
                </Typography>
                <Alert severity="info" icon={false} sx={{ maxWidth: 460 }}>
                    {formatMessage(MESSAGES.wizardOpenHexaTaskPending)}
                    <br />
                    {formatMessage(MESSAGES.wizardOpenHexaImportInfo)}
                </Alert>
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

    return (
        <WizardMainCard header={header} centered>
            <Typography variant="body1">
                {csvFile ? csvFile.name : formatMessage(MESSAGES.importCSV)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {formatMessage(MESSAGES.importCSVYearCaption)}
            </Typography>
        </WizardMainCard>
    );
};
