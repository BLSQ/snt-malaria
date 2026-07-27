import React, { FC } from 'react';
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import {
    Intervention,
    InterventionCategory,
} from '../../../interventions/types';

const styles: SxStyles = {
    listContainer: {
        marginBottom: theme => theme.spacing(2),
    },
    listTitle: {
        paddingBottom: theme => theme.spacing(0.5),
        paddingLeft: theme => theme.spacing(1),
    },
    listItem: {
        cursor: 'pointer',
        borderRadius: 2,
        paddingX: theme => theme.spacing(1),
    },
    activeListItem: {
        backgroundColor: theme => theme.palette.primary.light,
        borderRadius: 2,
        paddingX: theme => theme.spacing(1),
    },
};

type Props = {
    interventionCategories: InterventionCategory[];
    onSelectIntervention: (intervention: Intervention) => void;
    activeInterventionId?: number | null;
};

export const InterventionList: FC<Props> = ({
    interventionCategories,
    onSelectIntervention,
    activeInterventionId,
}) => {
    return (
        <>
            {interventionCategories.map(category => (
                <Box key={category.id} sx={styles.listContainer}>
                    <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={styles.listTitle}
                    >
                        {category.name}
                    </Typography>
                    <List>
                        {category.interventions.map(intervention => (
                            <ListItem
                                key={intervention.id}
                                disableGutters
                                disablePadding
                                onClick={() =>
                                    onSelectIntervention(intervention)
                                }
                                sx={
                                    activeInterventionId === intervention.id
                                        ? styles.activeListItem
                                        : styles.listItem
                                }
                            >
                                <ListItemText
                                    primary={intervention.short_name}
                                    secondary={intervention.name || null}
                                    secondaryTypographyProps={{
                                        fontSize: '12px',
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            ))}
        </>
    );
};
