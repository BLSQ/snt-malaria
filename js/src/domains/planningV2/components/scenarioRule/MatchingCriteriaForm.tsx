import React, { FC, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { FormikTouched } from 'formik';
import { FormikErrors } from 'formik';
import { MESSAGES } from '../../../messages';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import { useGetChildError } from '../../hooks/useGetChildError';
import { defaultMatchingCriteria } from '../../hooks/useScenarioRuleFormState';
import { MetricTypeCriterion } from '../../types/scenarioRule';
import { DropdownButton } from './DropdownButton';
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
};

const LIST_FIELD_KEY = 'matching_criteria';

export const MatchingCriteriaForm: FC<Props> = ({
    matchingCriteria,
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

    const getChildError = useGetChildError<MetricTypeCriterion>({
        errors,
        touched,
    });

    return (
        <Box>
            {React.Children.toArray(
                matchingCriteria.map((criterion, index) => (
                    <MatchingCriterionForm
                        metricTypeCriterion={criterion}
                        metricType={getMetricType(criterion.metric_type)}
                        onUpdateField={(field, value) =>
                            onUpdateField(LIST_FIELD_KEY, index, field, value)
                        }
                        onRemove={() => onRemove(LIST_FIELD_KEY, index)}
                        getErrors={field => getChildError(field, index)}
                    />
                )),
            )}
            <DropdownButton
                label={MESSAGES.addMatchingCriteria}
                options={metricTypeOptions}
                onClick={(metric_type: number) =>
                    onAdd(LIST_FIELD_KEY, defaultMatchingCriteria, {
                        metric_type,
                    })
                }
                size="small"
                groupOptions
            />
        </Box>
    );
};
