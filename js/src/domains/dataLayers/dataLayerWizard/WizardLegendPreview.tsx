import React, { FC, useMemo } from 'react';
import { MenuItem, Select, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { usePreviewYearSelection } from '../../compositeLayerEditor/hooks/usePreviewYearSelection';
import { MESSAGES } from '../messages';
import { OpenHexaImportStatusMessage } from './OpenHexaImportStatusMessage';
import { DataLayerWizardController } from './useDataLayerWizardController';
import { WizardMapPreview } from './useWizardMapPreview';
import { WizardDataMapPreview } from './WizardDataMapPreview';
import { WizardMainCard } from './WizardMainCard';
import { WizardPreviewPlaceholder } from './WizardPreviewPlaceholder';

type Props = {
    controller: DataLayerWizardController;
    preview: WizardMapPreview;
    orgUnits: OrgUnit[];
};

export const WizardLegendPreview: FC<Props> = ({
    controller,
    preview,
    orgUnits,
}) => {
    const { formatMessage } = useSafeIntl();
    const { formik, staged } = controller;
    const {
        ready,
        isOpenHexa,
        isComposite,
        createdMetricTypeId,
        openHexaStatus,
        metricValues,
        legendConfig,
    } = preview;
    const values = formik.values;
    const isStandard = staged.layerType === 'data';

    const years = useMemo(() => {
        if (!isStandard) return [];
        return Array.from(
            new Set(
                (metricValues ?? [])
                    .map(mv => mv.year)
                    .filter((year): year is number => year != null && year > 0),
            ),
        );
    }, [isStandard, metricValues]);
    const { isMultiYear, selectedYear, setSelectedYear, displayedValues } =
        usePreviewYearSelection(years, metricValues);

    if (isOpenHexa && !ready) {
        return (
            <WizardMainCard centered>
                <OpenHexaImportStatusMessage status={openHexaStatus} />
            </WizardMainCard>
        );
    }
    if (isComposite && !createdMetricTypeId) {
        return <WizardPreviewPlaceholder />;
    }

    return (
        <WizardDataMapPreview
            header={
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={1}
                >
                    <Typography variant="h6" noWrap>
                        {values.name ||
                            formatMessage(MESSAGES.wizardStepLegend)}
                    </Typography>
                    {isMultiYear && (
                        <Select
                            size="small"
                            value={selectedYear}
                            onChange={event =>
                                setSelectedYear(Number(event.target.value))
                            }
                        >
                            {[...years]
                                .sort((a, b) => b - a)
                                .map(year => (
                                    <MenuItem key={year} value={year}>
                                        {year}
                                    </MenuItem>
                                ))}
                        </Select>
                    )}
                </Stack>
            }
            legendConfig={legendConfig}
            metricValues={displayedValues}
            orgUnits={orgUnits}
        />
    );
};
