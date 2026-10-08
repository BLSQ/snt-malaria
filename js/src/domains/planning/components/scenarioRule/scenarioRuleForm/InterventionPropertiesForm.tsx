import React, { FC, useMemo } from 'react';
import { Stack } from '@mui/material';
import { InterventionCategory } from '../../../../interventions/types';
import { MESSAGES } from '../../../../messages';
import { findInterventionWithCategory } from '../../../libs/rule-utils';
import { AddItemButton } from './AddItemButton';
import { InterventionPropertyForm } from './InterventionPropertyForm';

type Props = {
    interventions: number[];
    onAdd: (interventionId: number) => void;
    onRemove: (interventionId: number) => void;
    interventionCategories: InterventionCategory[];
};

export const InterventionPropertiesForm: FC<Props> = ({
    interventions,
    onAdd,
    onRemove,
    interventionCategories,
}) => {
    const selectedCategoryIds = useMemo(
        () =>
            new Set(
                interventions
                    .map(
                        id =>
                            findInterventionWithCategory(
                                interventionCategories,
                                id,
                            )?.category.id,
                    )
                    .filter((id): id is number => id !== undefined),
            ),
        [interventions, interventionCategories],
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
            {interventions.map(interventionId => {
                const match = findInterventionWithCategory(
                    interventionCategories,
                    interventionId,
                );
                return (
                    <InterventionPropertyForm
                        key={`intervention_${interventionId}`}
                        interventionId={interventionId}
                        interventionName={match?.intervention.name ?? ''}
                        categoryName={match?.category.name ?? ''}
                        onRemove={onRemove}
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
