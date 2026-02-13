import React, { FC, useCallback, useMemo } from 'react';
import { Box, Typography, SxProps, Theme, Tooltip } from '@mui/material';
import { FormikTouched } from 'formik';
import { FormikErrors } from 'formik';
import { DeleteIconButton } from 'Iaso/components/Buttons/DeleteIconButton';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { LegendTypes } from '../../../../constants/legend';
import { MESSAGES } from '../../../messages';
import {
    MetricType,
    MetricTypeCategory,
} from '../../../planning/types/metrics';
import { useGetChildError } from '../../hooks/useGetChildError';
import { MetricTypeCriteria } from '../../types/scenarioRule';
import { DropdownButton } from './DropdownButton';

type Props = {
    metricTypeCriterion: MetricTypeCriteria[];
    onAdd: (metricTypeId: number) => void;
    onRemove: (index: number) => void;
    touched: FormikTouched<MetricTypeCriteria>[] | undefined;
    errors: string | string[] | FormikErrors<MetricTypeCriteria>[] | undefined;
    onUpdateField: (index: number, field: string, value: any) => void;
    metricTypeCategories: MetricTypeCategory[];
};

const styles: Record<string, SxProps<Theme>> = {
    metricCriteriaContainer: {
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

export const MetricCriterionForm: FC<Props> = ({
    metricTypeCriterion,
    onAdd,
    onRemove,
    errors,
    touched,
    onUpdateField,
    metricTypeCategories,
}) => {
    const metricTypes = useMemo(
        () => metricTypeCategories.flatMap(mtc => mtc.items),
        [metricTypeCategories],
    );

    const metricTypeOptions = useMemo(
        () =>
            metricTypeCategories.flatMap(
                mtc =>
                    mtc.items.map(mt => ({
                        value: mt.id,
                        label: mt.name,
                        groupKey: mtc.name,
                        groupLabel: mtc.name,
                    })) || [],
            ),
        [metricTypeCategories],
    );

    const getMetricType = useCallback(
        (metricTypeId?: number) =>
            metricTypes?.find(mt => mt.id === metricTypeId),
        [metricTypes],
    );

    const getChildError = useGetChildError<MetricTypeCriteria>({
        errors,
        touched,
    });

    return (
        <Box>
            {metricTypeCriterion.map((criteria, index) => (
                <MetricCriteriaForm
                    key={criteria.metricType}
                    metricTypeCriteria={criteria}
                    metricType={getMetricType(criteria.metricType)}
                    onUpdateField={(field, value) =>
                        onUpdateField(index, field, value)
                    }
                    onRemove={() => onRemove(index)}
                    getErrors={field => getChildError(field, index)}
                />
            ))}
            <DropdownButton
                label={MESSAGES.addMetricCriteria}
                options={metricTypeOptions}
                onClick={onAdd}
                size="small"
                groupOptions={true}
            />
        </Box>
    );
};

type MetricCriteriaFormProps = {
    metricTypeCriteria: MetricTypeCriteria;
    metricType?: MetricType;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

const operatorOptions = [
    { value: '>', label: '>' },
    { value: '>=', label: '>=' },
    { value: '<', label: '<' },
    { value: '<=', label: '<=' },
    { value: '==', label: '=' },
];

export const MetricCriteriaForm: FC<MetricCriteriaFormProps> = ({
    metricTypeCriteria: metricTypeCriteria,
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
        <Box sx={styles.metricCriteriaContainer}>
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
                value={metricTypeCriteria.operator}
                options={operatorOptions}
                onChange={onUpdateField}
                errors={getErrors('operator')}
                clearable={false}
                wrapperSx={{ width: 75 }}
                withMarginTop={false}
            />
            {metricType?.legend_type === 'ordinal' ? (
                <InputComponent
                    keyValue="string_value"
                    type="select"
                    value={metricTypeCriteria.string_value}
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
                        value={metricTypeCriteria.value}
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
