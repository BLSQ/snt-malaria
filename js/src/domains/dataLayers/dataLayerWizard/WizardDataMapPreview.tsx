import React, { FC, ReactNode } from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { DataLayerMap, MapLegendConfig } from '../dataLayerMap/DataLayerMap';
import { MetricValue } from '../types/metrics';
import { WizardMainCard } from './WizardMainCard';

type Props = {
    header: ReactNode;
    legendConfig: MapLegendConfig;
    metricValues?: MetricValue[];
    orgUnits: OrgUnit[];
};

/** The map card shown once a layer's real values are ready, on the Legend step. */
export const WizardDataMapPreview: FC<Props> = ({
    header,
    legendConfig,
    metricValues,
    orgUnits,
}) => (
    <WizardMainCard header={header}>
        <DataLayerMap
            legendConfig={legendConfig}
            metricValues={metricValues}
            orgUnits={orgUnits}
        />
    </WizardMainCard>
);
