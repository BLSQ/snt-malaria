import React, { FC, useEffect, useMemo, useState } from 'react';
import { Stack } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
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
    const { formatMessage } = useSafeIntl();

    const popMetricOptions = useMemo(
        () => [
            {
                label: formatMessage(MESSAGES.noTargetPopulation),
                value: '',
            },
            ...metricTypes.map(metric => ({
                label: metric.name,
                value: metric.code,
            })),
        ],
        [metricTypes, formatMessage],
    );

    const multipleTargetSettings = useMemo(() => {
        if (!interventionCode) return [];
        return interventionPopulationSettings[interventionCode] || [];
    }, [interventionCode]);

    const [settingsValue, setSettingsValue] = useState<{
        [key: string]: string;
    }>({});

    const handleUpdateField = (pop_prop: string, value: string) => {
        const newValue = { ...settingsValue, [pop_prop]: value };
        setSettingsValue(newValue);
        onUpdateField(
            'target_population',
            multipleTargetSettings.map((setting: string) => newValue[setting]),
        );
    };

    return multipleTargetSettings.length > 0 ? (
        <Stack spacing={2}>
            {multipleTargetSettings.map((popProp, index) => (
                <InputComponent
                    key={popProp}
                    keyValue={popProp}
                    type="select"
                    options={metricTypes.map(metric => ({
                        label: metric.name,
                        value: metric.code,
                    }))}
                    value={targetPopulation[index]}
                    onChange={(key, value) => handleUpdateField(popProp, value)}
                    label={MESSAGES[`${popProp}Label`]}
                    errors={getErrors(popProp)}
                />
            ))}
        </Stack>
    ) : (
        <Stack spacing={2}>
            <InputComponent
                keyValue="target_population"
                type="select"
                options={popMetricOptions}
                value={targetPopulation}
                onChange={(key, value) => onUpdateField(key, [value])}
                label={formatMessage(MESSAGES.targetPopulationLabel)}
                errors={getErrors('target_population')}
            />
        </Stack>
    );
};
