import React, {
    FC,
    ReactNode,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import MenuBookIcon from '@mui/icons-material/MenuBook';
import { Box, Button, Paper, Popper, Typography } from '@mui/material';
import { PopperProps } from '@mui/material/Popper';
import { Instance as PopperInstance } from '@popperjs/core';

import { SxStyles } from 'Iaso/types/general';

/**
 * Reusable onboarding spotlight (tour UI). Usually wired through the
 * `useOnboarding` hook, which handles steps, persistence, and behavior.
 *
 * The spotlight is a circle by default (good for icon buttons / dots); pass
 * `shape="rect"` for wider targets like regular buttons. It is painted with
 * a huge `box-shadow` spread to dim the rest of the page without a separate
 * Backdrop.
 *
 * Pass `documentation` to show a book-icon link (new tab) in the footer row,
 * left-aligned alongside Skip / primary actions.
 *
 * - `'circle'` shape: square cutout with a 50% radius that fully encloses
 *   the element. Best for icon buttons and dots.
 * - `'rect'` shape: rounded-rectangle cutout matching the element's bounding
 *   box. Best for wider targets such as regular buttons.
 */

/** Cutout around the anchor (circle vs rounded rectangle). */
export type SpotlightShape = 'circle' | 'rect';

/** Button label and handler for tour actions (Next, Skip, Got it, …). */
export type SpotlightAction = { label: string; onClick: () => void };

/** Optional documentation link shown in the tour card footer (new tab). */
export type SpotlightDocumentation = {
    label: string;
    href: string;
};

/** Props for {@link OnboardingSpotlight}. */
export type OnboardingSpotlightProps = {
    anchorEl: HTMLElement | null;
    title: string;
    description: ReactNode;
    primaryAction: SpotlightAction;
    /** Flat button on the left of the primary one (e.g. "Skip"). */
    secondaryAction?: SpotlightAction;
    /** Optional docs link in the footer row, left of Skip / primary. */
    documentation?: SpotlightDocumentation;
    /**
     * Escape handler. Defaults to `primaryAction.onClick`. In a multi-step
     * tour pass the "skip whole tour" handler so Escape doesn't just advance.
     */
    onEscape?: () => void;
    /**
     * Preferred side for the bubble. Defaults to `'bottom-start'`. The `flip`
     * modifier picks a fallback only when the preferred side overflows.
     */
    placement?: PopperProps['placement'];
    /** Spotlight shape. Defaults to `'circle'`. */
    shape?: SpotlightShape;
};

const SPOTLIGHT_PADDING = 8;
const RECT_BORDER_RADIUS = 8;

const styles = {
    spotlight: {
        position: 'fixed',
        zIndex: theme => theme.zIndex.modal,
        pointerEvents: 'none',
        boxShadow: '0 0 0 4000px rgba(0,0,0,0.55)',
        outline: '2px solid',
        outlineColor: 'primary.main',
    },
    popper: { zIndex: theme => theme.zIndex.modal + 1 },
    card: { maxWidth: 360, p: 2, m: 1.5, borderRadius: 2 },
    title: { mb: 1 },
    description: { color: 'text.secondary' },
    footer: {
        mt: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        flexWrap: 'wrap',
    },
    footerActions: { display: 'flex', gap: 1, flexShrink: 0 },
} satisfies SxStyles;

type SpotlightRect = {
    top: number;
    left: number;
    width: number;
    height: number;
    borderRadius: string;
};

const measureSpotlight = (
    el: HTMLElement,
    shape: SpotlightShape,
): SpotlightRect => {
    const r = el.getBoundingClientRect();

    if (shape === 'circle') {
        // Smallest circle that fully encloses the anchor's bounding box.
        const size = Math.max(r.width, r.height) + SPOTLIGHT_PADDING * 2;
        return {
            top: r.top + r.height / 2 - size / 2,
            left: r.left + r.width / 2 - size / 2,
            width: size,
            height: size,
            borderRadius: '50%',
        };
    }

    return {
        top: r.top - SPOTLIGHT_PADDING,
        left: r.left - SPOTLIGHT_PADDING,
        width: r.width + SPOTLIGHT_PADDING * 2,
        height: r.height + SPOTLIGHT_PADDING * 2,
        borderRadius: `${RECT_BORDER_RADIUS}px`,
    };
};

export const OnboardingSpotlight: FC<OnboardingSpotlightProps> = ({
    anchorEl,
    title,
    description,
    primaryAction,
    secondaryAction,
    documentation,
    onEscape,
    placement = 'bottom-start',
    shape = 'circle',
}) => {
    const [rect, setRect] = useState<SpotlightRect | null>(null);
    // Pass the spotlight DOM node itself to Popper as the anchor so that
    // `flip` / `preventOverflow` measure against the visible shape rather
    // than the (possibly smaller) highlighted element.
    const [spotlightEl, setSpotlightEl] = useState<HTMLDivElement | null>(null);

    // Popper auto-updates on scroll/resize but not on state-driven position
    // changes; nudge it whenever our measured rect shifts.
    const popperRef = useRef<PopperInstance | null>(null);
    useEffect(() => {
        popperRef.current?.update();
    }, [rect]);

    // Recompute the spotlight on layout shifts. `capture: true` on scroll
    // picks up nested scroll containers too.
    useLayoutEffect(() => {
        if (!anchorEl) {
            setRect(null);
            return undefined;
        }
        const update = () => setRect(measureSpotlight(anchorEl, shape));
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        const ro = new ResizeObserver(update);
        ro.observe(anchorEl);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
            ro.disconnect();
        };
    }, [anchorEl, shape]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') (onEscape ?? primaryAction.onClick)();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [primaryAction, onEscape]);

    if (!anchorEl || !rect) return null;

    return (
        <>
            <Box
                ref={setSpotlightEl}
                sx={{
                    ...styles.spotlight,
                    top: `${rect.top}px`,
                    left: `${rect.left}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                    borderRadius: rect.borderRadius,
                }}
            />
            <Popper
                open={Boolean(spotlightEl)}
                anchorEl={spotlightEl}
                popperRef={popperRef}
                placement={placement}
                sx={styles.popper}
                modifiers={[
                    { name: 'offset', options: { offset: [0, 12] } },
                    { name: 'preventOverflow', options: { padding: 16 } },
                    {
                        name: 'flip',
                        options: {
                            fallbackPlacements: [
                                'top-start',
                                'right-start',
                                'left-start',
                            ],
                        },
                    },
                ]}
            >
                <Paper
                    sx={styles.card}
                    elevation={6}
                    // Don't let card clicks bubble out as "page" clicks to
                    // prevent the page click advance handler from being triggered.
                    onClick={e => e.stopPropagation()}
                >
                    <Typography variant="h6" sx={styles.title}>
                        {title}
                    </Typography>
                    <Typography variant="body2" sx={styles.description}>
                        {description}
                    </Typography>

                    {/* Footer row with Skip / primary actions and optional documentation link. */}
                    <Box
                        sx={{
                            ...styles.footer,
                            justifyContent: documentation
                                ? 'space-between'
                                : 'flex-end',
                        }}
                    >
                        {documentation ? (
                            <Button
                                size="small"
                                variant="text"
                                color="primary"
                                href={documentation.href}
                                component="a"
                                target="_blank"
                                rel="noopener noreferrer"
                                startIcon={<MenuBookIcon />}
                            >
                                {documentation.label}
                            </Button>
                        ) : null}
                        <Box sx={styles.footerActions}>
                            {secondaryAction && (
                                <Button
                                    size="small"
                                    onClick={secondaryAction.onClick}
                                >
                                    {secondaryAction.label}
                                </Button>
                            )}
                            <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={primaryAction.onClick}
                            >
                                {primaryAction.label}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Popper>
        </>
    );
};
