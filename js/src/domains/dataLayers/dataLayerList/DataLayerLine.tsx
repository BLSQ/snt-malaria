import React, { FC, useCallback } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LayersIcon from '@mui/icons-material/Layers';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    CircularProgress,
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
import { OpenHexaSvg } from 'Iaso/components/svg/OpenHexaSvg';
import { SxStyles } from 'Iaso/types/general';
import * as CorePermission from 'Iaso/utils/permissions';
import { MESSAGES as commonMessages } from '../../messages';
import { useDataLayerComparisonContext } from '../contexts/DataLayerComparisonContext';
import { DATA_LAYER_DND_MIME } from '../dragAndDrop';
import { OpenHexaImportStatus } from '../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../messages';
import { MetricType } from '../types/metrics';
import { getImportStatusKind } from './importStatus';

type Props = {
    metricType: MetricType;
    selected?: boolean;
    onClick: () => void;
    onEdit: (metricType: MetricType) => void;
    /** Set when this layer is a composite, to show the composite icon. */
    compositeLayerId?: number;
    onEditComposite?: (compositeLayerId: number) => void;
    onDelete: (metricType: number) => void;
    /** Re-run the OpenHexa value import (row menu only; absent in the composite-editor list). */
    onRefreshOpenHexaLayer?: (metricType: MetricType) => void;
    /** Latest OpenHexa value-import task status for this layer, if any. */
    importStatus?: OpenHexaImportStatus;
    /** While the composite editor is open, the row is a drag source rather than a selector. */
    editing?: boolean;
    /** Lets the parent list track this row's DOM node, e.g. to scroll it into view. */
    onRowRef?: (node: HTMLLIElement | null) => void;
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

type LayerTypeIconProps = {
    importStatus?: OpenHexaImportStatus;
    isComplete: boolean;
    isComposite: boolean;
    isOpenHexa: boolean;
};

/** The layer row's single leading icon, in priority order: the import spinner, an import
 *  failure, an incomplete-setup warning, then (only once none of those apply) the plain
 *  layer-type icon (composite / OpenHexa / generic). */
const LayerTypeIcon: FC<LayerTypeIconProps> = ({
    importStatus,
    isComplete,
    isComposite,
    isOpenHexa,
}) => {
    const { formatMessage } = useSafeIntl();
    const importStatusKind = getImportStatusKind(importStatus);

    if (importStatusKind === 'loading') {
        return (
            <Tooltip
                title={
                    importStatus?.progress_message ||
                    formatMessage(MESSAGES.importRunning)
                }
            >
                <CircularProgress size={20} sx={styles.metricTypeIcon} />
            </Tooltip>
        );
    }
    if (importStatusKind === 'error') {
        return (
            <Tooltip
                title={
                    importStatus?.progress_message ||
                    formatMessage(MESSAGES.importFailed)
                }
            >
                <ErrorOutlineIcon
                    fontSize="small"
                    color="error"
                    sx={styles.metricTypeIcon}
                />
            </Tooltip>
        );
    }
    if (!isComplete) {
        return (
            <Tooltip title={formatMessage(MESSAGES.layerSetupIncomplete)}>
                <WarningAmberIcon
                    fontSize="small"
                    color="warning"
                    sx={styles.metricTypeIcon}
                />
            </Tooltip>
        );
    }
    if (isComposite) {
        return (
            <Tooltip title={formatMessage(MESSAGES.compositeLayer)}>
                <AccountTreeIcon
                    fontSize="small"
                    color="action"
                    sx={styles.metricTypeIcon}
                />
            </Tooltip>
        );
    }
    if (isOpenHexa) {
        return (
            <Tooltip title={formatMessage(MESSAGES.layerTypeOpenHexa)}>
                <OpenHexaSvg
                    fontSize="small"
                    color="action"
                    disabled={false}
                    sx={styles.metricTypeIcon}
                />
            </Tooltip>
        );
    }
    return (
        <LayersIcon
            fontSize="small"
            color="action"
            sx={styles.metricTypeIcon}
        />
    );
};

export const DataLayerLine: FC<Props> = ({
    metricType,
    selected = false,
    onClick,
    onEdit,
    compositeLayerId,
    onEditComposite,
    onDelete,
    onRefreshOpenHexaLayer,
    importStatus,
    editing = false,
    onRowRef,
}) => {
    const isComposite = compositeLayerId !== undefined;
    const isOpenHexa = metricType.origin === 'openhexa';
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
    const anchorRef = React.useRef<HTMLLIElement | null>(null);
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
            ref={node => {
                anchorRef.current = node;
                onRowRef?.(node);
            }}
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
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LayerTypeIcon
                        importStatus={importStatus}
                        isComplete={metricType.is_complete !== false}
                        isComposite={isComposite}
                        isOpenHexa={isOpenHexa}
                    />
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
                            {compositeLayerId !== undefined &&
                                onEditComposite && (
                                    <MenuItem
                                        onClick={() => {
                                            setShowMoreActions(false);
                                            onEditComposite(compositeLayerId);
                                        }}
                                    >
                                        {formatMessage(
                                            commonMessages.compositeEditor,
                                        )}
                                    </MenuItem>
                                )}
                            {metricType.origin === 'openhexa' &&
                                onRefreshOpenHexaLayer && (
                                    <MenuItem
                                        onClick={() => {
                                            setShowMoreActions(false);
                                            onRefreshOpenHexaLayer(metricType);
                                        }}
                                    >
                                        {formatMessage(
                                            MESSAGES.refreshFromOpenHexa,
                                        )}
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
