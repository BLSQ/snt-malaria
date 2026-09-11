import React, { FC } from 'react';
import { Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
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

/** Legend-step map preview. Every layer type is already created by the time this
 *  step is reached (see `useDataLayerWizardController.goNext`) — a standard layer's
 *  values were imported leaving Data, a composite's graph was saved, and an OpenHexa
 *  layer's import is running in the background — so this just fetches the real
 *  thing, coloured with the legend currently being edited. Never the layer that
 *  happened to be selected before the wizard opened. */
export const WizardLegendPreview: FC<Props> = ({
    controller,
    preview,
    orgUnits,
}) => {
    const { formatMessage } = useSafeIntl();
    const { formik } = controller;
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
                <Typography variant="h6" noWrap>
                    {values.name || formatMessage(MESSAGES.wizardStepLegend)}
                </Typography>
            }
            legendConfig={legendConfig}
            metricValues={metricValues}
            orgUnits={orgUnits}
        />
    );
};
