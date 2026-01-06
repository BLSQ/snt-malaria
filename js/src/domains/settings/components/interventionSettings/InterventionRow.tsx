import React from 'react';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { Intervention } from '../../../planning/types/interventions';
import { MESSAGES } from '../../messages';
import { InterventionCostBreakdownLine } from '../../types/InterventionCostBreakdownLine';

type Props = {
    intervention: Intervention;
    costBreakdownLines: InterventionCostBreakdownLine[];
    onEditInterventionCost: (intervention: Intervention) => void;
};

const styles: SxStyles = {
    row: {
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 2,
        marginBottom: 2,
    },
    heading: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 1,
    },
    costList: {
        display: 'grid',
        gridTemplateColumns: '200px 50px 200px',
        gap: 1,
        marginTop: 1,
    },
};

export const InterventionRow: React.FC<Props> = ({
    intervention,
    costBreakdownLines,
    onEditInterventionCost,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={styles.row}>
            <Box sx={styles.heading}>
                <Typography
                    variant="subtitle2"
                    color="textPrimary"
                    fontWeight={700}
                >
                    {intervention.name}
                </Typography>
                <IconButton
                    onClick={() => onEditInterventionCost(intervention)}
                    iconSize="small"
                    tooltipMessage={MESSAGES.editCost}
                    overrideIcon={EditIcon}
                />
            </Box>
            <Box sx={styles.costList}>
                {(costBreakdownLines.length > 0 &&
                    costBreakdownLines.map(line => (
                        <React.Fragment key={line.id}>
                            <Typography variant="body2" color="textPrimary">
                                {line.category_label}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="textPrimary"
                                fontWeight={700}
                                textAlign="right"
                            >
                                {line.unit_cost}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                {line.unit_type_label}
                            </Typography>
                        </React.Fragment>
                    ))) || (
                    <Typography variant="body2" color="textSecondary">
                        {formatMessage(MESSAGES.noCostBreakdownLines)}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};
