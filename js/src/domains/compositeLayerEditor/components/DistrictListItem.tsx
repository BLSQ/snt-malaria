import React, { FC } from 'react';
import Checkbox from '@mui/material/Checkbox/Checkbox';
import ListItemButton from '@mui/material/ListItemButton/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon/ListItemIcon';
import ListItemText from '@mui/material/ListItemText/ListItemText';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';

type Props = {
    orgUnit: OrgUnit;
    picked: boolean;
    onToggle: (orgUnitId: number) => void;
};

/** One row of `OrgUnitSelectionPanel`'s bulk-edit checkbox list. */
export const DistrictListItem: FC<Props> = ({ orgUnit, picked, onToggle }) => (
    <ListItemButton dense onClick={() => onToggle(orgUnit.id)}>
        <ListItemIcon>
            <Checkbox
                edge="start"
                checked={picked}
                tabIndex={-1}
                disableRipple
            />
        </ListItemIcon>
        <ListItemText primary={orgUnit.name} />
    </ListItemButton>
);
