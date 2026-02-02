import React, { FunctionComponent, useEffect, useState } from 'react';
import { MenuItem, Select, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../domains/messages';
import { useGetInterventionCategories } from '../domains/planning/hooks/useGetInterventionCategories';
import { InterventionCategory } from '../domains/planning/types/interventions';

type Props = {
    onInterventionCategoryChange: (
        category: InterventionCategory | null,
    ) => void;
};

const styles: SxStyles = {
    select: {
        minWidth: 210,
        '& .MuiSelect-select': { padding: '8px 12px' },
        height: '36px',
    },
};

export const InterventionCategorySelect: FunctionComponent<Props> = ({
    onInterventionCategoryChange = (_: InterventionCategory | null) => {},
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: interventionCategories = [], isLoading } =
        useGetInterventionCategories();

    const [selectedInterventionCategory, setSelectedInterventionCategory] =
        useState<number>(0);

    useEffect(
        () =>
            onInterventionCategoryChange(
                interventionCategories.find(
                    category => category.id === selectedInterventionCategory,
                ) || null,
            ),
        [
            selectedInterventionCategory,
            onInterventionCategoryChange,
            interventionCategories,
        ],
    );

    if (!isLoading && interventionCategories.length > 0) {
        return (
            <Select
                sx={styles.select}
                value={selectedInterventionCategory}
                displayEmpty
                onChange={event =>
                    setSelectedInterventionCategory(Number(event.target.value))
                }
            >
                <MenuItem value={0}>
                    <Typography variant="body2">
                        {formatMessage(MESSAGES.allInterventionCategories)}
                    </Typography>
                </MenuItem>
                {interventionCategories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                        <Typography variant="body2">{category.name}</Typography>
                    </MenuItem>
                ))}
            </Select>
        );
    }

    return null;
};
