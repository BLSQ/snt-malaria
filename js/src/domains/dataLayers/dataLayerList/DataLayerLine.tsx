import React, { FC, useCallback } from 'react';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
    Box,
    ClickAwayListener,
    ListItem,
    MenuItem,
    MenuList,
    Popover,
    SxProps,
    Typography,
} from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import { DisplayIfUserHasPerm } from 'Iaso/components/DisplayIfUserHasPerm';
import { SxStyles } from 'Iaso/types/general';
import * as CorePermission from 'Iaso/utils/permissions';
import { useDataLayerComparisonContext } from '../contexts/DataLayerComparisonContext';
import { MESSAGES } from '../messages';
import { MetricType } from '../types/metrics';

type Props = {
    metricType: MetricType;
    selected?: boolean;
    onClick: () => void;
    onEdit: (metricType: MetricType) => void;
    onDelete: (metricType: number) => void;
};

const styles: SxStyles = {
    metricType: {
        borderRadius: 2,
        py: 0,
        border: '1px solid transparent',
        cursor: 'pointer',
        ' .action-box, .MuiListItemSecondaryAction-root': {
            visibility: 'hidden',
        },
        '&:hover': {
            bgcolor: 'action.hover',
            ' .action-box, .MuiListItemSecondaryAction-root': {
                visibility: 'visible',
            },
        },
    },
    metricTypeSelected: {
        bgcolor: 'primary.light',
        borderColor: 'primary.main',
        borderWidth: 1,
        borderStyle: 'solid',
    },
    metricTypeIcon: { minWidth: 20, mr: 2 },
    metricTypeDetails: {
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'space-between',
        marginRight: 4,
        py: 2,
    },
};

export const DataLayerLine: FC<Props> = ({
    metricType,
    selected = false,
    onClick,
    onEdit,
    onDelete,
}) => {
    const anchorRef = React.useRef<HTMLLIElement>(null);
    const [showMoreActions, setShowMoreActions] = React.useState(false);
    const { formatMessage } = useSafeIntl();
    const toggleMoreActions = useCallback(() => {
        setShowMoreActions(!showMoreActions);
    }, [showMoreActions]);
    const { addMetricToComparison, maxMetricsCountReached } =
        useDataLayerComparisonContext();
    const onAddMetricToComparison = useCallback(
        (e: Event) => {
            e.stopPropagation();
            addMetricToComparison(metricType);
        },
        [addMetricToComparison, metricType],
    );

    return (
        <ListItem
            key={metricType.id}
            sx={
                {
                    ...styles.metricType,
                    ...(selected ? styles.metricTypeSelected : {}),
                } as SxProps
            }
            ref={anchorRef}
            secondaryAction={
                <DisplayIfUserHasPerm
                    permissions={[CorePermission.METRIC_TYPES]}
                >
                    <IconButton
                        aria-label="more-info"
                        overrideIcon={MoreHorizIcon}
                        tooltipMessage={MESSAGES.more}
                        onClick={toggleMoreActions}
                    ></IconButton>
                </DisplayIfUserHasPerm>
            }
            onClick={onClick}
        >
            <Box sx={styles.metricTypeDetails}>
                <Typography variant="body2">{metricType.name}</Typography>
            </Box>
            <Box className="action-box">
                {maxMetricsCountReached ? undefined : (
                    <IconButton
                        aria-label="add-to-comparison"
                        tooltipMessage={MESSAGES.addToComparison}
                        overrideIcon={AddCircleOutlineOutlinedIcon}
                        disabled={maxMetricsCountReached}
                        onClick={onAddMetricToComparison}
                    ></IconButton>
                )}
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
                                {formatMessage(MESSAGES.editLayer)}
                            </MenuItem>
                            <DeleteModal
                                type="menuItem"
                                onConfirm={() => onDelete(metricType.id)}
                                onCancel={() => setShowMoreActions(false)}
                                titleMessage={MESSAGES.deleteLayer}
                                iconProps={{}}
                                key={`delete-layer-${metricType.id}`}
                                backdropClick={true}
                            >
                                {formatMessage(
                                    MESSAGES.deleteLayerConfirmMessage,
                                )}
                            </DeleteModal>
                        </MenuList>
                    </ClickAwayListener>
                </Popover>
            </Box>
        </ListItem>
    );
};
