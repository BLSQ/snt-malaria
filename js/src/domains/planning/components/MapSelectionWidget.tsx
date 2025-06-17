import React, { FC, useState } from 'react';
import { Box, Button, Theme, Typography } from '@mui/material';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { IconButton, useSafeIntl } from 'bluesquare-components';

import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import { FilterQueryBuilder } from './maps/FilterQueryBuilder';
import { MetricsFilters } from '../types/metrics';

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

type Props = {
    selectionCount: number;
    onAddToMix: () => void;
    onApplyFilters: (filters: MetricsFilters) => void;
    onClearSelection: () => void;
};

export const MapSelectionWidget: FC<Props> = ({
    selectionCount,
    onAddToMix,
    onApplyFilters,
    onClearSelection,
}) => {
    const { formatMessage } = useSafeIntl();

    const [queryBuilderIsOpen, setQueryBuilderIsOpen] =
        useState<boolean>(false);
    const handleOpenQueryBuilderModal = () => setQueryBuilderIsOpen(true);

    const onSubmitFilters = (value: MetricsFilters) => {
        if (!value) {
            return;
        }
        onApplyFilters(value);
        setQueryBuilderIsOpen(false);
    };
    return (
        <Box sx={styles.mainBox}>
            <Button
                sx={styles.openQueryBuilderModalBtn}
                onClick={handleOpenQueryBuilderModal}
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
                disabled={selectionCount === 0}
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
            <FilterQueryBuilder
                isOpen={queryBuilderIsOpen}
                onClose={() => setQueryBuilderIsOpen(false)}
                onSubmit={onSubmitFilters}
            />
        </Box>
    );
};
