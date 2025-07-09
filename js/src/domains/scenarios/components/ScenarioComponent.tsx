import React, { FC } from 'react';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Theme,
    CardActionArea,
    Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { SxStyles } from 'Iaso/types/general';
import { baseUrls } from '../../../constants/urls';
import { Scenario } from '../types';

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
        flexGrow: 1,
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
    onDelete: (id: number) => void;
};

export const ScenarioComponent: FC<Props> = ({ scenario, onDelete }) => {
    const navigate = useNavigate();
    const handleScenarioClick = () => {
        navigate(`/${baseUrls.planning}/scenarioId/${scenario.id}`);
    };
    const handleOnDelete = event => {
        event.stopPropagation();
        onDelete(scenario.id);
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
                            Edited on{' '}
                            {new Date(scenario.updated_at).toLocaleString()}
                        </Typography>
                    </Box>
                    <Box sx={styles.columnEnd}>
                        <Button
                            onMouseDown={event => {
                                event.stopPropagation();
                            }}
                            onClick={handleOnDelete}
                        >
                            <DeleteIcon />
                        </Button>
                    </Box>
                    {/* <Box sx={styles.columnEnd}>
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
                    </Box> */}
                    <ChevronRightOutlinedIcon />
                </CardContent>
            </CardActionArea>
        </Card>
    );
};
