import React, { FC, useCallback, useEffect, useMemo } from 'react';
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
    onApply: (operator: Operator, value: number, matches?: number[]) => void;
    onClose: () => void;
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
    onClose,
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
        if (!isActive) return undefined;
        return () => onPreview(undefined);
    }, [isActive, onPreview]);

    const handleApply = useCallback(
        (operator: string) => {
            onApply(operator as Operator, value, matchesByOperator?.[operator]);
            onClose();
        },
        [onApply, onClose, value, matchesByOperator],
    );
    const handlePreview = useCallback(
        (operator: string) => onPreview(matchesByOperator?.[operator]),
        [onPreview, matchesByOperator],
    );
    const clearPreview = useCallback(() => onPreview(undefined), [onPreview]);

    return (
        <Box
            sx={[styles.list, side.up && styles.upwardsList]}
            onMouseLeave={clearPreview}
        >
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
                        id={operator}
                        symbol={option?.symbol ?? operator}
                        label={option ? formatMessage(option.label) : operator}
                        meta={meta}
                        isCurrent={isCurrent}
                        onClick={handleApply}
                        onHover={handlePreview}
                    />
                );
            })}
        </Box>
    );
};
