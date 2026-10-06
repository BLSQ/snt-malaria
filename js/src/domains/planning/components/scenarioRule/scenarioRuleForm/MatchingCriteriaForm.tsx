import React, { FC, useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { FormikTouched } from 'formik';
import { FormikErrors } from 'formik';
import { LegendTypes } from '../../../../../constants/legend';
import { useGetChildError } from '../../../../../hooks/useGetChildError';
import { MetricTypeCategory } from '../../../../dataLayers/types/metrics';
import { MESSAGES } from '../../../../messages';
import { getDataLayerYear } from '../../../../scenarios/types';
import { defaultMatchingCriteria } from '../../../hooks/useScenarioRuleFormState';
import { MetricTypeCriterion } from '../../../types/scenarioRule';
import { AddItemButton } from './AddItemButton';
import { EQUAL_OPERATOR } from './CriterionOperatorSelect';
import { MatchingCriterionForm } from './MatchingCriterionForm';

type Props = {
    matchingCriteria: MetricTypeCriterion[];
    onAdd: (
        list_field_key: string,
        defaultValues: MetricTypeCriterion,
        extendedValue: { metric_type: number },
    ) => void;
    onRemove: (list_field_key: string, index: number) => void;
    touched: FormikTouched<MetricTypeCriterion>[] | undefined;
    errors: string | string[] | FormikErrors<MetricTypeCriterion>[] | undefined;
    onUpdateField: (
        list_field_key: string,
        index: number,
        field: string,
        value: any,
    ) => void;
    metricTypeCategories: MetricTypeCategory[];
    dataLayerYears?: Record<string, number>;
};

const LIST_FIELD_KEY = 'matching_criteria';

const ordinalMatchingCriteria: MetricTypeCriterion = {
    ...defaultMatchingCriteria,
    operator: EQUAL_OPERATOR,
};

export const MatchingCriteriaForm: FC<Props> = ({
    matchingCriteria,
    onAdd,
    onRemove,
    errors,
    touched,
    onUpdateField,
    metricTypeCategories,
    dataLayerYears,
}) => {
    const metricTypes = useMemo(
        () => metricTypeCategories.flatMap(mtc => mtc.items),
        [metricTypeCategories],
    );

    const metricTypeOptions = useMemo(
        () =>
            metricTypeCategories.flatMap(
                mtc =>
                    mtc.items
                        .filter(mt => mt.is_complete !== false)
                        .map(mt => ({
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

    const getChildError = useGetChildError<MetricTypeCriterion>({
        errors,
        touched,
    });

    return (
        <Stack spacing={1}>
            {React.Children.toArray(
                matchingCriteria.map((criterion, index) => (
                    <MatchingCriterionForm
                        metricTypeCriterion={criterion}
                        metricType={getMetricType(criterion.metric_type)}
                        configuredYear={getDataLayerYear(
                            dataLayerYears,
                            criterion.metric_type,
                        )}
                        onUpdateField={(field, value) =>
                            onUpdateField(LIST_FIELD_KEY, index, field, value)
                        }
                        onRemove={() => onRemove(LIST_FIELD_KEY, index)}
                        getErrors={field => getChildError(field, index)}
                    />
                )),
            )}
            <AddItemButton
                label={MESSAGES.addMatchingCriteria}
                options={metricTypeOptions}
                onClick={(metric_type: number) =>
                    onAdd(
                        LIST_FIELD_KEY,
                        getMetricType(metric_type)?.legend_type ===
                            LegendTypes.ORDINAL
                            ? ordinalMatchingCriteria
                            : defaultMatchingCriteria,
                        { metric_type },
                    )
                }
                hasItems={matchingCriteria.length > 0}
            />
        </Stack>
    );
};
