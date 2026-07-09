import React, { FC, useCallback } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
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
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import { DisplayIfUserHasPerm } from 'Iaso/components/DisplayIfUserHasPerm';
import { SxStyles } from 'Iaso/types/general';
import * as CorePermission from 'Iaso/utils/permissions';
import { useDataLayerComparisonContext } from '../contexts/DataLayerComparisonContext';
import { DATA_LAYER_DND_MIME } from '../dragAndDrop';
import { MESSAGES } from '../messages';
import { MetricType } from '../types/metrics';

type Props = {
    metricType: MetricType;
    selected?: boolean;
    onClick: () => void;
    onEdit: (metricType: MetricType) => void;
    /** Present only for composite layers: opens the node editor for that composite. */
    onEditComposite?: (compositeLayerId: number) => void;
    /** Set when this layer is a composite, identifying its composite layer record. */
    compositeLayerId?: number;
    onDelete: (metricType: number) => void;
    /**
     * While the composite editor is open the list becomes a drag source rather than a selector:
     * selection is locked (clicks do nothing), the row actions (comparison "+" and the more-actions
     * menu) are hidden, and the row can be dragged onto the canvas to create a data layer node.
     */
    editing?: boolean;
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
    metricTypeDraggable: {
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
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
    onEditComposite,
    compositeLayerId,
    onDelete,
    editing = false,
}) => {
    const isComposite = compositeLayerId !== undefined;
    const theme = useTheme();
    const onDragStart = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            e.dataTransfer.setData(DATA_LAYER_DND_MIME, String(metricType.id));
            e.dataTransfer.setData('text/plain', metricType.name);
            e.dataTransfer.effectAllowed = 'copy';
            // The browser's default drag image is a square snapshot that ignores the row's
            // border-radius. Clone the actual row so it looks identical, then just clip it to the
            // rounded corners (opaque background so the rounding is visible).
            const row = e.currentTarget;
            const rect = row.getBoundingClientRect();
            const clone = row.cloneNode(true) as HTMLElement;
            Object.assign(clone.style, {
                position: 'fixed',
                top: '-1000px',
                left: '-1000px',
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                margin: '0',
                boxSizing: 'border-box',
                borderRadius: `${theme.shape.borderRadius * 2}px`,
                overflow: 'hidden',
                background: theme.palette.background.paper,
            } as Partial<CSSStyleDeclaration>);
            document.body.appendChild(clone);
            e.dataTransfer.setDragImage(
                clone,
                e.clientX - rect.left,
                e.clientY - rect.top,
            );
            // Remove after the browser has captured the snapshot.
            requestAnimationFrame(() => clone.remove());
        },
        [metricType.id, metricType.name, theme],
    );
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
            draggable={editing}
            onDragStart={editing ? onDragStart : undefined}
            sx={
                {
                    ...styles.metricType,
                    ...(editing ? styles.metricTypeDraggable : {}),
                    ...(selected ? styles.metricTypeSelected : {}),
                } as SxProps
            }
            ref={anchorRef}
            secondaryAction={
                editing ? undefined : (
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
                )
            }
            onClick={editing ? undefined : onClick}
        >
            <Box sx={styles.metricTypeDetails}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {isComposite && (
                        <Tooltip title={formatMessage(MESSAGES.compositeLayer)}>
                            <AccountTreeIcon fontSize="small" color="action" />
                        </Tooltip>
                    )}
                    <Typography variant="body2">{metricType.name}</Typography>
                </Box>
            </Box>
            <Box
                className="action-box"
                sx={editing ? { display: 'none' } : undefined}
            >
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
                            {isComposite && onEditComposite && (
                                <MenuItem
                                    onClick={() =>
                                        onEditComposite(compositeLayerId)
                                    }
                                >
                                    {formatMessage(MESSAGES.editCompositeLayer)}
                                </MenuItem>
                            )}
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
