import React, {
    FC,
    UIEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../../constants/overrideColors';
import { useElementSize } from '../../../../../hooks/useElementSize';
import { Grant } from '../../../../costManagement/grants/types';
import { InterventionCostBreakdownLine } from '../../../../interventions/types';
import { MESSAGES } from '../../../../messages';
import {
    findCostLineOverride,
    getDeployedYears,
    replaceCostLineOverride,
} from '../../../libs/override-utils';
import { RuleCostLineOverride } from '../../../types/scenarioRule';
import { CostItemsHeader } from './CostItemsHeader';
import { CostLineOverrideRow } from './CostLineOverrideRow';
import { InterventionOverrideSummary } from './InterventionOverrideSummary';
import {
    getOverridesCompactWidth,
    getOverridesGridColumns,
    getOverridesGridMinWidth,
    getUnitCostColumnOffset,
    OVERRIDES_SCROLLED_ATTRIBUTE,
} from './overridesGrid';
import { useRuleInterventionOverride } from './useRuleInterventionOverride';
import { YearlyDeploymentRow } from './YearlyDeploymentRow';

const FOCUS_GLOW_MS = 2400;

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
    body: { overflowX: 'auto' },
    bodyEnd: { height: 6 },
    emptyCostItems: {
        px: 2,
        py: 1.5,
        borderTop: 1,
        borderColor: 'divider',
        color: 'text.secondary',
    },
} satisfies SxStyles;

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
    const [isScrolled, setIsScrolled] = useState(false);
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

    const cardWidth = cardSize?.width ?? Infinity;
    const isCompact = cardWidth < getOverridesCompactWidth(years.length);
    const unitCostColumnOffset = Number.isFinite(cardWidth)
        ? getUnitCostColumnOffset(cardWidth, years.length, isCompact)
        : 0;
    const gridSx = useMemo(
        () => ({
            gridTemplateColumns: getOverridesGridColumns(
                years.length,
                isCompact,
            ),
        }),
        [isCompact, years.length],
    );
    const gridWidthSx = useMemo(
        () => ({ minWidth: getOverridesGridMinWidth(years.length, isCompact) }),
        [isCompact, years.length],
    );
    const scrollMarginSx = useMemo(
        () => ({ scrollMarginTop: `${scrollMarginTop}px` }),
        [scrollMarginTop],
    );

    const handleToggleOpen = useCallback(() => setIsOpen(open => !open), []);
    const handleBodyScroll = useCallback(
        (event: UIEvent<HTMLDivElement>) =>
            setIsScrolled(event.currentTarget.scrollLeft > 0),
        [],
    );
    const handleSelect = useCallback(
        () => onSelect(interventionId),
        [interventionId, onSelect],
    );
    const handleCostLineChange = useCallback(
        (next: RuleCostLineOverride) =>
            updateOverride(replaceCostLineOverride(override, next)),
        [override, updateOverride],
    );

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
            <InterventionOverrideSummary
                interventionName={interventionName}
                categoryName={categoryName}
                defaultGrantId={defaultGrantId}
                grants={grants}
                override={override}
                unitCostColumnOffset={unitCostColumnOffset}
                isOpen={isOpen}
                onToggleOpen={handleToggleOpen}
                onChange={updateOverride}
            />
            {isOpen && (
                <Box
                    sx={styles.body}
                    onScroll={handleBodyScroll}
                    {...{ [OVERRIDES_SCROLLED_ATTRIBUTE]: isScrolled }}
                >
                    <Box sx={gridWidthSx}>
                        <YearlyDeploymentRow
                            override={override}
                            years={years}
                            deployedYears={deployedYears}
                            gridSx={gridSx}
                            onChange={updateOverride}
                        />
                        {costLines.length > 0 ? (
                            <>
                                <CostItemsHeader
                                    years={years}
                                    gridSx={gridSx}
                                />
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
