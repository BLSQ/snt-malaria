import React, { FC } from 'react';
import { List, ListItem, ListItemText, Theme } from '@mui/material';
import { Grant } from '../types';

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
    grants: Grant[];
    onSelectGrant: (grant: Grant) => void;
    activeGrantId?: number | null;
};

export const GrantList: FC<Props> = ({
    grants,
    onSelectGrant,
    activeGrantId,
}) => (
    <List>
        {grants.map(grant => (
            <ListItem
                key={grant.id}
                disableGutters
                disablePadding
                onClick={() => onSelectGrant(grant)}
                sx={
                    activeGrantId === grant.id
                        ? styles.activeListItem
                        : styles.listItem
                }
            >
                <ListItemText
                    primary={grant.name}
                    secondary={grant.donor_name}
                    secondaryTypographyProps={{ fontSize: '12px' }}
                />
            </ListItem>
        ))}
    </List>
);
