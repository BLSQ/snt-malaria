import React, { FC, useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { MESSAGES } from '../../messages';
import { MetricType } from '../../planning/types/metrics';

type Props = {
    targetPopulation: string[];
    onUpdateField: (key: string, value: any) => void;
    getErrors: (key: string) => string[] | undefined;
    metricTypes: MetricType[];
    interventionCode?: string;
};

const interventionPopulationSettings: Record<string, string[]> = {
    itn_routine: ['pop_0_5', 'pop_pw'],
    pmc: ['pop_0_1', 'pop_1_2'],
};

export const TargetPopulationForm: FC<Props> = ({
    targetPopulation,
    onUpdateField,
    getErrors,
    metricTypes,
    interventionCode,
}) => {
    const popMetricOptions = useMemo(
        () =>
            metricTypes
                .filter(metric => metric.metric_kind === 'population')
                .map(metric => ({
                    label: metric.name,
                    value: metric.code,
                })),
        [metricTypes],
    );

    const inputSettings = useMemo(() => {
        if (!interventionCode) return [];
        return interventionPopulationSettings[interventionCode] || [''];
    }, [interventionCode]);

    const handleUpdateField = useCallback(
        (value: string, index: number) => {
            const computedValue = value
                ? [
                      ...targetPopulation.slice(0, index),
                      value,
                      ...targetPopulation.slice(index + 1),
                  ]
                : targetPopulation.filter((_, i) => i !== index);

            onUpdateField('target_population', computedValue);
        },
        [onUpdateField, targetPopulation],
    );

    const getLabel = (popProp: string) =>
        popProp
            ? MESSAGES[`${popProp}Label` as keyof typeof MESSAGES]
            : MESSAGES.targetPopulationLabel;

    return (
        <Stack spacing={2}>
            {inputSettings.map((popProp, index) => (
                <InputComponent
                    key={popProp}
                    keyValue={popProp}
                    type="select"
                    options={popMetricOptions}
                    value={targetPopulation[index] || ''}
                    onChange={(_, value) => handleUpdateField(value, index)}
                    label={getLabel(popProp)}
                    errors={getErrors(popProp)}
                />
            ))}
        </Stack>
    );
};
