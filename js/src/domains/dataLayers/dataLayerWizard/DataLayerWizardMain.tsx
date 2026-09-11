import React, { FC } from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { StepDataMain } from './steps/StepDataMain';
import { DataLayerWizardController } from './useDataLayerWizardController';
import { WizardMapPreview } from './useWizardMapPreview';

type Props = {
    controller: DataLayerWizardController;
    /** Fetched once by the page (see `useWizardMapPreview`) and shared with the
     *  sidebar, rather than each place that needs a piece of it polling again. */
    preview: WizardMapPreview;
    orgUnits: OrgUnit[];
};

/** Full-width right-hand content for the wizard's Data step (standard layers).
 *  Composite layers use the node editor instead; the map shows for every other step. */
export const DataLayerWizardMain: FC<Props> = ({
    controller,
    preview,
    orgUnits,
}) => {
    const { formik, staged, setGridValue } = controller;
    return (
        <ExtendedFormikProvider formik={formik}>
            <StepDataMain
                layerType={staged.layerType}
                method={staged.method}
                csvFile={staged.csvFile}
                orgUnits={orgUnits}
                gridValues={staged.gridValues}
                onGridChange={setGridValue}
                values={formik.values}
                openHexaStatus={preview.openHexaStatus}
                previewReady={preview.ready}
                previewMetricValues={preview.metricValues}
                previewLegendConfig={preview.legendConfig}
            />
        </ExtendedFormikProvider>
    );
};
