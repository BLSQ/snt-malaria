import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    IconButton,
    Theme,
    CardActionArea,
} from '@mui/material';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';

import { SxStyles } from 'Iaso/types/general';
import { baseUrls } from '../../../constants/urls';

const styles: SxStyles = {
    card: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
        marginBottom: theme.spacing(2),
    }),
    content: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    column: { display: 'flex', flexDirection: 'column' },
    columnEnd: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    title: (theme: Theme) => ({
        fontSize: 20,
        lineHeight: '160%',
        color: theme.palette.text.primary,
    }),
    timestamp: (theme: Theme) => ({
        fontSize: 14,
        lineHeight: '143%',
        color: theme.palette.text.secondary,
    }),
};

type Props = {
    scenario: Scenario;
};

export const ScenarioComponent: FC<Props> = ({ scenario }) => {
    const navigate = useNavigate();
    const handleScenarioClick = () => {
        navigate(`/${baseUrls.planning}/scenarioId/${scenario.id}`);
    };

    return (
        <Card sx={styles.card}>
            <CardActionArea onClick={handleScenarioClick}>
                <CardContent sx={styles.content}>
                    <Box sx={styles.column}>
                        <Typography variant="h6" sx={styles.title}>
                            {scenario.name}
                        </Typography>
                        <Typography variant="body2" sx={styles.timestamp}>
                            Edited on {scenario.updated_at}
                        </Typography>
                    </Box>
                    <Box sx={styles.columnEnd}>
                        <Typography variant="overline" color="textSecondary">
                            Districts
                        </Typography>
                        <Typography variant="h6">24</Typography>
                    </Box>
                    <Box sx={styles.columnEnd}>
                        <Typography variant="overline" color="textSecondary">
                            DALY
                        </Typography>
                        <Typography variant="h6">1,200</Typography>
                    </Box>
                    <Box sx={styles.columnEnd}>
                        <Typography variant="overline" color="textSecondary">
                            Budget
                        </Typography>
                        <Typography variant="h6">USD 32,000</Typography>
                    </Box>
                    <ChevronRightOutlinedIcon />
                </CardContent>
            </CardActionArea>
        </Card>
    );
};
