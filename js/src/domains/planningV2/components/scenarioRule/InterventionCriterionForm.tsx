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
import { InterventionCriteria } from '../../types/scenarioRule';
import { DropdownButton } from './DropdownButton';

const styles: SxStyles = {
    interventionCriteriaContainer: {
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
    interventionCriterion: InterventionCriteria[];
    onAdd: (interventionCategoryId: number) => void;
    onRemove: (index: number) => void;
    touched: FormikTouched<InterventionCriteria>[] | undefined;
    errors:
        | string
        | string[]
        | FormikErrors<InterventionCriteria>[]
        | undefined;
    onUpdateField: (index: number, field: string, value: any) => void;
    interventionCategories: InterventionCategory[];
};

export const InterventionCriterionForm: FC<Props> = ({
    interventionCriterion,
    onAdd,
    onRemove,
    errors,
    touched,
    onUpdateField,
    interventionCategories,
}) => {
    const filteredInterventionCategories = useMemo(
        () =>
            interventionCategories.filter(
                ic =>
                    !interventionCriterion.some(
                        ir => ir.interventionCategory === ic.id,
                    ),
            ),
        [interventionCategories, interventionCriterion],
    );

    // filter this based on already applied categories.
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

    const getChildError = useGetChildError<InterventionCriteria>({
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

    return interventionCriterion ? (
        <Box>
            {interventionCriterion.map((i, index) => (
                <InterventionCriteriaForm
                    key={`intervention_criteria_${i.interventionCategory}`}
                    interventionCriteria={i}
                    interventions={getInterventions(i.interventionCategory)}
                    categoryName={getCategoryName(i.interventionCategory)}
                    onUpdateField={(field, value) =>
                        onUpdateField(index, field, value)
                    }
                    getErrors={key => getChildError(key, index)}
                    onRemove={() => onRemove(index)}
                />
            ))}
            <DropdownButton
                label={MESSAGES.addInterventionCriteria}
                options={interventionCategoryOptions}
                onClick={onAdd}
                size="small"
            />
        </Box>
    ) : null;
};

type InterventionCriteriaFormProps = {
    interventions: Intervention[];
    interventionCriteria: InterventionCriteria;
    categoryName: string;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

// TODO: Move this somewhere else
const coverageOptions = [
    { value: 10, label: '10%' },
    { value: 20, label: '20%' },
    { value: 30, label: '30%' },
    { value: 40, label: '40%' },
    { value: 50, label: '50%' },
    { value: 60, label: '60%' },
    { value: 70, label: '70%' },
    { value: 80, label: '80%' },
    { value: 90, label: '90%' },
    { value: 100, label: '100%' },
];

const InterventionCriteriaForm: FC<InterventionCriteriaFormProps> = ({
    interventionCriteria,
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
        <Box sx={styles.interventionCriteriaContainer}>
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
                    interventionCriteria.intervention ||
                    interventionOptions[0]?.value
                }
                onChange={onUpdateField}
                errors={getErrors('intervention')}
            />
            <InputComponent
                type="select"
                keyValue="coverage"
                multi={false}
                withMarginTop={false}
                wrapperSx={styles.coverageWrapper}
                clearable={false}
                options={coverageOptions}
                value={interventionCriteria.coverage}
                onChange={onUpdateField}
                errors={getErrors('coverage')}
            />
            <DeleteIconButton onClick={() => onRemove()} />
        </Box>
    );
};
