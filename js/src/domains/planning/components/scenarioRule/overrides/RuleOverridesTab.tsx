import React, {
    FC,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../../constants/overrideColors';
import { useElementSize } from '../../../../../hooks/useElementSize';
import { useGetBudgetSettings } from '../../../../../hooks/useGetBudgetSettings';
import { useGetExtendedFormikContext } from '../../../../../hooks/useGetExtendedFormikContext';
import { useGetGrants } from '../../../../costManagement/grants/hooks/useGetGrants';
import { useGetCostBreakdownLines } from '../../../../interventions/hooks/useGetCostBreakdownLines';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { ScenarioRuleFormValues } from '../../../hooks/useScenarioRuleFormState';
import {
    bufferMultiplierToPercent,
    DEFAULT_BUFFER_MULTIPLIER,
} from '../../../libs/cost-utils';
import {
    countInterventionOverrides,
    findInterventionOverride,
} from '../../../libs/override-utils';
import { findInterventionWithCategory } from '../../../libs/rule-utils';
import { InterventionOverrideCard } from './InterventionOverrideCard';
import { overridesGridStyles } from './overridesGrid';

const GLOW_SPACE = 3;

const styles = {
    stickySummary: {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        mx: -2,
        px: 2,
        pt: 2,
        pb: `${16 - GLOW_SPACE}px`,
        backgroundColor: 'background.paper',
    },
    cards: {
        pt: `${GLOW_SPACE}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
    },
    summary: {
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        backgroundColor: 'grey.100',
    },
    summaryText: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flex: '1 1 auto',
        minWidth: 0,
    },
    secondaryText: { color: 'text.secondary', textWrap: 'pretty' },
    hint: { color: 'text.secondary', textWrap: 'pretty', mt: 0.5 },
    empty: {
        mt: 2,
        py: 4,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
        border: `1px dashed ${overrideColors.inputBorder}`,
        borderRadius: 2,
    },
} satisfies SxStyles;

export const RuleOverridesTab: FC = () => {
    const { formatMessage } = useSafeIntl();
    const {
        scenarioYears: years,
        interventionCategories,
        currency,
        focusedOverrideInterventionId,
        overrideFocusRequest,
        selectOverride,
    } = usePlanningContext();
    const { values, setFieldValueAndState } =
        useGetExtendedFormikContext<ScenarioRuleFormValues>();
    const { data: costLines = [] } = useGetCostBreakdownLines();
    const { data: grants = [] } = useGetGrants();
    const { data: budgetSettings } = useGetBudgetSettings();


    const { ref: summaryRef, size: summarySize } =
        useElementSize<HTMLDivElement>();
    const summaryHeight = summarySize?.height ?? 0;
    const defaultBufferPercent = bufferMultiplierToPercent(
        Number(budgetSettings?.buffer ?? DEFAULT_BUFFER_MULTIPLIER),
    );

    const interventions = useMemo(
        () =>
            values.interventions.flatMap(interventionId => {
                const match = findInterventionWithCategory(
                    interventionCategories,
                    interventionId,
                );
                if (!match) return [];
                const { category, intervention } = match;
                const override = findInterventionOverride(
                    values.intervention_overrides,
                    interventionId,
                );
                return [
                    {
                        intervention,
                        category,
                        overrideCount: countInterventionOverrides(override),
                        costLines: costLines.filter(
                            line => line.intervention === interventionId,
                        ),
                    },
                ];
            }),
        [
            values.interventions,
            values.intervention_overrides,
            interventionCategories,
            costLines,
        ],
    );

    const totalOverrides = interventions.reduce(
        (total, item) => total + item.overrideCount,
        0,
    );
    const changedInterventions = interventions.filter(
        item => item.overrideCount > 0,
    );

    const handleRevertAll = useCallback(
        () =>
            setFieldValueAndState(
                'intervention_overrides',
                values.intervention_overrides
                    .filter(override => override.deployment_years !== null)
                    .map(override => ({
                        ...override,
                        grant: null,
                        cost_lines: [],
                    })),
            ),
        [setFieldValueAndState, values.intervention_overrides],
    );

    if (interventions.length === 0) {
        return (
            <Typography variant="body2" sx={styles.empty}>
                {formatMessage(MESSAGES.overridesEmpty)}
            </Typography>
        );
    }

    return (
        <Box>
            <Box ref={summaryRef} sx={styles.stickySummary}>
            <Box sx={styles.summary}>
                <Box sx={styles.summaryText}>
                    <Typography variant="body2" fontWeight="medium">
                        {totalOverrides > 0
                            ? formatMessage(MESSAGES.overridesSummary, {
                                  overrides: formatMessage(
                                      MESSAGES.overrideCount,
                                      { count: totalOverrides },
                                  ),
                                  changed: changedInterventions.length,
                                  total: interventions.length,
                              })
                            : formatMessage(MESSAGES.overridesNone)}
                    </Typography>
                    {changedInterventions.length > 0 && (
                        <Typography variant="caption" sx={styles.secondaryText}>
                            {changedInterventions
                                .map(
                                    item =>
                                        formatMessage(
                                            MESSAGES.overrideBreakdownItem,
                                            {
                                                intervention:
                                                    item.intervention.name,
                                                overrides: formatMessage(
                                                    MESSAGES.overrideCount,
                                                    {
                                                        count: item.overrideCount,
                                                    },
                                                ),
                                            },
                                        ),
                                )
                                .join(' · ')}
                        </Typography>
                    )}
                    <Typography variant="caption" sx={styles.hint}>
                        {formatMessage(MESSAGES.overridesHint)}
                    </Typography>
                </Box>
                {totalOverrides > 0 && (
                    <Button
                        size="small"
                        startIcon={<UndoIcon sx={overridesGridStyles.smallIcon} />}
                        onClick={handleRevertAll}
                        sx={overridesGridStyles.textAction}
                    >
                        {formatMessage(MESSAGES.revertAll)}
                    </Button>
                )}
            </Box>
            </Box>
            <Box sx={styles.cards}>
            {interventions.map(item => (
                    <InterventionOverrideCard
                        key={item.intervention.id}
                        interventionId={item.intervention.id}
                        interventionName={item.intervention.name}
                        categoryName={item.category.name}
                        defaultGrantId={item.intervention.grant ?? null}
                        costLines={item.costLines}
                        grants={grants}
                        years={years}
                        currency={currency}
                        defaultBufferPercent={defaultBufferPercent}
                        isActive={
                            focusedOverrideInterventionId ===
                            item.intervention.id
                        }
                        focusRequest={overrideFocusRequest}
                        onSelect={selectOverride}
                        scrollMarginTop={summaryHeight + GLOW_SPACE}
                    />
                ))}
            </Box>
        </Box>
    );
};
