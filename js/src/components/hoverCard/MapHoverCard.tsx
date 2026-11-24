import React, {
    forwardRef,
    ReactNode,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { Box, Fade, Popper, useTheme } from '@mui/material';
import { Instance } from '@popperjs/core';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import {
    getQuadrantPlacement,
    Point,
    QuadrantPlacement,
} from './getQuadrantPlacement';
import { HoverCard } from './HoverCard';

const POINTER_OFFSET_PX = 16;
const FADE_MS = 120;
const HIDE_DELAY_MS = 50;

const styles = {
    card: {
        transition: `opacity ${FADE_MS}ms`,
    },
    switchingSideCard: {
        opacity: 0,
    },
} satisfies SxStyles;

export type MapHover = { orgUnit: OrgUnit; point: Point };

export type MapHoverCardHandle = {
    update: (hover: MapHover | null) => void;
};

type Props = {
    getContent: (orgUnit: OrgUnit) => ReactNode;
    getHeaderExtra?: (orgUnit: OrgUnit) => ReactNode;
    getCountryRect: () => DOMRect | undefined;
};

const offsetFromPointer = ({ placement }: { placement: string }) => [
    placement.endsWith('end') ? -POINTER_OFFSET_PX : POINTER_OFFSET_PX,
    POINTER_OFFSET_PX,
];

export const MapHoverCard = forwardRef<MapHoverCardHandle, Props>(
    ({ getContent, getHeaderExtra, getCountryRect }, ref) => {
        const theme = useTheme();
        const popperRef = useRef<Instance>(null);
        const pointerRef = useRef<Point>({ x: 0, y: 0 });
        const placementRef = useRef<QuadrantPlacement>('bottom-start');
        const isOpenRef = useRef(false);
        const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
        const switchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
        const [anchor] = useState(() => ({
            getBoundingClientRect: () =>
                new DOMRect(pointerRef.current.x, pointerRef.current.y, 0, 0),
        }));
        const [orgUnit, setOrgUnit] = useState<OrgUnit>();
        const [isOpen, setIsOpen] = useState(false);
        const [placement, setPlacement] =
            useState<QuadrantPlacement>('bottom-start');
        const [isSwitchingSide, setIsSwitchingSide] = useState(false);

        const setOpen = useCallback((open: boolean) => {
            isOpenRef.current = open;
            setIsOpen(open);
        }, []);

        const switchSide = useCallback((next: QuadrantPlacement) => {
            placementRef.current = next;
            clearTimeout(switchTimeoutRef.current);
            if (!isOpenRef.current) {
                setPlacement(next);
                return;
            }
            setIsSwitchingSide(true);
            switchTimeoutRef.current = setTimeout(() => {
                setPlacement(next);
                setIsSwitchingSide(false);
            }, FADE_MS);
        }, []);

        const update = useCallback(
            (hover: MapHover | null) => {
                clearTimeout(hideTimeoutRef.current);
                if (!hover) {
                    hideTimeoutRef.current = setTimeout(
                        () => setOpen(false),
                        HIDE_DELAY_MS,
                    );
                    return;
                }
                pointerRef.current = hover.point;
                const countryRect = getCountryRect();
                const next =
                    countryRect &&
                    getQuadrantPlacement(
                        hover.point,
                        countryRect,
                        placementRef.current,
                    );
                if (next && next !== placementRef.current) {
                    switchSide(next);
                }
                setOrgUnit(hover.orgUnit);
                setOpen(true);
                popperRef.current?.update();
            },
            [getCountryRect, switchSide, setOpen],
        );

        useImperativeHandle(ref, () => ({ update }), [update]);

        useEffect(
            () => () => {
                clearTimeout(hideTimeoutRef.current);
                clearTimeout(switchTimeoutRef.current);
            },
            [],
        );

        return (
            <Popper
                open={isOpen && Boolean(orgUnit)}
                anchorEl={anchor}
                placement={placement}
                popperRef={popperRef}
                modifiers={[
                    { name: 'offset', options: { offset: offsetFromPointer } },
                ]}
                transition
                style={{ zIndex: theme.zIndex.tooltip, pointerEvents: 'none' }}
            >
                {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={FADE_MS}>
                        <Box>
                            <Box
                                sx={[
                                    styles.card,
                                    isSwitchingSide && styles.switchingSideCard,
                                ]}
                            >
                                {orgUnit && (
                                    <HoverCard
                                        title={
                                            orgUnit.short_name ?? orgUnit.name
                                        }
                                        subtitle={orgUnit.parent_name}
                                        headerExtra={getHeaderExtra?.(orgUnit)}
                                    >
                                        {getContent(orgUnit)}
                                    </HoverCard>
                                )}
                            </Box>
                        </Box>
                    </Fade>
                )}
            </Popper>
        );
    },
);

MapHoverCard.displayName = 'MapHoverCard';
