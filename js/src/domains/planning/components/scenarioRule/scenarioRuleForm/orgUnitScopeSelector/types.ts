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
