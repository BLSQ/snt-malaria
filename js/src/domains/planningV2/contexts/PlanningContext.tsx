import React, { createContext, useContext } from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { InterventionCategory } from '../../planning/types/interventions';
import { MetricTypeCategory } from '../../planning/types/metrics';

const PlanningContext = createContext({
    scenarioId: 0,
    orgUnits: [] as OrgUnit[],
    metricTypeCategories: [] as MetricTypeCategory[],
    interventionCategories: [] as InterventionCategory[],
});

export const usePlanningContext = () => useContext(PlanningContext);

export const PlanningProvider = ({
    scenarioId,
    orgUnits,
    metricTypeCategories,
    interventionCategories,
    children,
}) => {
    return (
        <PlanningContext.Provider
            value={{
                scenarioId,
                orgUnits,
                metricTypeCategories,
                interventionCategories,
            }}
        >
            {children}
        </PlanningContext.Provider>
    );
};
