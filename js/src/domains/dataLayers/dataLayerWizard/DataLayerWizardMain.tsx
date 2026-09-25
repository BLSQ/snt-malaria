import React, { FC } from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { StepDataMain } from './steps/StepDataMain';
import { DataLayerWizardController } from './useDataLayerWizardController';
import { WizardMapPreview } from './useWizardMapPreview';

type Props = {
    controller: DataLayerWizardController;
    preview: WizardMapPreview;
    orgUnits: OrgUnit[];
};

export const DataLayerWizardMain: FC<Props> = ({
    controller,
    preview,
    orgUnits,
}) => {
    const { formik, staged, setGridValue, addGridYear, removeGridYear } =
        controller;
    return (
        <ExtendedFormikProvider formik={formik}>
            <StepDataMain
                layerType={staged.layerType}
                orgUnits={orgUnits}
                gridValues={staged.gridValues}
                gridYears={staged.gridYears}
                onGridChange={setGridValue}
                onAddYear={addGridYear}
                onRemoveYear={removeGridYear}
                values={formik.values}
                previewReady={preview.ready}
                previewMetricValues={preview.metricValues}
            />
        </ExtendedFormikProvider>
    );
};
