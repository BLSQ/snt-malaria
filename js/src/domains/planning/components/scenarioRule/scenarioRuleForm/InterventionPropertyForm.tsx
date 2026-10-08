import React, { FC, useCallback, useMemo } from 'react';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import {
    countInterventionOverrides,
    getDeployedYears,
    hasYearValue,
} from '../../../libs/override-utils';
import { DeploymentYearDots } from '../overrides/DeploymentYearDots';
import { OverrideChip } from '../overrides/OverrideChip';
import { useRuleInterventionOverride } from '../overrides/useRuleInterventionOverride';
import { RuleItemCard } from './RuleItemCard';

type Props = {
    interventionId: number;
    interventionName: string;
    categoryName: string;
    onRemove: (interventionId: number) => void;
};

export const InterventionPropertyForm: FC<Props> = ({
    interventionId,
    interventionName,
    categoryName,
    onRemove,
}) => {
    const { formatMessage } = useSafeIntl();
    const {
        scenarioYears: years,
        focusOverride,
        activeTab,
        focusedOverrideInterventionId,
    } = usePlanningContext();
    const { override } = useRuleInterventionOverride(interventionId);

    const deployedYears = useMemo(
        () => getDeployedYears(override, years),
        [override, years],
    );
    const changedYears = useMemo(
        () => years.filter(year => hasYearValue(override, year)),
        [override, years],
    );
    const overrideCount = countInterventionOverrides(override);

    const handleRemove = useCallback(
        () => onRemove(interventionId),
        [onRemove, interventionId],
    );
    const handleClick = useCallback(
        () => focusOverride(interventionId),
        [focusOverride, interventionId],
    );

    return (
        <RuleItemCard
            Icon={VaccinesIcon}
            title={interventionName}
            caption={categoryName}
            onRemove={handleRemove}
            onClick={handleClick}
            clickHint={formatMessage(MESSAGES.interventionOverridesHint)}
            isSelected={
                activeTab === 'overrides' &&
                focusedOverrideInterventionId === interventionId
            }
        >
            {overrideCount > 0 && <OverrideChip count={overrideCount} />}
            <DeploymentYearDots
                years={years}
                deployedYears={deployedYears}
                changedYears={changedYears}
            />
        </RuleItemCard>
    );
};
