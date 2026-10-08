import React, {
    FC,
    MouseEvent,
    UIEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UndoIcon from '@mui/icons-material/Undo';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import {
    Box,
    Button,
    MenuItem,
    Select,
    SelectChangeEvent,
    Tooltip,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { AdaptiveLabel } from '../../../../../components/AdaptiveLabel';
import { overrideColors } from '../../../../../constants/overrideColors';
import { useElementSize } from '../../../../../hooks/useElementSize';
import { Grant } from '../../../../costManagement/grants/types';
import { InterventionCostBreakdownLine } from '../../../../interventions/types';
import { MESSAGES } from '../../../../messages';
import {
    countInterventionOverrides,
    emptyInterventionOverride,
    findCostLineOverride,
    getDeployedYears,
    hasYearValue,
    replaceCostLineOverride,
    setDeploymentYears,
} from '../../../libs/override-utils';
import { RuleCostLineOverride } from '../../../types/scenarioRule';
import { CostLineOverrideRow } from './CostLineOverrideRow';
import { OverrideChip } from './OverrideChip';
import {
    getOverridesCompactWidth,
    getOverridesGridColumns,
    getOverridesGridMinWidth,
    getStickyCellStyles,
    getUnitCostColumnOffset,
    OVERRIDES_HOVER_ROW_CLASS,
    OVERRIDES_ROW_TILE_SIZE,
    OVERRIDES_SCROLLED_ATTRIBUTE,
    overridesGridStyles,
} from './overridesGrid';
import { useRuleInterventionOverride } from './useRuleInterventionOverride';

const NO_GRANT = '';
const GRANT_WIDTH = 280;
const HEADER_PADDING_LEFT = 16;
const HEADER_GAP = 16;
const INTERVENTION_TILE_SIZE = 36;
const NAME_BLOCK_GAP = 12;
const GRANT_GAP = 8;
const GRANT_SELECT_OFFSET =
    HEADER_PADDING_LEFT + HEADER_GAP + OVERRIDES_ROW_TILE_SIZE + GRANT_GAP;
const FOCUS_GLOW_MS = 2400;

const ellipsis = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const styles = {
    card: {
        display: 'flex',
        flexDirection: 'column',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        backgroundColor: 'background.paper',
        transition: 'box-shadow 300ms, border-color 300ms',
    },
    activeCard: {
        borderColor: 'primary.main',
    },
    glowingCard: {
        boxShadow: `0 0 0 3px ${overrideColors.focusGlow}`,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: `${HEADER_GAP}px`,
        minHeight: 56,
        py: 1,
        pr: 1.5,
        pl: `${HEADER_PADDING_LEFT}px`,
        cursor: 'pointer',
    },
    openHeader: {
        borderBottom: 1,
        borderColor: 'divider',
    },
    nameBlock: {
        display: 'flex',
        alignItems: 'center',
        gap: `${NAME_BLOCK_GAP}px`,
        minWidth: 0,
        flexGrow: 0,
        flexShrink: 1,
    },
    interventionTile: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: `0 0 ${INTERVENTION_TILE_SIZE}px`,
        width: INTERVENTION_TILE_SIZE,
        height: INTERVENTION_TILE_SIZE,
        borderRadius: 2,
        backgroundColor: overrideColors.overriddenBackground,
        color: 'primary.main',
    },
    interventionIcon: { fontSize: 22 },
    labels: { display: 'flex', flexDirection: 'column', minWidth: 0 },
    name: { ...ellipsis, fontWeight: 'medium' },
    caption: { color: 'text.secondary' },
    grant: {
        display: 'flex',
        alignItems: 'center',
        gap: `${GRANT_GAP}px`,
        flex: `0 1000 ${GRANT_WIDTH}px`,
        minWidth: GRANT_WIDTH / 2,
        cursor: 'default',
    },
    grantSelect: {
        flex: '1 1 auto',
        minWidth: 0,
        height: 30,
        typography: 'body2',
        '& .MuiSelect-select': { pl: 1.25, ...ellipsis },
    },
    overriddenGrantSelect: {
        backgroundColor: overrideColors.overriddenBackground,
        fontWeight: 'medium',
    },
    trailing: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        ml: 'auto',
        flex: '0 0 auto',
    },
    expandIcon: {
        display: 'flex',
        color: overrideColors.mutedIcon,
        transition: 'transform 150ms',
    },
    expandedIcon: { transform: 'rotate(180deg)' },
    body: { overflowX: 'auto' },
    stickyHeaderCell: {
        ...getStickyCellStyles('12px', '4px'),
        display: 'flex',
        alignItems: 'flex-end',
    },
    deploymentRow: {
        ...overridesGridStyles.row,
        py: 1.5,
    },
    deploymentLabel: {
        ...getStickyCellStyles('12px'),
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: 0,
    },
    deploymentText: { minWidth: 0, flex: '1 1 auto' },
    deploymentSummary: { color: 'text.secondary', ...ellipsis },
    changedDeploymentSummary: {
        color: overrideColors.overriddenText,
        fontWeight: 'medium',
    },
    selectAllCell: {
        display: 'flex',
        justifyContent: 'flex-end',
        minWidth: 0,
    },
    changedYearCell: { borderStyle: 'dashed' },
    changedNotDeployedYearCell: {
        borderColor: overrideColors.overriddenBorder,
    },
    columnHeaders: {
        ...overridesGridStyles.rowLayout,
        alignItems: 'end',
        pt: 1.5,
        pb: 0.5,
        borderTop: 1,
        borderColor: 'divider',
        typography: 'caption',
        color: 'text.secondary',
    },
    columnHeader: ellipsis,
    yearHeader: {
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
    },
    bodyEnd: { height: 6 },
    emptyCostItems: {
        px: 2,
        py: 1.5,
        borderTop: 1,
        borderColor: 'divider',
        color: 'text.secondary',
    },
} satisfies SxStyles;

type YearToggleProps = {
    year: number;
    isDeployed: boolean;
    hasCostItemValue: boolean;
    onToggle: (year: number) => void;
};

const DeploymentYearToggle: FC<YearToggleProps> = ({
    year,
    isDeployed,
    hasCostItemValue,
    onToggle,
}) => {
    const { formatMessage } = useSafeIntl();
    const handleClick = useCallback(() => onToggle(year), [onToggle, year]);
    return (
        <Tooltip
            title={formatMessage(
                isDeployed
                    ? MESSAGES.yearDeployedTooltip
                    : MESSAGES.yearNotDeployedTooltip,
                { year: String(year) },
            )}
        >
            <Box
                component="button"
                type="button"
                onClick={handleClick}
                sx={[
                    overridesGridStyles.yearCell,
                    isDeployed && overridesGridStyles.selectedYearCell,
                    hasCostItemValue && styles.changedYearCell,
                    hasCostItemValue &&
                        !isDeployed &&
                        styles.changedNotDeployedYearCell,
                ]}
            >
                {year}
            </Box>
        </Tooltip>
    );
};

type Props = {
    interventionId: number;
    interventionName: string;
    categoryName: string;
    defaultGrantId: number | null;
    costLines: InterventionCostBreakdownLine[];
    grants: Grant[];
    years: number[];
    currency: string;
    defaultBufferPercent: number;
    isActive: boolean;
    focusRequest: number;
    onSelect: (interventionId: number) => void;
    scrollMarginTop: number;
};

export const InterventionOverrideCard: FC<Props> = ({
    interventionId,
    interventionName,
    categoryName,
    defaultGrantId,
    costLines,
    grants,
    years,
    currency,
    defaultBufferPercent,
    isActive,
    focusRequest,
    onSelect,
    scrollMarginTop,
}) => {
    const { formatMessage } = useSafeIntl();
    const { override, updateOverride } =
        useRuleInterventionOverride(interventionId);
    const [isOpen, setIsOpen] = useState(isActive);
    const [isGlowing, setIsGlowing] = useState(false);
    const {
        ref: cardRef,
        element: cardElement,
        size: cardSize,
    } = useElementSize<HTMLDivElement>();
    const cardElementRef = useRef(cardElement);
    cardElementRef.current = cardElement;
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;

    useEffect(() => {
        if (!isActive) {
            setIsGlowing(false);
        }
    }, [isActive]);

    useEffect(() => {
        if (!isActiveRef.current) {
            return undefined;
        }
        setIsOpen(true);
        setIsGlowing(true);
        const scrollTimeout = setTimeout(
            () =>
                cardElementRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                }),
            30,
        );
        const glowTimeout = setTimeout(
            () => setIsGlowing(false),
            FOCUS_GLOW_MS,
        );
        return () => {
            clearTimeout(scrollTimeout);
            clearTimeout(glowTimeout);
        };
    }, [focusRequest]);

    const deployedYears = useMemo(
        () => getDeployedYears(override, years),
        [override, years],
    );
    const overrideCount = countInterventionOverrides(override);

    const handleToggleOpen = useCallback(() => setIsOpen(open => !open), []);
    const [isScrolled, setIsScrolled] = useState(false);
    const cardWidth = cardSize?.width ?? Infinity;
    const isCompact = cardWidth < getOverridesCompactWidth(years.length);

    const labelsRef = useRef<HTMLDivElement>(null);
    const [nameContentWidth, setNameContentWidth] = useState(0);
    useLayoutEffect(() => {
        const labels = labelsRef.current;
        if (!labels) return;
        const textWidth = Math.max(
            ...Array.from(labels.children).map(child => child.scrollWidth),
        );
        setNameContentWidth(INTERVENTION_TILE_SIZE + NAME_BLOCK_GAP + textWidth);
    }, [interventionName, categoryName]);
    const nameBlockSx = useMemo(() => {
        const alignedWidth = Number.isFinite(cardWidth)
            ? getUnitCostColumnOffset(cardWidth, years.length, isCompact) -
              GRANT_SELECT_OFFSET
            : 0;
        return { flexBasis: `${Math.max(alignedWidth, nameContentWidth)}px` };
    }, [cardWidth, isCompact, nameContentWidth, years.length]);
    const gridSx = useMemo(
        () => ({
            gridTemplateColumns: getOverridesGridColumns(years.length, isCompact),
        }),
        [isCompact, years.length],
    );
    const scrollMarginSx = useMemo(
        () => ({ scrollMarginTop: `${scrollMarginTop}px` }),
        [scrollMarginTop],
    );
    const gridWidthSx = useMemo(
        () => ({ minWidth: getOverridesGridMinWidth(years.length, isCompact) }),
        [isCompact, years.length],
    );
    const handleBodyScroll = useCallback(
        (event: UIEvent<HTMLDivElement>) =>
            setIsScrolled(event.currentTarget.scrollLeft > 0),
        [],
    );
    const handleSelect = useCallback(
        () => onSelect(interventionId),
        [interventionId, onSelect],
    );
    const stopPropagation = useCallback(
        (event: MouseEvent) => event.stopPropagation(),
        [],
    );

    const handleGrantChange = useCallback(
        (event: SelectChangeEvent<number | string>) => {
            const grantId = event.target.value;
            updateOverride({
                ...override,
                grant:
                    grantId === NO_GRANT || grantId === defaultGrantId
                        ? null
                        : Number(grantId),
            });
        },
        [defaultGrantId, override, updateOverride],
    );

    const handleRevertAll = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            updateOverride({
                ...emptyInterventionOverride(interventionId),
                deployment_years: override.deployment_years,
            });
        },
        [interventionId, override.deployment_years, updateOverride],
    );

    const handleToggleYear = useCallback(
        (year: number) => {
            const nextYears = deployedYears.includes(year)
                ? deployedYears.filter(deployedYear => deployedYear !== year)
                : [...deployedYears, year];
            updateOverride(setDeploymentYears(override, nextYears, years));
        },
        [deployedYears, override, updateOverride, years],
    );

    const isEveryYearDeployed = deployedYears.length === years.length;
    const handleToggleAllYears = useCallback(
        () =>
            updateOverride(
                setDeploymentYears(
                    override,
                    isEveryYearDeployed ? [] : years,
                    years,
                ),
            ),
        [isEveryYearDeployed, override, updateOverride, years],
    );

    const handleCostLineChange = useCallback(
        (next: RuleCostLineOverride) =>
            updateOverride(replaceCostLineOverride(override, next)),
        [override, updateOverride],
    );

    let deploymentSummary = formatMessage(MESSAGES.deploymentEveryYear);
    if (deployedYears.length === 0) {
        deploymentSummary = formatMessage(MESSAGES.deploymentNoYears);
    } else if (!isEveryYearDeployed) {
        deploymentSummary = formatMessage(MESSAGES.deploymentSomeYears, {
            count: String(deployedYears.length),
            total: String(years.length),
        });
    }

    return (
        <Box
            ref={cardRef}
            onMouseDownCapture={handleSelect}
            onFocusCapture={handleSelect}
            sx={[
                styles.card,
                isActive && styles.activeCard,
                isGlowing && styles.glowingCard,
                scrollMarginSx,
            ]}
        >
            <Box
                sx={[styles.header, isOpen && styles.openHeader]}
                onClick={handleToggleOpen}
            >
                <Box sx={[styles.nameBlock, nameBlockSx]}>
                    <Box component="span" sx={styles.interventionTile}>
                        <VaccinesIcon sx={styles.interventionIcon} />
                    </Box>
                    <Box ref={labelsRef} sx={styles.labels}>
                        <Typography
                            variant="body1"
                            title={interventionName}
                            sx={styles.name}
                        >
                            {interventionName}
                        </Typography>
                        <Typography variant="caption" sx={styles.caption}>
                            {categoryName}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={styles.grant} onClick={stopPropagation}>
                    <Box component="span" sx={overridesGridStyles.tile}>
                        <AccountBalanceIcon sx={overridesGridStyles.smallIcon} />
                    </Box>
                    <Select<number | string>
                        size="small"
                        value={override.grant ?? defaultGrantId ?? NO_GRANT}
                        onChange={handleGrantChange}
                        inputProps={{
                            'aria-label': formatMessage(MESSAGES.grant),
                        }}
                        sx={[
                            styles.grantSelect,
                            override.grant !== null &&
                                styles.overriddenGrantSelect,
                        ]}
                    >
                        {defaultGrantId === null && (
                            <MenuItem value={NO_GRANT}>
                                {formatMessage(MESSAGES.grantDefault, {
                                    grant: formatMessage(MESSAGES.noGrant),
                                })}
                            </MenuItem>
                        )}
                        {grants.map(grant => (
                            <MenuItem key={grant.id} value={grant.id}>
                                {grant.id === defaultGrantId
                                    ? formatMessage(MESSAGES.grantDefault, {
                                          grant: grant.name,
                                      })
                                    : grant.name}
                            </MenuItem>
                        ))}
                    </Select>
                </Box>
                <Box sx={styles.trailing}>
                    {overrideCount > 0 && (
                        <>
                            <OverrideChip count={overrideCount} />
                            <Button
                                size="small"
                                startIcon={
                                    <UndoIcon
                                        sx={overridesGridStyles.smallIcon}
                                    />
                                }
                                onClick={handleRevertAll}
                                sx={overridesGridStyles.textAction}
                            >
                                {formatMessage(MESSAGES.revertAll)}
                            </Button>
                        </>
                    )}
                    <Box
                        component="span"
                        sx={[styles.expandIcon, isOpen && styles.expandedIcon]}
                    >
                        <ExpandMoreIcon />
                    </Box>
                </Box>
            </Box>
            {isOpen && (
                <Box
                    sx={styles.body}
                    onScroll={handleBodyScroll}
                    {...{ [OVERRIDES_SCROLLED_ATTRIBUTE]: isScrolled }}
                >
                    <Box sx={gridWidthSx}>
                        <Box
                            className={OVERRIDES_HOVER_ROW_CLASS}
                            sx={[styles.deploymentRow, gridSx]}
                        >
                            <Box sx={styles.deploymentLabel}>
                                <Box
                                    component="span"
                                    sx={overridesGridStyles.tile}
                                >
                                    <EventAvailableIcon
                                        sx={overridesGridStyles.smallIcon}
                                    />
                                </Box>
                                <Box sx={styles.deploymentText}>
                                    <Typography
                                        variant="body2"
                                        fontWeight="medium"
                                        noWrap
                                    >
                                        {formatMessage(
                                            MESSAGES.yearlyDeployment,
                                        )}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        component="div"
                                        sx={[
                                            styles.deploymentSummary,
                                            !isEveryYearDeployed &&
                                                styles.changedDeploymentSummary,
                                        ]}
                                    >
                                        {deploymentSummary}
                                    </Typography>
                                </Box>
                            </Box>
                            <span />
                            <span />
                            <span />
                            <span />
                            <Box sx={styles.selectAllCell}>
                                <Button
                                    size="small"
                                    onClick={handleToggleAllYears}
                                    sx={overridesGridStyles.textAction}
                                >
                                    {formatMessage(
                                        isEveryYearDeployed
                                            ? MESSAGES.selectNone
                                            : MESSAGES.selectAllYears,
                                    )}
                                </Button>
                            </Box>
                            {years.map(year => (
                                <DeploymentYearToggle
                                    key={year}
                                    year={year}
                                    isDeployed={deployedYears.includes(year)}
                                    hasCostItemValue={hasYearValue(
                                        override,
                                        year,
                                    )}
                                    onToggle={handleToggleYear}
                                />
                            ))}
                        </Box>
                        {costLines.length > 0 ? (
                            <>
                                <Box sx={[styles.columnHeaders, gridSx]}>
                                    <Box
                                        component="span"
                                        sx={styles.stickyHeaderCell}
                                    >
                                        {formatMessage(MESSAGES.costItemColumn)}
                                    </Box>
                                    <Box component="span" sx={styles.columnHeader}>
                                        {formatMessage(
                                            MESSAGES.budgetingCostLineUnitCost,
                                        )}
                                    </Box>
                                    <Box component="span" sx={styles.columnHeader}>
                                        {formatMessage(
                                            MESSAGES.conversionFactorShort,
                                        )}
                                    </Box>
                                    <Box component="span" sx={styles.columnHeader}>
                                        {formatMessage(
                                            MESSAGES.budgetingCostLineBuffer,
                                        )}
                                    </Box>
                                    <Tooltip
                                        title={formatMessage(
                                            MESSAGES.coverageOrQuantityTooltip,
                                        )}
                                    >
                                        <Box
                                            component="span"
                                            sx={styles.columnHeader}
                                        >
                                            <AdaptiveLabel
                                                label={formatMessage(
                                                    MESSAGES.coverageOrQuantityColumn,
                                                )}
                                                shortLabel={formatMessage(
                                                    MESSAGES.coverageOrQuantityColumnCompact,
                                                )}
                                            />
                                        </Box>
                                    </Tooltip>
                                    <span />
                                    {years.map(year => (
                                        <Box
                                            component="span"
                                            key={year}
                                            sx={styles.yearHeader}
                                        >
                                            {year}
                                        </Box>
                                    ))}
                                </Box>
                                {costLines.map(line => (
                                    <CostLineOverrideRow
                                        key={line.id}
                                        line={line}
                                        costLineOverride={findCostLineOverride(
                                            override,
                                            line.id,
                                        )}
                                        years={years}
                                        deployedYears={deployedYears}
                                        currency={currency}
                                        defaultBufferPercent={
                                            defaultBufferPercent
                                        }
                                        isCompact={isCompact}
                                        onChange={handleCostLineChange}
                                    />
                                ))}
                                <Box sx={styles.bodyEnd} />
                            </>
                        ) : (
                            <Typography
                                variant="body2"
                                sx={styles.emptyCostItems}
                            >
                                {formatMessage(
                                    MESSAGES.noInterventionCostItems,
                                )}
                            </Typography>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
};
