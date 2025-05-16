import React, { useState } from 'react';
import { Close } from '@mui/icons-material';

import {
    alpha,
    Box,
    Chip,
    Stack,
    TableCell,
    TableRow,
    Typography,
} from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { EditInterventionMix } from './EditInterventionMixModal';

const styles: SxStyles = {
    tableContainer: {
        maxHeight: 300,
        overflowY: 'auto',
        padding: 0,
        margin: 0,
    },
    tableCellStyle: {
        padding: theme => theme.spacing(0),
    },
    orgUnitStyle: {
        margin: theme => theme.spacing(0.5),
    },
    interventionDotStyle: {
        verticalAlign: 'baseline',
        paddingLeft: theme => theme.spacing(0.6),
        paddingRight: theme => theme.spacing(0.6),
    },
};
export const InterventionsPlanRowTable = ({ scenarioId, row, index, iconProps }) => {
    const [hoveredOrgUnitId, setHoveredOrgUnitId] = useState<string | null>(
        null,
    );
    const [clickedOrgUnitId, setClickedOrgUnitId] = useState<number | null>(
        null,
    );

    const [hoveredMixName, setHoveredMixName] = useState<boolean>(false);

    return (
        <TableRow key={index}>
            <TableCell
                sx={{
                    ...styles.tableCellStyle,
                    minWidth: '200px',
                    paddingTop: '4px',
                }}
            >
                <Stack
                    direction="row"
                    gap={1}
                    onMouseEnter={() => setHoveredMixName(true)}
                    onMouseLeave={() => setHoveredMixName(false)}
                >
                    <Typography
                        variant="subtitle2"
                        color={alpha('#1F2B3D', 0.87)}
                        fontWeight="bold"
                    >
                        {row.name}
                    </Typography>
                    {hoveredMixName && (
                        <EditInterventionMix scenarioId={scenarioId} iconProps={iconProps} mix={row} />
                    )}
                </Stack>
                {row.interventions.map((intervention, idx) => (
                    <Typography
                        variant="caption"
                        color={alpha('#1F2B3D', 0.87)}
                    >
                        {intervention.name}
                        {idx < row.interventions.length - 1 && (
                            <Box
                                component="span"
                                sx={styles.interventionDotStyle}
                            >
                                ·
                            </Box>
                        )}
                    </Typography>
                ))}
            </TableCell>
            <TableCell
                sx={{
                    ...styles.tableCellStyle,
                    paddingTop: '4px',
                }}
            >
                {row.orgUnits.map(orgUnit => {
                    const isHovered = hoveredOrgUnitId === orgUnit.id;
                    const isClicked = clickedOrgUnitId === orgUnit.id;
                    return (
                        <Box
                            key={orgUnit.id}
                            onMouseEnter={() => setHoveredOrgUnitId(orgUnit.id)}
                            onMouseLeave={() => setHoveredOrgUnitId(null)}
                            sx={{
                                display: 'inline-block',
                                position: 'relative',
                                height: 32,
                                minWidth: 60,
                            }}
                        >
                            {isHovered ? (
                                <Chip
                                    onClick={() =>
                                        setClickedOrgUnitId(
                                            isClicked ? null : orgUnit.id,
                                        )
                                    }
                                    label={
                                        <Typography
                                            variant="body2"
                                            color="#1F2B3DDE"
                                        >
                                            {orgUnit.name}
                                        </Typography>
                                    }
                                    onDelete={
                                        isClicked
                                            ? () => {
                                                  setClickedOrgUnitId(null);
                                              }
                                            : undefined
                                    }
                                    deleteIcon={
                                        isClicked ? (
                                            <Close
                                                fontSize="small"
                                                sx={{ color: '#1F2B3D99' }}
                                            />
                                        ) : undefined
                                    }
                                    color="default"
                                    size="small"
                                    variant="outlined"
                                />
                            ) : (
                                <Typography
                                    variant="body2"
                                    color="#1F2B3DDE"
                                    sx={{ px: 1 }}
                                >
                                    {orgUnit.name}
                                </Typography>
                            )}
                        </Box>
                    );
                })}
            </TableCell>
        </TableRow>
    );
};
