import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { InterventionSelect } from '../../../../components/InterventionSelect';
import { Map } from '../../../../components/Map';
import { MapActionBox } from '../../../../components/MapActionBox';
import { defaultLegend, severityColorRange } from '../../libs/color-utils';
import { formatBigNumber } from '../../libs/cost-utils';
import { getColorForShape } from '../../libs/map-utils';
import { BudgetOrgUnit } from '../../types/budget';
import { Intervention } from '../../types/interventions';

const styles: SxStyles = {
    mainBox: {
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
    },
};

type Props = {
    orgUnitCosts?: BudgetOrgUnit[];
    orgUnits: OrgUnit[];
};

export const OrgUnitCostMap: FC<Props> = ({ orgUnitCosts, orgUnits }) => {
    const [selectedInterventionId, setSelectedInterventionId] = useState<
        number | null
    >(0);

    const getActiveCost = useCallback(
        orgUnitCost =>
            selectedInterventionId && selectedInterventionId !== 0
                ? (orgUnitCost.interventions.find(
                      i => i.id === selectedInterventionId,
                  )?.total_cost ?? 0)
                : orgUnitCost.total_cost,
        [selectedInterventionId],
    );

    const legendConfig = useMemo(() => {
        const costs = orgUnitCosts?.map(ouc => getActiveCost(ouc)) ?? [];
        const maxCost = Math.max(...costs);
        const stepSize = maxCost / 6;
        const legend = {
            range: severityColorRange,
            domain: Array.from({ length: 5 }, (_, i) => (i + 1) * stepSize),
        };

        return {
            units: '',
            legend_type: 'threshold',
            legend_config: legend,
            unit_symbol: '',
        };
    }, [orgUnitCosts, getActiveCost]);

    const getOrgUnitMapMisc = useCallback(
        orgUnitId => {
            const ouc = orgUnitCosts?.find(c => c.org_unit_id === orgUnitId);
            if (!ouc || ouc.total_cost <= 0) {
                return { color: defaultLegend, label: '0' };
            }
            const cost = getActiveCost(ouc);

            const fillColor = getColorForShape(
                cost,
                legendConfig.legend_type,
                legendConfig.legend_config,
            );
            return {
                color: fillColor as string,
                label: formatBigNumber(cost),
            };
        },
        [orgUnitCosts, legendConfig, getActiveCost],
    );

    const interventions = useMemo(() => {
        if (!orgUnitCosts) {
            return [];
        }

        const oucInterventions =
            orgUnitCosts?.flatMap(ouc => ouc.interventions) ?? [];

        // Map to unique interventions by id
        const allInterventions = oucInterventions?.reduce(
            (acc, intervention) => {
                return acc[intervention.id]
                    ? acc
                    : {
                          ...acc,
                          [intervention.id]: {
                              code: intervention.code,
                              name: intervention.type,
                              short_name: intervention.type,
                              id: intervention.id,
                          },
                      };
            },
            {},
        );
        return Object.values<Intervention>(allInterventions);
    }, [orgUnitCosts]);

    return (
        <Box height="100%" width="100%" sx={styles.mainBox}>
            <MapActionBox>
                <InterventionSelect
                    onInterventionSelect={setSelectedInterventionId}
                    interventions={interventions}
                    selectedInterventionId={selectedInterventionId}
                />
            </MapActionBox>
            <Map
                id="org_unit_cost_map"
                orgUnits={orgUnits}
                getOrgUnitMapMisc={getOrgUnitMapMisc}
                legendConfig={legendConfig}
            />
        </Box>
    );
};
