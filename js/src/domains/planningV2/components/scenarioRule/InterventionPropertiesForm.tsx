import React, { FC, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { FormikErrors, FormikTouched } from 'formik';
import { useGetChildError } from '../../../../hooks/useGetChildError';
import { MESSAGES } from '../../../messages';
import { InterventionCategory } from '../../../planning/types/interventions';
import { defaultInterventionProperties } from '../../hooks/useScenarioRuleFormState';
import { InterventionProperties } from '../../types/scenarioRule';
import { DropdownButton } from './DropdownButton';
import { InterventionPropertyForm } from './InterventionPropertyForm';

type Props = {
    interventionProperties: InterventionProperties[];
    onAdd: (
        key: string,
        defaultValues: InterventionProperties,
        extendedValue: { intervention_category: number },
    ) => void;
    onRemove: (key: string, index: number) => void;
    touched: FormikTouched<InterventionProperties>[] | undefined;
    errors:
        | string
        | string[]
        | FormikErrors<InterventionProperties>[]
        | undefined;
    onUpdateField: (
        key: string,
        index: number,
        field: string,
        value: any,
    ) => void;
    interventionCategories: InterventionCategory[];
};

const array_field_key = 'intervention_properties';

export const InterventionPropertiesForm: FC<Props> = ({
    interventionProperties,
    onAdd,
    onRemove,
    errors,
    touched,
    onUpdateField,
    interventionCategories,
}) => {
    // Filter out categories already selected
    // We want to assure we don't have two interventions of the same category on the rule.
    const filteredInterventionCategories = useMemo(
        () =>
            interventionCategories.filter(
                ic =>
                    !interventionProperties.some(
                        ir => ir.intervention_category === ic.id,
                    ),
            ),
        [interventionCategories, interventionProperties],
    );

    const interventionCategoryOptions = useMemo(
        () =>
            filteredInterventionCategories?.map(category => ({
                value: category.id,
                label: category.name,
            })) || [],
        [filteredInterventionCategories],
    );

    const getCategoryName = useCallback(
        (categoryId?: number) =>
            (categoryId &&
                interventionCategories?.find(c => c.id === categoryId)?.name) ||
            '',
        [interventionCategories],
    );

    const getChildError = useGetChildError<InterventionProperties>({
        errors,
        touched,
    });

    const getInterventions = useCallback(
        (categoryId?: number) =>
            (categoryId &&
                interventionCategories?.find(c => c.id === categoryId)
                    ?.interventions) ||
            [],
        [interventionCategories],
    );

    return interventionProperties ? (
        <Box>
            {interventionProperties.map((i, index) => (
                <InterventionPropertyForm
                    key={`intervention_property_${i.intervention_category}`}
                    interventionProperty={i}
                    interventions={getInterventions(i.intervention_category)}
                    categoryName={getCategoryName(i.intervention_category)}
                    onUpdateField={(field, value) =>
                        onUpdateField(array_field_key, index, field, value)
                    }
                    getErrors={key => getChildError(key, index)}
                    onRemove={() => onRemove(array_field_key, index)}
                />
            ))}
            <DropdownButton
                label={MESSAGES.addInterventionProperty}
                options={interventionCategoryOptions}
                onClick={interventionCategory =>
                    onAdd(array_field_key, defaultInterventionProperties, {
                        intervention_category: interventionCategory,
                    })
                }
                size="small"
            />
        </Box>
    ) : null;
};
