import React, { FC } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { ScenarioRule } from '../../types/scenarioRule';

const styles: SxStyles = {
    ruleBox: {
        mb: 2,
        p: 2,
        border: 1,
        borderColor: 'grey.300',
        borderRadius: 2,
        overflow: 'auto',
    },
    colorBox: {
        width: 16,
        height: 16,
        mr: 2,
        borderRadius: '5px',
    },
    rulesText: {
        ml: 4,
    },
};

type Props = {
    rule: ScenarioRule;
    onClick?: () => void;
};

export const ScenarioRuleLine: FC<Props> = ({ rule, onClick = noOp }) => (
    <Box key={rule.id} sx={styles.ruleBox} onClick={onClick}>
        <Grid container direction="row" alignItems="center" mb={1}>
            <Box
                sx={{
                    ...styles.colorBox,
                    bgcolor: rule.color,
                }}
            />
            <Typography variant="body1" fontWeight="medium">
                {rule.name}
            </Typography>
        </Grid>
        <Typography variant="body2" color="textSecondary" sx={styles.rulesText}>
            {rule?.interventions?.length} intervention rules
        </Typography>
    </Box>
);
