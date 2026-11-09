export type OrgUnitTreeNode = {
    id: number;
    name: string;
    orgUnitTypeId: number;
    orgUnitTypeName: string;
    validationStatus?: string;
    // True for org units at the account's configured intervention level.
    isLeaf: boolean;
    parentId?: number;
    children: number[];
};

export type OrgUnitTree = {
    nodesById: Map<number, OrgUnitTreeNode>;
    rootIds: number[];
    leafIds: number[];
    // For every node id (leaf or ancestor), the intervention-level leaf ids
    // under it (a leaf maps to itself).
    leafIdsByAncestor: Map<number, number[]>;
};

export type VisibleTreeRow = {
    id: number;
    depth: number;
    isOpen: boolean;
};

export type TreeCheckState = 'checked' | 'partial' | 'crossed' | 'empty';
