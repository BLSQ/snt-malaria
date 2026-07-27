import React, { FC } from 'react';
import { List, ListItem, ListItemText, Theme } from '@mui/material';
import { InterventionCategory } from '../types';

const styles = {
    listItem: {
        cursor: 'pointer',
        borderRadius: 2,
        paddingX: (theme: Theme) => theme.spacing(1),
    },
    activeListItem: {
        backgroundColor: (theme: Theme) => theme.palette.primary.light,
        borderRadius: 2,
        paddingX: (theme: Theme) => theme.spacing(1),
    },
};

type Props = {
    interventionCategories: InterventionCategory[];
    onSelectInterventionCategory: (category: InterventionCategory) => void;
    activeInterventionCategoryId?: number | null;
};

export const InterventionCategoryList: FC<Props> = ({
    interventionCategories,
    onSelectInterventionCategory,
    activeInterventionCategoryId,
}) => (
    <List>
        {interventionCategories.map(category => (
            <ListItem
                key={category.id}
                disableGutters
                disablePadding
                onClick={() => onSelectInterventionCategory(category)}
                sx={
                    activeInterventionCategoryId === category.id
                        ? styles.activeListItem
                        : styles.listItem
                }
            >
                <ListItemText
                    primary={category.name}
                    secondary={category.short_name || null}
                    secondaryTypographyProps={{ fontSize: '12px' }}
                />
            </ListItem>
        ))}
    </List>
);
