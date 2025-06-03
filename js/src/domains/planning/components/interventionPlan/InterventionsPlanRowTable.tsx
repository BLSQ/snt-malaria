import React from 'react';
import { TableCell, TableRow } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { InterventionsMixCell } from './InterventionsMixCell';
import { OrgUnitsMixCell } from './OrgUnitsMixCell';

const styles: SxStyles = {
    tableCellStyle: {
        padding: theme => theme.spacing(0),
    },
};
export const InterventionsPlanRowTable = ({
    scenarioId,
    row,
    index,
    iconProps,
}) => {
    return (
        <TableRow key={index}>
            <TableCell
                sx={{
                    ...styles.tableCellStyle,
                    minWidth: '200px',
                    paddingTop: '4px',
                }}
            >
                <InterventionsMixCell
                    row={row}
                    scenarioId={scenarioId}
                    iconProps={iconProps}
                />
            </TableCell>
            <TableCell
                sx={{
                    ...styles.tableCellStyle,
                    paddingTop: '4px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <OrgUnitsMixCell row={row} />
            </TableCell>
        </TableRow>
    );
};
