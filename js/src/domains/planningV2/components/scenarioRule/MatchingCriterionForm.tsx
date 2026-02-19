import React, { FC, useMemo } from 'react';
import { Box, Typography, SxProps, Theme, Tooltip } from '@mui/material';
import { DeleteIconButton } from 'Iaso/components/Buttons/DeleteIconButton';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { LegendTypes } from '../../../../constants/legend';
import { MetricType } from '../../../planning/types/metrics';
import { MetricTypeCriterion } from '../../types/scenarioRule';

type Props = {
    metricTypeCriterion: MetricTypeCriterion;
    metricType?: MetricType;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

const styles: Record<string, SxProps<Theme>> = {
    matchingCriteriaContainer: {
        display: 'flex',
        mb: 2,
        gap: 1,
        ' button': {
            visibility: 'hidden',
        },
        '&:hover button': {
            visibility: 'visible',
        },
    },
    scaleLabel: { textAlign: 'right', width: '100%' },
    labelWrapper: {
        maxHeight: 40,
        display: 'flex',
        alignItems: 'center',
    },
    metricTypeLabel: {
        minWidth: 200,
        maxWidth: 200,
    },
};

const operatorOptions = [
    { value: '>', label: '>' },
    { value: '>=', label: '>=' },
    { value: '<', label: '<' },
    { value: '<=', label: '<=' },
    { value: '==', label: '=' },
];

export const MatchingCriterionForm: FC<Props> = ({
    metricTypeCriterion,
    metricType,
    onUpdateField,
    onRemove,
    getErrors,
}) => {
    const scaleLabel = useMemo(() => {
        if (!metricType) return '';
        const domain = metricType.legend_config?.domain;
        if (!domain) return '';
        const scale = `${domain[0]} - ${domain[domain.length - 1]}`;
        return scale;
    }, [metricType]);

    const ordinalOptions = useMemo(
        () =>
            metricType?.legend_type === LegendTypes.ORDINAL
                ? metricType.legend_config.domain.map(d => ({
                      label: d,
                      value: d,
                  }))
                : [],
        [metricType],
    );

    return (
        <Box sx={styles.matchingCriteriaContainer}>
            <Box sx={styles.labelWrapper}>
                <Tooltip title={metricType?.name}>
                    <Typography
                        variant="body2"
                        color="textSecondary"
                        noWrap={true}
                        sx={styles.metricTypeLabel}
                    >
                        {metricType?.name}
                    </Typography>
                </Tooltip>
            </Box>
            <InputComponent
                keyValue="operator"
                type="select"
                value={metricTypeCriterion.operator}
                options={operatorOptions}
                onChange={onUpdateField}
                errors={getErrors('operator')}
                clearable={false}
                wrapperSx={{ width: 75 }}
                withMarginTop={false}
            />
            {metricType?.legend_type === LegendTypes.ORDINAL ? (
                <InputComponent
                    keyValue="string_value"
                    type="select"
                    value={metricTypeCriterion.string_value}
                    onChange={onUpdateField}
                    errors={getErrors('string_value')}
                    wrapperSx={{ flexGrow: 1 }}
                    withMarginTop={false}
                    options={ordinalOptions}
                    clearable={false}
                />
            ) : (
                <>
                    <InputComponent
                        keyValue="value"
                        type="number"
                        value={metricTypeCriterion.value}
                        onChange={onUpdateField}
                        errors={getErrors('value')}
                        wrapperSx={{ width: 100 }}
                        withMarginTop={false}
                    />
                    <Box sx={{ ...styles.labelWrapper, flexGrow: 1 }}>
                        <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={styles.scaleLabel}
                        >
                            {scaleLabel}
                        </Typography>
                    </Box>
                </>
            )}
            <DeleteIconButton onClick={onRemove} />
        </Box>
    );
};
