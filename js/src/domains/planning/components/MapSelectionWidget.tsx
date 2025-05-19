import React, { FC } from 'react';
import { Box, Button, Theme, Typography } from '@mui/material';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { IconButton, useSafeIntl } from 'bluesquare-components';

import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

type Props = {
    selectionCount: number;
    onAddToMix: () => void;
    onClearSelection: () => void;
    onOpenQueryBuilderModal: () => void;
};

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        display: 'flex',
        flexDirection: 'row',
        gap: theme.spacing(1),
        borderRadius: theme.spacing(2),
        padding: theme.spacing(1),
        backgroundColor: 'white',
        position: 'absolute',
        top: '8px',
        left: '8px',
        zIndex: 1000,
        ':hover': {
            backgroundColor: 'white',
        },
    }),
    openQueryBuilderModalBtn: {
        textTransform: 'none',
    },
    tuneOutlinedIcon: (theme: Theme) => ({
        color: theme.palette.primary.main,
        marginRight: theme.spacing(1),
    }),
    selectCountText: (theme: Theme) => ({
        color: theme.palette.text.primary,
    }),
    addToMixBtn: (theme: Theme) => ({
        borderRadius: theme.spacing(1),
        fontSize: '0.875rem',
        lineHeight: 0,
        textTransform: 'none',
    }),
};

export const MapSelectionWidget: FC<Props> = ({
    selectionCount,
    onAddToMix,
    onClearSelection,
    onOpenQueryBuilderModal,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.mainBox}>
            <Button
                sx={styles.openQueryBuilderModalBtn}
                onClick={onOpenQueryBuilderModal}
            >
                <TuneOutlined sx={styles.tuneOutlinedIcon} />
                <Typography variant="body1" sx={styles.selectCountText}>
                    {formatMessage(MESSAGES.selectedOrgUnitsCount, {
                        selectionCount,
                    })}
                </Typography>
            </Button>
            <IconButton
                onClick={onClearSelection}
                overrideIcon={CancelOutlined}
                tooltipMessage={MESSAGES.clearSelectionTooltip}
            />
            <Button
                onClick={onAddToMix}
                variant="contained"
                color="primary"
                sx={styles.addToMixBtn}
                disabled={selectionCount === 0}
            >
                {formatMessage(MESSAGES.addToMix)}
            </Button>
        </Box>
    );
};
