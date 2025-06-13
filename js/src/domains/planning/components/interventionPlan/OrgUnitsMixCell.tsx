import React, { FunctionComponent, useState } from 'react';
import { Close } from '@mui/icons-material';
import { Box, Chip, Typography } from '@mui/material';

type Props = {
    row: any;
};
export const OrgUnitsMixCell: FunctionComponent<Props> = ({ row }) => {
    const [hoveredOrgUnitId, setHoveredOrgUnitId] = useState<string | null>(
        null,
    );
    const [clickedOrgUnitId, setClickedOrgUnitId] = useState<number | null>(
        null,
    );
    return row.orgUnits.map(orgUnit => {
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
                            setClickedOrgUnitId(isClicked ? null : orgUnit.id)
                        }
                        label={
                            <Typography variant="body2" color="#1F2B3DDE">
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
    });
};
