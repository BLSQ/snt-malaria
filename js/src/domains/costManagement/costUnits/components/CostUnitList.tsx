import React, { FC } from 'react';
import { List, ListItem, ListItemText, Theme } from '@mui/material';
import { CostUnitType } from '../types';

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
    costUnitTypes: CostUnitType[];
    onSelectCostUnit: (costUnit: CostUnitType) => void;
    activeCostUnitId?: number | null;
};

export const CostUnitList: FC<Props> = ({
    costUnitTypes,
    onSelectCostUnit,
    activeCostUnitId,
}) => {
    return (
        <List>
            {costUnitTypes.map(costUnit => (
                <ListItem
                    key={costUnit.id}
                    disableGutters
                    disablePadding
                    onClick={() => onSelectCostUnit(costUnit)}
                    sx={
                        activeCostUnitId === costUnit.id
                            ? styles.activeListItem
                            : styles.listItem
                    }
                >
                    <ListItemText
                        primary={costUnit.name}
                        secondary={costUnit.description || null}
                        secondaryTypographyProps={{
                            fontSize: '12px',
                            noWrap: true,
                        }}
                    />
                </ListItem>
            ))}
        </List>
    );
};
