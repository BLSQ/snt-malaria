import React, { FC, useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { InterventionCategory } from '../../../../interventions/types';
import { MESSAGES } from '../../../../messages';
import { AddItemButton } from './AddItemButton';
import { InterventionPropertyForm } from './InterventionPropertyForm';

type Props = {
    interventions: number[];
    onAdd: (interventionId: number) => void;
    onRemove: (index: number) => void;
    interventionCategories: InterventionCategory[];
};

export const InterventionPropertiesForm: FC<Props> = ({
    interventions,
    onAdd,
    onRemove,
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

    const interventionOptions = useMemo(
        () =>
            interventionCategories
                .filter(category => !selectedCategoryIds.has(category.id))
                .flatMap(category =>
                    category.interventions.map(intervention => ({
                        value: intervention.id,
                        label: intervention.name,
                        groupKey: String(category.id),
                        groupLabel: category.name,
                    })),
                ),
        [interventionCategories, selectedCategoryIds],
    );

    return (
        <Stack spacing={1}>
            {interventions.map((interventionId, index) => {
                const category = getCategoryForIntervention(interventionId);
                const intervention = category?.interventions.find(
                    i => i.id === interventionId,
                );
                return (
                    <InterventionPropertyForm
                        key={`intervention_${interventionId}`}
                        interventionName={intervention?.name ?? ''}
                        categoryName={category?.name ?? ''}
                        onRemove={() => onRemove(index)}
                    />
                );
            })}
            <AddItemButton
                label={MESSAGES.addInterventionProperty}
                options={interventionOptions}
                onClick={onAdd}
                hasItems={interventions.length > 0}
            />
        </Stack>
    );
};
