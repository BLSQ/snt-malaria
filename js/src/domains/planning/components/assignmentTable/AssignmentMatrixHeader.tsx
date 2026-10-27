import React, { FC } from 'react';
import { Box, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { InlineSearchInput } from '../../../../components/InlineSearchInput';
import { overrideColors } from '../../../../constants/overrideColors';
import { MESSAGES } from '../../../messages';
import {
    COST_ITEM_COLUMN_WIDTH,
    districtColumnStyles,
    ellipsis,
    fillerCellStyles,
    getColumnWidth,
    GROUP_HEADER_HEIGHT,
    highlightTint,
} from './assignmentTableLayout';
import {
    AssignmentColumnGroup,
    AssignmentFlatColumn,
} from './buildAssignmentTable';

const GROUP_LABEL_PADDING = 12;

const styles = {
    headCell: {
        zIndex: 3,
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderBottomColor: 'divider',
    },
    highlightedHeadCell: { backgroundImage: highlightTint },
    districtHeadCell: {
        ...districtColumnStyles,
        zIndex: 4,
        pt: 0,
        pb: '6px',
        verticalAlign: 'bottom',
    },
    districtSearch: { height: 28 },
    groupHeadCell: {
        height: GROUP_HEADER_HEIGHT,
        boxSizing: 'border-box',
        py: 0,
        px: `${GROUP_LABEL_PADDING}px`,
        backgroundColor: 'grey.50',
        borderRight: 1,
        borderRightColor: overrideColors.inputBorder,
    },
    groupName: {
        ...ellipsis,
        display: 'block',
        fontWeight: 'medium',
        lineHeight: 1.3,
    },
    groupCategory: {
        ...ellipsis,
        display: 'block',
        color: 'text.secondary',
        lineHeight: 1.3,
    },
    costItemHeadCell: {
        top: GROUP_HEADER_HEIGHT,
        boxSizing: 'border-box',
        width: COST_ITEM_COLUMN_WIDTH,
        minWidth: COST_ITEM_COLUMN_WIDTH,
        maxWidth: COST_ITEM_COLUMN_WIDTH,
        py: 1,
        px: '10px',
        textAlign: 'right',
        verticalAlign: 'bottom',
        borderLeft: 1,
        borderLeftColor: 'divider',
    },
    firstCostItemHeadCell: { borderLeftColor: 'transparent' },
    lastCostItemHeadCell: {
        borderRight: 1,
        borderRightColor: overrideColors.inputBorder,
    },
    costItemLabel: {
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        color: 'text.secondary',
        fontWeight: 'medium',
        lineHeight: 1.35,
        textWrap: 'pretty',
    },
    fillerCell: fillerCellStyles,
} satisfies SxStyles;

const getGroupLabelWidth = (
    group: AssignmentColumnGroup,
    isCostItems: boolean,
) =>
    group.columns.length * getColumnWidth(isCostItems) -
    2 * GROUP_LABEL_PADDING;

type Props = {
    groups: AssignmentColumnGroup[];
    columns: AssignmentFlatColumn[];
    isCostItems: boolean;
    hoveredColumn: number | undefined;
    query: string;
    onQueryChange: (query: string) => void;
};

export const AssignmentMatrixHeader: FC<Props> = ({
    groups,
    columns,
    isCostItems,
    hoveredColumn,
    query,
    onQueryChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const headerRowSpan = isCostItems ? 2 : 1;

    return (
        <TableHead>
            <TableRow>
                <TableCell
                    rowSpan={headerRowSpan}
                    sx={[styles.headCell, styles.districtHeadCell]}
                >
                    <InlineSearchInput
                        value={query}
                        onChange={onQueryChange}
                        placeholder={formatMessage(
                            MESSAGES.assignmentTableSearch,
                        )}
                        sx={styles.districtSearch}
                    />
                </TableCell>
                {groups.map(group => (
                    <TableCell
                        key={group.intervention.id}
                        colSpan={group.columns.length}
                        title={group.intervention.name}
                        sx={[
                            styles.headCell,
                            styles.groupHeadCell,
                            !isCostItems &&
                                hoveredColumn === group.startIndex &&
                                styles.highlightedHeadCell,
                        ]}
                    >
                        <Box
                            sx={{
                                width: getGroupLabelWidth(group, isCostItems),
                            }}
                        >
                            <Typography
                                variant="body2"
                                component="span"
                                sx={styles.groupName}
                            >
                                {group.intervention.name}
                            </Typography>
                            <Typography
                                variant="caption"
                                component="span"
                                sx={styles.groupCategory}
                            >
                                {group.categoryName}
                            </Typography>
                        </Box>
                    </TableCell>
                ))}
                <TableCell
                    rowSpan={headerRowSpan}
                    sx={[styles.headCell, styles.fillerCell]}
                />
            </TableRow>
            {isCostItems && (
                <TableRow>
                    {columns.map(
                        ({ column, isFirstInGroup, isLastInGroup }, index) => (
                            <TableCell
                                key={column.key}
                                title={column.costLine?.name}
                                sx={[
                                    styles.headCell,
                                    styles.costItemHeadCell,
                                    isFirstInGroup &&
                                        styles.firstCostItemHeadCell,
                                    isLastInGroup &&
                                        styles.lastCostItemHeadCell,
                                    hoveredColumn === index &&
                                        styles.highlightedHeadCell,
                                ]}
                            >
                                <Typography
                                    variant="caption"
                                    sx={styles.costItemLabel}
                                >
                                    {column.costLine?.name ??
                                        formatMessage(
                                            MESSAGES.assignmentTableNoCostItems,
                                        )}
                                </Typography>
                            </TableCell>
                        ),
                    )}
                </TableRow>
            )}
        </TableHead>
    );
};
