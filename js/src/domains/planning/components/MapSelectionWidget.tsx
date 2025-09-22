import React, { FC, useState } from 'react';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { Box, Button, Theme, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';

import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { MetricsFilters } from '../types/metrics';
import { FilterQueryBuilder } from './maps/FilterQueryBuilder';
import { mapWidgetSizes } from './styles';

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
        width: mapWidgetSizes.width,
        ':hover': {
            backgroundColor: 'white',
        },
    }),
    openQueryBuilderModalBtn: {
        textTransform: 'none',
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    tuneOutlinedIcon: (theme: Theme) => ({
        color: theme.palette.primary.main,
        marginRight: theme.spacing(1),
    }),
    selectCountText: (theme: Theme) => ({
        color: theme.palette.text.primary,
    }),
};

type Props = {
    selectionCount: number;
    onApplyFilters: (filters: MetricsFilters) => void;
    onClearSelection: () => void;
};

export const MapSelectionWidget: FC<Props> = ({
    selectionCount,
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
            <FilterQueryBuilder
                isOpen={queryBuilderIsOpen}
                onClose={() => setQueryBuilderIsOpen(false)}
                onSubmit={onSubmitFilters}
            />
        </Box>
    );
};
