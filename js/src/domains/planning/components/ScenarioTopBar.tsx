import React, { FC } from 'react';
import { Box, Typography, IconButton, Theme } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ContentPasteGoOutlinedIcon from '@mui/icons-material/ContentPasteGoOutlined';
import CopyAllOutlinedIcon from '@mui/icons-material/CopyAllOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    content: (theme: Theme) => ({
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
    }),
    nameContainer: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        '&:hover .editButton': {
            opacity: 1,
        },
    },
    editNameBtn: {
        opacity: 0,
        transition: 'opacity 0.3s',
    },
    actionBtns: {
        alignSelf: 'flex-end',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: (theme: Theme) => ({
        color: theme.palette.primary.main,
        fontWeight: 'bold', // medium not working?
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: theme.spacing(2),
    }),
    icon: {
        marginRight: '0.5rem',
    },
};

type Props = {
    scenario?: Scenario;
};

export const ScenarioTopBar: FC<Props> = ({ scenario }) => {
    if (scenario) {
        return (
            <Box sx={styles.content}>
                <Box sx={styles.nameContainer}>
                    <Typography variant="h6">{scenario.name}</Typography>
                    <IconButton className="editButton" sx={styles.editNameBtn}>
                        <EditOutlinedIcon />
                    </IconButton>
                </Box>
                <Box sx={styles.actionBtns}>
                    <Typography variant="body2" sx={styles.actionBtn}>
                        <CheckCircleOutlinedIcon sx={styles.icon} />
                        Saved
                    </Typography>
                    <Typography variant="body2" sx={styles.actionBtn}>
                        <ContentPasteGoOutlinedIcon sx={styles.icon} />
                        Export
                    </Typography>
                    <Typography variant="body2" sx={styles.actionBtn}>
                        <CopyAllOutlinedIcon sx={styles.icon} />
                        Duplicate
                    </Typography>
                </Box>
            </Box>
        );
    } else {
        return <></>;
    }
};
