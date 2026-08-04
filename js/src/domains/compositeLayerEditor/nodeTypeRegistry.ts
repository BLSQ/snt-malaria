import React from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import CompressIcon from '@mui/icons-material/Compress';
import FunctionsIcon from '@mui/icons-material/Functions';
import LayersIcon from '@mui/icons-material/Layers';
import MediationIcon from '@mui/icons-material/Mediation';
import { IntlMessage } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from './messages';
import { CompositeNodeType, FlumeNodeInputData } from './types/flumeGraph';

/**
 * Single source of truth for the 4 "operator" node types' metadata (icon, label, description,
 * canvas width, sort order in Flume's add-node menu, and the `inputData` a brand-new instance of
 * the node gets). Consumed by `flumeConfig.ts` (Flume node type registration),
 * `NodeHeaderContent.tsx` (canvas node header icon), `utils/graphLayout.ts` (layout width) and the
 * node library (drag-and-drop entries) - one definition per node type instead of one per consumer.
 *
 * `dataLayer`/`output` aren't included: their default data and dimensions are already
 * special-cased wherever they're built (they're never created "empty" the way an operator is).
 */
export type OperatorNodeType = 'formula' | 'combine' | 'normalize' | 'classify';

/** Port name every operator node's result is exposed under (see `flumeConfig.ts`). */
export const OPERATOR_OUTPUT_PORT_NAME = 'result';

export type OperatorNodeTypeConfig = {
    type: OperatorNodeType;
    icon: React.ComponentType<{ sx?: SxStyles[string] }>;
    sortIndex: number;
    width: number;
    labelMessage: IntlMessage;
    descriptionMessage: IntlMessage;
    /** `inputData` for a freshly created instance of this node type (no upstream data yet). */
    defaultInputData: () => FlumeNodeInputData;
};

export const OPERATOR_NODE_TYPES: Record<OperatorNodeType, OperatorNodeTypeConfig> = {
    formula: {
        type: 'formula',
        icon: FunctionsIcon,
        sortIndex: 1,
        width: 260,
        labelMessage: MESSAGES.formulaNodeLabel,
        descriptionMessage: MESSAGES.formulaNodeDescription,
        defaultInputData: () => ({ formula: { formula: '' } }),
    },
    combine: {
        type: 'combine',
        icon: MediationIcon,
        sortIndex: 2,
        width: 260,
        labelMessage: MESSAGES.combineNodeLabel,
        descriptionMessage: MESSAGES.combineNodeDescription,
        defaultInputData: () => ({ operation: { operation: 'mean' } }),
    },
    normalize: {
        type: 'normalize',
        icon: CompressIcon,
        sortIndex: 3,
        width: 260,
        labelMessage: MESSAGES.normalizeNodeLabel,
        descriptionMessage: MESSAGES.normalizeNodeDescription,
        defaultInputData: () => ({ scale: { scale: '1' } }),
    },
    classify: {
        type: 'classify',
        icon: CategoryIcon,
        sortIndex: 4,
        width: 320,
        labelMessage: MESSAGES.classifyNodeLabel,
        descriptionMessage: MESSAGES.classifyNodeDescription,
        defaultInputData: () => ({
            config: { rules: { rules: [], default: '' } },
        }),
    },
};

/** `OPERATOR_NODE_TYPES`, ordered the way they should appear in any node-type listing. */
export const OPERATOR_NODE_TYPE_LIST: OperatorNodeTypeConfig[] = Object.values(
    OPERATOR_NODE_TYPES,
).sort((a, b) => a.sortIndex - b.sortIndex);

/** Icon shown in each Flume node's canvas header, keyed by node type (see `NodeHeaderContent`). */
export const NODE_TYPE_ICONS: Record<
    CompositeNodeType,
    React.ComponentType<{ sx?: SxStyles[string] }>
> = {
    dataLayer: LayersIcon,
    output: AccountTreeIcon,
    formula: OPERATOR_NODE_TYPES.formula.icon,
    combine: OPERATOR_NODE_TYPES.combine.icon,
    normalize: OPERATOR_NODE_TYPES.normalize.icon,
    classify: OPERATOR_NODE_TYPES.classify.icon,
};
