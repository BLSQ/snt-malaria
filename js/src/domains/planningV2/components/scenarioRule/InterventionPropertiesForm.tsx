import React, { FC, useCallback, useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { FormikErrors, FormikTouched } from 'formik';
import { DeleteIconButton } from 'Iaso/components/Buttons/DeleteIconButton';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import {
    Intervention,
    InterventionCategory,
} from '../../../planning/types/interventions';
import { useGetChildError } from '../../hooks/useGetChildError';
import { defaultInterventionProperties } from '../../hooks/useScenarioRuleFormState';
import { InterventionProperties } from '../../types/scenarioRule';
import { DropdownButton } from './DropdownButton';

const styles: SxStyles = {
    interventionPropertiesContainer: {
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
    scaleLabel: { flexGrow: 1, textAlign: 'right' },
    coverageWrapper: {
        width: 75,
    },
    categoryName: { minWidth: 200, maxWidth: 200 },
    labelWrapper: {
        maxHeight: 40,
        display: 'flex',
        alignItems: 'center',
    },
    interventionWrapper: {
        flexGrow: 1,
    },
};

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

type InterventionPropertyFormProps = {
    interventions: Intervention[];
    interventionProperty: InterventionProperties;
    categoryName: string;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

const InterventionPropertyForm: FC<InterventionPropertyFormProps> = ({
    interventionProperty,
    interventions,
    categoryName,
    onUpdateField,
    getErrors,
    onRemove,
}) => {
    const interventionOptions = useMemo(
        () => interventions.map(i => ({ value: i.id, label: i.name })),
        [interventions],
    );

    return (
        <Box sx={styles.interventionPropertiesContainer}>
            <Box sx={styles.labelWrapper}>
                <Tooltip title={categoryName}>
                    <Typography
                        variant="body2"
                        fontWeight="medium"
                        color="textSecondary"
                        noWrap={true}
                        sx={styles.categoryName}
                    >
                        {categoryName}
                    </Typography>
                </Tooltip>
            </Box>
            <InputComponent
                type="select"
                keyValue="intervention"
                multi={false}
                withMarginTop={false}
                wrapperSx={styles.interventionWrapper}
                clearable={false}
                options={interventionOptions}
                value={
                    interventionProperty.intervention ||
                    interventionOptions[0]?.value
                }
                onChange={onUpdateField}
                errors={getErrors('intervention')}
            />
            <DeleteIconButton onClick={() => onRemove()} />
        </Box>
    );
};
