import React, { FC } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableRow,
} from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    iconButtonStyle: {
        width: '24px',
        height: '24px',
    },
    removeIconStyle: {
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
    selectedDistricts: OrgUnit[];
    removeDistrict: (id: number) => void;
};
export const SelectedDistrictsTable: FC<Props> = ({
    selectedDistricts,
    removeDistrict,
}) => {
    return (
        <Table size="small" aria-label="a dense table">
            <TableBody>
                {selectedDistricts.map(org => {
                    return (
                        <TableRow key={org.id} sx={styles.tableRowStyle}>
                            <TableCell
                                align="left"
                                color="#1F2B3D99"
                                sx={{ border: 'none', pl: 1 }}
                            >
                                {org.name}
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{ border: 'none', pr: 1.5 }}
                            >
                                <IconButton
                                    size="small"
                                    sx={styles.iconButtonStyle}
                                    onClick={() => removeDistrict(org.id)}
                                >
                                    <DeleteOutlineIcon
                                        className="delete-icon"
                                        sx={styles.removeIconStyle}
                                    />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};
