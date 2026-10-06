import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { MenuItem, Select, SelectChangeEvent, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { LegendTypes } from '../../../../../constants/legend';
import { MetricType } from '../../../../dataLayers/types/metrics';
import { MESSAGES } from '../../../../messages';
import { MetricTypeCriterion } from '../../../types/scenarioRule';
import {
    CriterionOperatorSelect,
    EQUAL_OPERATOR,
} from './CriterionOperatorSelect';
import { CriterionValueInput } from './CriterionValueInput';
import { RuleItemCard } from './RuleItemCard';
import { compactInputStyles, criterionValueStyles } from './styles';

type Props = {
    metricTypeCriterion: MetricTypeCriterion;
    metricType?: MetricType;
    /** The year configured for this criterion's data layer on the scenario, if any (read-only). */
    configuredYear?: number;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

const styles = {
    ordinalSelect: {
        ...compactInputStyles,
        ...criterionValueStyles,
    },
} satisfies SxStyles;

export const MatchingCriterionForm: FC<Props> = ({
    metricTypeCriterion,
    metricType,
    configuredYear,
    onUpdateField,
    onRemove,
    getErrors,
}) => {
    const { formatMessage } = useSafeIntl();
    const isOrdinal = metricType?.legend_type === LegendTypes.ORDINAL;

    const scaleLabel = useMemo(() => {
        const domain = metricType?.legend_config?.domain;
        if (!domain) return '';
        return `${domain[0]} - ${domain[domain.length - 1]}`;
    }, [metricType]);

    useEffect(() => {
        if (isOrdinal && metricTypeCriterion.operator !== EQUAL_OPERATOR) {
            onUpdateField('operator', EQUAL_OPERATOR);
        }
    }, [isOrdinal, metricTypeCriterion.operator, onUpdateField]);

    const stringValueErrors = getErrors('string_value');

    const handleOperatorChange = useCallback(
        (operator: MetricTypeCriterion['operator']) =>
            onUpdateField('operator', operator),
        [onUpdateField],
    );

    const handleStringValueChange = useCallback(
        (event: SelectChangeEvent) =>
            onUpdateField('string_value', event.target.value),
        [onUpdateField],
    );

    const handleValueChange = useCallback(
        (value?: number) => onUpdateField('value', value),
        [onUpdateField],
    );

    const caption =
        configuredYear != null
            ? formatMessage(MESSAGES.dataLayerYear, {
                  year: configuredYear.toString(),
              })
            : formatMessage(MESSAGES.dataLayerYearNotSet);

    return (
        <RuleItemCard
            title={metricType?.name ?? ''}
            caption={caption}
            onRemove={onRemove}
        >
            <CriterionOperatorSelect
                value={metricTypeCriterion.operator}
                onChange={handleOperatorChange}
                errors={getErrors('operator')}
                isEqualOnly={isOrdinal}
            />
            {isOrdinal ? (
                <Tooltip title={stringValueErrors.join(', ')}>
                    <Select
                        size="small"
                        value={metricTypeCriterion.string_value ?? ''}
                        onChange={handleStringValueChange}
                        error={stringValueErrors.length > 0}
                        sx={styles.ordinalSelect}
                    >
                        {(metricType?.legend_config.domain ?? []).map(
                            option => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ),
                        )}
                    </Select>
                </Tooltip>
            ) : (
                <CriterionValueInput
                    value={metricTypeCriterion.value}
                    onChange={handleValueChange}
                    unitSymbol={metricType?.unit_symbol}
                    errors={getErrors('value')}
                    hint={scaleLabel}
                />
            )}
        </RuleItemCard>
    );
};
