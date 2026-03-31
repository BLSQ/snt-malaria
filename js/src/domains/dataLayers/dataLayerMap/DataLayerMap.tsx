import React, { FC, useCallback } from 'react';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Map as SNTMap } from '../../../components/Map';
import { mapTheme } from '../../../constants/map-theme';
import {
    getMapStyleForOrgUnit,
    useGetOrgUnitMetric,
} from '../../planning/libs/map-utils';
import { MetricType, MetricValue } from '../../planning/types/metrics';

type Props = {
    metricType?: MetricType;
    metricValues?: MetricValue[];
    orgUnits: OrgUnit[];
};

const defaultOrgUnitStyle = {
    label: '',
    color: mapTheme.shapeColor,
};

export const DataLayerMap: FC<Props> = ({
    metricType,
    metricValues,
    orgUnits,
}) => {
    const getSelectedMetric = useGetOrgUnitMetric(metricValues);

    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => {
            if (!metricType) {
                return defaultOrgUnitStyle;
            }
            const selectedMetric = getSelectedMetric(orgUnitId);

            return getMapStyleForOrgUnit(metricType, selectedMetric);
        },
        [getSelectedMetric, metricType],
    );

    return (
        <SNTMap
            id={'data-layer-map'}
            border
            orgUnits={orgUnits}
            legendConfig={metricType}
            getOrgUnitMapMisc={getOrgUnitMapMisc}
        />
    );
};
