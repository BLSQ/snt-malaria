import React, { FC, useCallback } from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
    Box,
    ClickAwayListener,
    ListItem,
    ListItemIcon,
    MenuItem,
    MenuList,
    Popover,
    SxProps,
    Tooltip,
    Typography,
} from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import { SxStyles } from 'Iaso/types/general';
import { MetricType } from '../../../planning/types/metrics';
import { MESSAGES } from '../../messages';

type MetricTypeLineProps = {
    metricType: MetricType;
    onEdit: (metricType: MetricType) => void;
    onDelete: (metricType: MetricType) => void;
    readonly?: boolean;
};

const styles: SxStyles = {
    metricType: {
        borderRadius: 2,
        '&:nth-child(odd of .MuiListItem-root)': {
            backgroundColor: 'action.hover',
        },
    },
    metricTypeReadOnly: {
        pr: '48px',
    },
    metricTypeIcon: { minWidth: 20, mr: 2 },
    metricTypeDetails: {
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'space-between',
        marginRight: 4,
    },
};

export const MetricTypeLine: FC<MetricTypeLineProps> = ({
    metricType,
    onEdit,
    onDelete,
    readonly = false,
}) => {
    const anchorRef = React.useRef<HTMLLIElement>(null);
    const [showMoreActions, setShowMoreActions] = React.useState(false);
    const { formatMessage } = useSafeIntl();
    const toggleMoreActions = useCallback(() => {
        setShowMoreActions(!showMoreActions);
    }, [showMoreActions]);

    return (
        <ListItem
            key={metricType.id}
            sx={
                {
                    ...styles.metricType,
                    ...(readonly ? styles.metricTypeReadOnly : {}),
                } as SxProps
            }
            ref={anchorRef}
            secondaryAction={
                readonly ? null : (
                    <IconButton
                        aria-label="more-info"
                        overrideIcon={MoreHorizIcon}
                        tooltipMessage={MESSAGES.more}
                        onClick={toggleMoreActions}
                    ></IconButton>
                )
            }
        >
            <ListItemIcon sx={styles.metricTypeIcon}>
                <Tooltip title={metricType.description || 'N/A'}>
                    <InfoOutlinedIcon />
                </Tooltip>
            </ListItemIcon>
            <Box sx={styles.metricTypeDetails}>
                <Typography variant="body2">{metricType.name}</Typography>
                <Typography variant="body2">{metricType.origin}</Typography>
            </Box>
            <Popover
                id="metric_type_line_actions"
                open={showMoreActions}
                anchorEl={anchorRef.current}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <ClickAwayListener
                    onClickAway={() => setShowMoreActions(false)}
                >
                    <MenuList>
                        <MenuItem onClick={() => onEdit(metricType)}>
                            {formatMessage(MESSAGES.editMetricType)}
                        </MenuItem>
                        <DeleteModal
                            type="menuItem"
                            onConfirm={() => onDelete(metricType)}
                            onCancel={() => setShowMoreActions(false)}
                            titleMessage={MESSAGES.deleteMetricType}
                            iconProps={{}}
                            key={`delete-metric-type-${metricType.id}`}
                            backdropClick={true}
                        >
                            {formatMessage(
                                MESSAGES.deleteMetricTypeConfirmMessage,
                            )}
                        </DeleteModal>
                    </MenuList>
                </ClickAwayListener>
            </Popover>
        </ListItem>
    );
};
