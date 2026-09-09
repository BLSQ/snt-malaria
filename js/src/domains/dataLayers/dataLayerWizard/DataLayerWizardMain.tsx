import React, { FC } from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { StepDataMain } from './steps/StepDataMain';
import { DataLayerWizardController } from './useDataLayerWizardController';

type Props = {
    controller: DataLayerWizardController;
    orgUnits: OrgUnit[];
};

/** Full-width right-hand content for the wizard's Data step (standard layers).
 *  Composite layers use the node editor instead; the map shows for every other step. */
export const DataLayerWizardMain: FC<Props> = ({ controller, orgUnits }) => {
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
            />
        </ExtendedFormikProvider>
    );
};
