import React, { FC, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box/Box';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { Side } from '../../../../components/hoverCard/HoverCard';
import { HoverCardActionRow } from '../../../../components/hoverCard/HoverCardActionRow';
import { MESSAGES } from '../../../messages';
import { MetricTypeCriterion } from '../../types/scenarioRule';
import {
    getOperatorOption,
    Operator,
} from '../scenarioRule/scenarioRuleForm/CriterionOperatorSelect';
import {
    THRESHOLD_OPERATORS,
    buildOperatorPreviewRules,
    useCriterionPreview,
} from './useCriterionPreview';

const styles = {
    list: {
        display: 'flex',
        flexDirection: 'column',
        padding: '2px 0 6px',
    },
    upwardsList: {
        flexDirection: 'column-reverse',
        padding: '6px 0 2px',
    },
} satisfies SxStyles;

type Props = {
    metricTypeId: number;
    value: number;
    currentCriterion?: MetricTypeCriterion;
    dataLayerYears?: Record<string, number>;
    isActive: boolean;
    side: Side;
    onPreview: (orgUnitIds: number[] | undefined) => void;
    /** `matches` are the org units the operator matches, when known. */
    onApply: (operator: Operator, matches?: number[]) => void;
};

export const CriterionOperatorActions: FC<Props> = ({
    metricTypeId,
    value,
    currentCriterion,
    dataLayerYears,
    isActive,
    side,
    onPreview,
    onApply,
}) => {
    const { formatMessage } = useSafeIntl();
    const operatorRules = useMemo(
        () => buildOperatorPreviewRules(metricTypeId, value),
        [metricTypeId, value],
    );
    const matchesByOperator = useCriterionPreview(
        operatorRules,
        dataLayerYears,
        isActive,
    );

    useEffect(() => {
        if (!isActive) onPreview(undefined);
    }, [isActive, onPreview]);

    return (
        <Box sx={[styles.list, side.up && styles.upwardsList]}>
            {THRESHOLD_OPERATORS.map(operator => {
                const option = getOperatorOption(operator);
                const matches = matchesByOperator?.[operator];
                const isCurrent =
                    currentCriterion?.operator === operator &&
                    !currentCriterion.string_value &&
                    Number(currentCriterion.value) === value;
                let meta: string | undefined;
                if (isCurrent) {
                    meta = formatMessage(MESSAGES.tooltipCurrent);
                } else if (matches) {
                    meta = formatMessage(MESSAGES.tooltipDistrictCount, {
                        count: String(matches.length),
                    });
                }
                return (
                    <HoverCardActionRow
                        key={operator}
                        symbol={option?.symbol ?? operator}
                        label={option ? formatMessage(option.label) : operator}
                        meta={meta}
                        isCurrent={isCurrent}
                        onClick={() => onApply(operator, matches)}
                        onHoverChange={isHovered =>
                            onPreview(isHovered ? matches : undefined)
                        }
                    />
                );
            })}
        </Box>
    );
};
