import React, { FC, useCallback, useEffect, useMemo } from 'react';
import LayersIcon from '@mui/icons-material/Layers';
import { MenuItem, Select, SelectChangeEvent, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { NumberInput } from '../../../../../components/NumberInput';
import { LegendTypes } from '../../../../../constants/legend';
import { MetricType } from '../../../../dataLayers/types/metrics';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { formatBigNumber } from '../../../libs/cost-utils';
import { MetricTypeCriterion } from '../../../types/scenarioRule';
import {
    CriterionOperatorSelect,
    EQUAL_OPERATOR,
} from './CriterionOperatorSelect';
import { RuleItemCard } from './RuleItemCard';
import { compactInputStyles, criterionValueStyles } from './styles';

type Props = {
    metricTypeCriterion: MetricTypeCriterion;
    metricType?: MetricType;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

const styles = {
    ordinalSelect: {
        ...compactInputStyles,
        ...criterionValueStyles,
    },
    valueInput: {
        ...criterionValueStyles,
        height: compactInputStyles.height,
    },
} satisfies SxStyles;

const formatRangeBound = (bound: string | number) => {
    const value = Number(bound);
    return Number.isFinite(value) && Math.abs(value) >= 1000
        ? (formatBigNumber(value) ?? String(bound))
        : String(bound);
};

export const MatchingCriterionForm: FC<Props> = ({
    metricTypeCriterion,
    metricType,
    onUpdateField,
    onRemove,
    getErrors,
}) => {
    const { formatMessage } = useSafeIntl();
    const { activeTab, mapMetricTypeId, setMapMetricTypeId, showMetricOnMap } =
        usePlanningContext();
    const isOrdinal = metricType?.legend_type === LegendTypes.ORDINAL;

    const scaleLabel = useMemo(() => {
        const domain = metricType?.legend_config?.domain;
        if (!domain) return '';
        return `${formatRangeBound(domain[0])} - ${formatRangeBound(domain[domain.length - 1])}`;
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

    const isShownOnMap =
        activeTab === 'map' &&
        metricType !== undefined &&
        mapMetricTypeId === metricType.id;

    const handleToggleOnMap = useCallback(() => {
        if (isShownOnMap) {
            setMapMetricTypeId(undefined);
        } else if (metricType) {
            showMetricOnMap(metricType.id);
        }
    }, [isShownOnMap, metricType, setMapMetricTypeId, showMetricOnMap]);

    const handleRemove = useCallback(() => {
        if (metricType && mapMetricTypeId === metricType.id) {
            setMapMetricTypeId(undefined);
        }
        onRemove();
    }, [mapMetricTypeId, metricType, onRemove, setMapMetricTypeId]);

    const handleValueChange = useCallback(
        (value: number | null) => onUpdateField('value', value ?? undefined),
        [onUpdateField],
    );

    return (
        <RuleItemCard
            Icon={LayersIcon}
            title={metricType?.name ?? ''}
            caption={scaleLabel}
            onRemove={handleRemove}
            onClick={handleToggleOnMap}
            clickHint={formatMessage(
                isShownOnMap
                    ? MESSAGES.criterionHideOnMapHint
                    : MESSAGES.criterionShowOnMapHint,
            )}
            isSelected={isShownOnMap}
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
                <NumberInput
                    value={metricTypeCriterion.value}
                    onCommit={handleValueChange}
                    commitOn="change"
                    isNullable
                    compact
                    suffix={metricType?.unit_symbol}
                    error={getErrors('value').join(', ')}
                    ariaLabel={formatMessage(MESSAGES.criterionValue)}
                    sx={styles.valueInput}
                />
            )}
        </RuleItemCard>
    );
};
