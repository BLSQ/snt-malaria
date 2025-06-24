import React, { FunctionComponent, useCallback, useState } from 'react';
import { Close } from '@mui/icons-material';
import { Box, Chip, styled, Typography } from '@mui/material';
import { InterventionPlan } from '../../types/interventions';

type Props = {
    row: InterventionPlan;
    onRemoveOrgUnit: (orgUnitId: number, planId: number) => void;
};
export const OrgUnitsMixCell: FunctionComponent<Props> = ({
    row,
    onRemoveOrgUnit,
}) => {
    const TransparentOutlinedChip = styled(Chip)(({ theme }) => ({
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        color: theme.palette.text.primary,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.divider,
        },
    }));

    const [hoveredOrgUnitId, setHoveredOrgUnitId] = useState<number | null>(
        null,
    );

    const removeHoveredOrgUnit = useCallback(() => {
        if (hoveredOrgUnitId != null) {
            onRemoveOrgUnit(hoveredOrgUnitId, row.id);
        }
        setHoveredOrgUnitId(null);
    }, [hoveredOrgUnitId, onRemoveOrgUnit, row.id]);

    return (
        <>
            {row.org_units.map(orgUnit => {
                const isHovered = hoveredOrgUnitId === orgUnit.id;
                return (
                    <Box
                        key={orgUnit.id}
                        sx={{
                            display: 'inline-block',
                            position: 'relative',
                            minWidth: 60,
                            paddingTop: 0.25,
                            paddingBottom: 0.25,
                            paddingLeft: 0.5,
                            paddingRight: 0.5,
                        }}
                        onMouseEnter={() => setHoveredOrgUnitId(orgUnit.id)}
                        onMouseLeave={() => setHoveredOrgUnitId(null)}
                    >
                        <TransparentOutlinedChip
                            label={
                                <Typography variant="body2" color="#1F2B3DDE">
                                    {orgUnit.name}
                                </Typography>
                            }
                            onDelete={
                                isHovered
                                    ? () => removeHoveredOrgUnit()
                                    : undefined
                            }
                            deleteIcon={
                                isHovered ? (
                                    <Close
                                        fontSize="small"
                                        sx={{ color: '#1F2B3D99' }}
                                    />
                                ) : undefined
                            }
                            color="default"
                            size="small"
                        />
                    </Box>
                );
            })}
        </>
    );
};
