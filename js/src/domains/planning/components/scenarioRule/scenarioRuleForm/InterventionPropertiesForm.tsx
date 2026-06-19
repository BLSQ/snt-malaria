import React, { FC, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { DropdownButton } from '../../../../../components/DropdownButton';
import { InterventionCategory } from '../../../../interventions/types';
import { MESSAGES } from '../../../../messages';
import { InterventionPropertyForm } from './InterventionPropertyForm';

type Props = {
    interventions: number[];
    onAdd: (interventionId: number) => void;
    onRemove: (index: number) => void;
    onUpdateField: (index: number, interventionId: number) => void;
    interventionCategories: InterventionCategory[];
};

export const InterventionPropertiesForm: FC<Props> = ({
    interventions,
    onAdd,
    onRemove,
    onUpdateField,
    interventionCategories,
}) => {
    const getCategoryForIntervention = useCallback(
        (interventionId: number) =>
            interventionCategories.find(c =>
                c.interventions.some(i => i.id === interventionId),
            ),
        [interventionCategories],
    );

    const selectedCategoryIds = useMemo(
        () =>
            new Set(
                interventions
                    .map(id => getCategoryForIntervention(id)?.id)
                    .filter((id): id is number => id !== undefined),
            ),
        [interventions, getCategoryForIntervention],
    );

    const availableCategories = useMemo(
        () =>
            interventionCategories.filter(c => !selectedCategoryIds.has(c.id)),
        [interventionCategories, selectedCategoryIds],
    );

    const interventionCategoryOptions = useMemo(
        () =>
            availableCategories.map(category => ({
                value: category.id,
                label: category.name,
            })),
        [availableCategories],
    );

    const getInterventionsForCategory = useCallback(
        (categoryId: number) =>
            interventionCategories.find(c => c.id === categoryId)
                ?.interventions ?? [],
        [interventionCategories],
    );

    return (
        <Box>
            {interventions.map((interventionId, index) => {
                const category = getCategoryForIntervention(interventionId);
                const interventionOptions = category?.interventions ?? [];
                return (
                    <InterventionPropertyForm
                        key={`intervention_${interventionId}`}
                        interventionId={interventionId}
                        interventions={interventionOptions}
                        categoryName={category?.name ?? ''}
                        onUpdateField={newId => onUpdateField(index, newId)}
                        onRemove={() => onRemove(index)}
                    />
                );
            })}
            <DropdownButton
                label={MESSAGES.addInterventionProperty}
                options={interventionCategoryOptions}
                onClick={categoryId => {
                    const firstIntervention =
                        getInterventionsForCategory(categoryId)[0];
                    if (firstIntervention) {
                        onAdd(firstIntervention.id);
                    }
                }}
                size="small"
            />
        </Box>
    );
};
