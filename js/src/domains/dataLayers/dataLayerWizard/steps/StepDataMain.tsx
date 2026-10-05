import React, { FC, useMemo } from 'react';
import { Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MESSAGES } from '../../messages';
import { MetricTypeFormModel, MetricValue } from '../../types/metrics';
import { WizardLayerType } from '../constants';
import { ManualValueGrid } from '../ManualValueGrid';
import { metricValuesToGrid } from '../metricValuesToGrid';
import { WizardMainCard } from '../WizardMainCard';
import { WizardPreviewPlaceholder } from '../WizardPreviewPlaceholder';

type Props = {
    layerType: WizardLayerType;
    orgUnits: OrgUnit[];
    gridValues: Record<number, Record<number, string>>;
    gridYears: number[];
    onGridChange: (orgUnitId: number, year: number, value: string) => void;
    onAddYear: (year: number) => void;
    onRemoveYear: (year: number) => void;
    values: MetricTypeFormModel;
    previewReady: boolean;
    previewMetricValues?: MetricValue[];
};

export const StepDataMain: FC<Props> = ({
    layerType,
    orgUnits,
    gridValues,
    gridYears,
    onGridChange,
    onAddYear,
    onRemoveYear,
    values,
    previewReady,
    previewMetricValues,
}) => {
    const { formatMessage } = useSafeIntl();
    const header = (
        <Typography variant="h6">
            {formatMessage(MESSAGES.wizardStepData)}
        </Typography>
    );
    const openHexaGrid = useMemo(
        () => metricValuesToGrid(previewMetricValues),
        [previewMetricValues],
    );

    if (layerType === 'openhexa') {
        if (previewReady) {
            return (
                <WizardMainCard header={header}>
                    <ManualValueGrid
                        orgUnits={orgUnits}
                        values={openHexaGrid.values}
                        years={openHexaGrid.years}
                        units={values.units}
                        unitSymbol={values.unit_symbol}
                        readOnly
                    />
                </WizardMainCard>
            );
        }
        return <WizardPreviewPlaceholder />;
    }

    return (
        <WizardMainCard header={header}>
            <ManualValueGrid
                orgUnits={orgUnits}
                values={gridValues}
                years={gridYears}
                onChange={onGridChange}
                onAddYear={onAddYear}
                onRemoveYear={onRemoveYear}
                units={values.units}
                unitSymbol={values.unit_symbol}
            />
        </WizardMainCard>
    );
};
