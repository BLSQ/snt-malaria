import React, { FC, useMemo } from 'react';
import { Box, Palette, useTheme } from '@mui/material';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { OrgUnitTreeRow } from '../../../../../../components/orgUnitTree/OrgUnitTreeRow';
import {
    OrgUnitTreeNode,
    TreeCheckState,
} from '../../../../../../components/orgUnitTree/types';
import { MESSAGES } from '../../../../../messages';
import { ruleFormColors } from '../styles';
import { ScopeAggregate, ScopeKind } from './types';

const countPill = {
    display: 'inline-flex',
    alignItems: 'center',
    height: 20,
    px: 1,
    borderRadius: 999,
    fontWeight: 'bold',
};

const styles = {
    handpickedPill: {
        ...countPill,
        backgroundColor: 'primary.main',
        color: 'common.white',
    },
    excludedPill: {
        ...countPill,
        backgroundColor: ruleFormColors.excludedBackground,
        color: 'error.dark',
    },
} satisfies SxStyles;

type RowAppearance = {
    boxColor?: string;
    rowBackgroundColor: string;
    tooltip: IntlMessage;
};

const getRowAppearance = (
    isLeaf: boolean,
    kind: ScopeKind | undefined,
    branchScope: number,
    palette: Palette,
): RowAppearance => {
    if (!isLeaf) {
        return branchScope > 0
            ? {
                  boxColor: ruleFormColors.ruleMatch,
                  rowBackgroundColor: 'transparent',
                  tooltip: MESSAGES.scopeBranchExcludeAllTooltip,
              }
            : {
                  rowBackgroundColor: 'transparent',
                  tooltip: MESSAGES.scopeBranchIncludeAllTooltip,
              };
    }
    switch (kind) {
        case 'exc':
            return {
                boxColor: palette.error.main,
                rowBackgroundColor: ruleFormColors.excludedBackground,
                tooltip: MESSAGES.scopeLeafExcludedTooltip,
            };
        case 'hand':
            return {
                boxColor: palette.primary.main,
                rowBackgroundColor: palette.primary.light,
                tooltip: MESSAGES.scopeLeafHandpickedTooltip,
            };
        case 'rule':
            return {
                boxColor: ruleFormColors.ruleMatch,
                rowBackgroundColor: 'transparent',
                tooltip: MESSAGES.scopeLeafRuleTooltip,
            };
        default:
            return {
                rowBackgroundColor: 'transparent',
                tooltip: MESSAGES.scopeLeafUnselectedTooltip,
            };
    }
};

const getCheckState = (
    isLeaf: boolean,
    kind: ScopeKind | undefined,
    aggregate: ScopeAggregate,
): TreeCheckState => {
    if (isLeaf) {
        if (kind === 'exc') return 'crossed';
        return kind === 'hand' || kind === 'rule' ? 'checked' : 'empty';
    }
    if (aggregate.total > 0 && aggregate.scope === aggregate.total) {
        return 'checked';
    }
    return aggregate.scope > 0 ? 'partial' : 'empty';
};

type Props = {
    node: OrgUnitTreeNode;
    depth: number;
    aggregate: ScopeAggregate;
    kind?: ScopeKind;
    hasCriteria: boolean;
    isOpen: boolean;
    onToggleOpen: () => void;
    onToggleSelection: () => void;
};

export const ScopeTreeRow: FC<Props> = ({
    node,
    depth,
    aggregate,
    kind,
    hasCriteria,
    isOpen,
    onToggleOpen,
    onToggleSelection,
}) => {
    const theme = useTheme();
    const { formatMessage } = useSafeIntl();

    const { boxColor, rowBackgroundColor, tooltip } = useMemo(
        () =>
            getRowAppearance(node.isLeaf, kind, aggregate.scope, theme.palette),
        [node.isLeaf, kind, aggregate.scope, theme.palette],
    );

    return (
        <OrgUnitTreeRow
            node={node}
            depth={depth}
            isOpen={isOpen}
            checkState={getCheckState(node.isLeaf, kind, aggregate)}
            tooltip={formatMessage(tooltip)}
            boxColor={boxColor}
            rowBackgroundColor={rowBackgroundColor}
            isLabelStruckThrough={node.isLeaf && kind === 'exc'}
            branchMeta={
                !node.isLeaf && (
                    <>
                        <span>
                            {aggregate.scope}/{aggregate.total}
                        </span>
                        {hasCriteria && aggregate.hand > 0 && (
                            <Box component="span" sx={styles.handpickedPill}>
                                +{aggregate.hand}
                            </Box>
                        )}
                        {hasCriteria && aggregate.exc > 0 && (
                            <Box component="span" sx={styles.excludedPill}>
                                −{aggregate.exc}
                            </Box>
                        )}
                    </>
                )
            }
            onToggleOpen={onToggleOpen}
            onToggleSelection={onToggleSelection}
        />
    );
};
