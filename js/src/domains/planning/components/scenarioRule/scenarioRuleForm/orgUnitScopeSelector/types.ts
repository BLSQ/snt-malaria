export type ScopeKind = 'rule' | 'hand' | 'exc' | 'none';

// Raw, independent membership tallies over the leaves under a node (not
// mutually exclusive - a leaf can count toward both `rule` and `exc` at
// once, e.g. a rule-matched leaf that was then excluded).
export type ScopeAggregate = {
    total: number;
    rule: number;
    hand: number;
    exc: number;
    scope: number;
};

export type ScopeTreeNode = {
    id: number;
    name: string;
    orgUnitTypeId: number;
    orgUnitTypeName: string;
    validationStatus?: string;
    // True for org units at the account's configured intervention level -
    // the only level exceptions/handpicks/rule-matches ever target.
    isLeaf: boolean;
    parentId?: number;
    children: number[];
};

export type ScopeTree = {
    nodesById: Map<number, ScopeTreeNode>;
    rootIds: number[];
    leafIds: number[];
    // For every node id (leaf or ancestor), the intervention-level leaf ids
    // under it (a leaf maps to itself).
    leafIdsByAncestor: Map<number, number[]>;
};

export type ScopeRow = {
    id: number;
    depth: number;
    isOpen: boolean;
};
