import React, { FC } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Table, TableBody, TableCell, TableRow } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    deleteIconStyle: {
        color: '#1F2B3D99',
        display: 'none',
        cursor: 'pointer',
    },
    tableRowStyle: {
        '&:hover': {
            backgroundColor: '#f5f5f5',
            '& .delete-icon': {
                display: 'inline-block',
            },
        },
    },
};

type Props = {
    selectedOrgUnits: OrgUnit[];
};
export const SelectedDistrictsTable: FC<Props> = ({ selectedOrgUnits }) => {
    return (
        <Table size="small" aria-label="a dense table">
            <TableBody>
                {selectedOrgUnits.map(org => {
                    return (
                        <TableRow sx={styles.tableRowStyle}>
                            <TableCell
                                align="left"
                                color="#1F2B3D99"
                                sx={{ border: 'none', pl: 1 }}
                            >
                                {org.name}
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{ border: 'none', pr: 2 }}
                            >
                                <DeleteOutlineIcon
                                    className="delete-icon"
                                    sx={styles.deleteIconStyle}
                                />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};
