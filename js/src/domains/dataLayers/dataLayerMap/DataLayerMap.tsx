import React, { FC, useCallback } from 'react';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Map as SNTMap } from '../../../components/Map';
import {
    getColorForShape,
    useGetOrgUnitMetric,
} from '../../planning/libs/map-utils';
import { MetricType, MetricValue } from '../../planning/types/metrics';

type Props = {
    metricType?: MetricType;
    metricValues?: MetricValue[];
    orgUnits: OrgUnit[];
};

export const DataLayerMap: FC<Props> = ({
    metricType,
    metricValues,
    orgUnits,
}) => {
    const getSelectedMetric = useGetOrgUnitMetric(metricValues);

    // Format metric value for an org unit
    const formatMetricValue = useCallback(
        (orgUnitId: number) => {
            const selectedMetric = getSelectedMetric(orgUnitId);
            if (selectedMetric === undefined || selectedMetric === null)
                return 'N/A';

            if (typeof selectedMetric.label === 'number') {
                return Math.round(selectedMetric.label * 100) / 100;
            }
            return selectedMetric.label;
        },
        [getSelectedMetric],
    );

    const getMapStyleForOrgUnit = useCallback(
        (orgUnitId: number) => {
            const selectedMetric = getSelectedMetric(orgUnitId);
            const color = getColorForShape(
                selectedMetric?.value,
                metricType?.legend_type,
                metricType?.legend_config,
            );
            return { color, label: formatMetricValue(orgUnitId) };
        },
        [getSelectedMetric, metricType, formatMetricValue],
    );

    return (
        <SNTMap
            id={'data-layer-map'}
            orgUnits={orgUnits}
            legendConfig={metricType}
            getOrgUnitMapMisc={getMapStyleForOrgUnit}
        />
    );
};
