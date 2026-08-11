import { SvgIconComponent } from '@mui/icons-material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import CompressIcon from '@mui/icons-material/Compress';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import FunctionsIcon from '@mui/icons-material/Functions';
import LayersIcon from '@mui/icons-material/Layers';
import MediationIcon from '@mui/icons-material/Mediation';
import { IntlMessage } from 'bluesquare-components';
import { MESSAGES } from './messages';
import { CompositeNodeType, FlumeNodeInputData } from './types/flumeGraph';
import { DEFAULT_ORG_UNIT_SELECTION } from './utils/orgUnitSelection';

/**
 * Metadata for the operator node types, shared by `flumeConfig.ts`, `NodeHeaderContent.tsx`,
 * `utils/graphLayout.ts` and the node library. `dataLayer`/`output` are left out: they are never
 * created empty, so their defaults are special-cased where they're built.
 */
export type OperatorNodeType =
    | 'formula'
    | 'combine'
    | 'normalize'
    | 'classify'
    | 'filter';

/** Port name every operator node's result is exposed under (see `flumeConfig.ts`). */
export const OPERATOR_OUTPUT_PORT_NAME = 'result';

export type OperatorNodeTypeConfig = {
    type: OperatorNodeType;
    icon: SvgIconComponent;
    sortIndex: number;
    width: number;
    labelMessage: IntlMessage;
    descriptionMessage: IntlMessage;
    /** `inputData` for a freshly created instance of this node type (no upstream data yet). */
    defaultInputData: () => FlumeNodeInputData;
};

export const OPERATOR_NODE_TYPES: Record<
    OperatorNodeType,
    OperatorNodeTypeConfig
> = {
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
    filter: {
        type: 'filter',
        icon: FilterAltOutlinedIcon,
        sortIndex: 5,
        width: 330,
        labelMessage: MESSAGES.filterNodeLabel,
        descriptionMessage: MESSAGES.filterNodeDescription,
        defaultInputData: () => ({
            selection: { orgUnits: { ...DEFAULT_ORG_UNIT_SELECTION } },
        }),
    },
};

/** `OPERATOR_NODE_TYPES`, ordered the way they should appear in any node-type listing. */
export const OPERATOR_NODE_TYPE_LIST: OperatorNodeTypeConfig[] = Object.values(
    OPERATOR_NODE_TYPES,
).sort((a, b) => a.sortIndex - b.sortIndex);

/** Icon shown in each Flume node's canvas header, keyed by node type (see `NodeHeaderContent`). */
export const NODE_TYPE_ICONS: Record<CompositeNodeType, SvgIconComponent> = {
    dataLayer: LayersIcon,
    output: AccountTreeIcon,
    formula: OPERATOR_NODE_TYPES.formula.icon,
    combine: OPERATOR_NODE_TYPES.combine.icon,
    normalize: OPERATOR_NODE_TYPES.normalize.icon,
    classify: OPERATOR_NODE_TYPES.classify.icon,
    filter: OPERATOR_NODE_TYPES.filter.icon,
};
