import React, {
    CSSProperties,
    forwardRef,
    ReactNode,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTheme } from '@mui/material';
import { createPortal } from 'react-dom';
import {
    computePlacement,
    DEFAULT_SIDE,
    GetCoverage,
    isSameSide,
    Point,
    Side,
    Size,
} from './computePlacement';

const FADE_MS = 120;

const layerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    transition: `opacity ${FADE_MS}ms ease`,
    willChange: 'transform',
};

export type FloatingLayerHandle = {
    /** Viewport coordinates to place the layer next to; null hides it. */
    setAnchor: (anchor: Point | null) => void;
    /** Like `setAnchor`, but chooses the side afresh instead of keeping the current one. */
    placeAt: (anchor: Point) => void;
};

type Props = {
    /** How much of what matters (e.g. map shapes) a viewport rect would hide. */
    getCoverage: GetCoverage;
    /** The largest size the layer can grow to from its current content. */
    getPlannedSize: (layer: HTMLElement) => Size;
    /** Keeps the layer on its side and lets it receive pointer events. */
    isPinned?: boolean;
    children: (side: Side) => ReactNode;
};

const NO_COVERAGE: GetCoverage = () => 0;

const getViewport = (): Size => ({
    width: window.innerWidth,
    height: window.innerHeight,
});

export const FloatingLayer = forwardRef<FloatingLayerHandle, Props>(
    ({ getCoverage, getPlannedSize, isPinned = false, children }, ref) => {
        const theme = useTheme();
        const layerRef = useRef<HTMLDivElement>(null);
        const anchorRef = useRef<Point | null>(null);
        const sizeRef = useRef<Size>({ width: 0, height: 0 });
        const sideRef = useRef<Side>();
        const sideSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
        const isSwitchingSideRef = useRef(false);
        const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
        const frameRef = useRef<number>();
        const positionRef = useRef<() => void>(() => undefined);
        const [side, setSide] = useState<Side>(DEFAULT_SIDE);
        const [isShown, setIsShown] = useState(false);
        const [isSwitchingSide, setIsSwitchingSide] = useState(false);

        const applySide = useCallback((next: Side) => {
            sideRef.current = next;
            setSide(current => (isSameSide(current, next) ? current : next));
        }, []);

        const endSideSwitch = useCallback(() => {
            clearTimeout(sideSwitchTimeoutRef.current);
            isSwitchingSideRef.current = false;
            setIsSwitchingSide(false);
        }, []);

        const switchToSide = useCallback(
            (target: Side | undefined) => {
                if (!target || isSwitchingSideRef.current) return;
                isSwitchingSideRef.current = true;
                setIsSwitchingSide(true);
                sideSwitchTimeoutRef.current = setTimeout(() => {
                    applySide(target);
                    positionRef.current();
                    endSideSwitch();
                }, FADE_MS);
            },
            [applySide, endSideSwitch],
        );

        const position = useCallback(() => {
            const layer = layerRef.current;
            const anchor = anchorRef.current;
            if (!layer || !anchor) return;
            const placement = computePlacement({
                anchor,
                size: sizeRef.current,
                plannedSize: getPlannedSize(layer),
                viewport: getViewport(),
                getCoverage:
                    isPinned && sideRef.current ? NO_COVERAGE : getCoverage,
                currentSide: sideRef.current,
            });
            applySide(placement.side);
            layer.style.transform = `translate(${placement.position.x}px, ${placement.position.y}px)`;
            switchToSide(placement.preferredSide);
        }, [applySide, getCoverage, getPlannedSize, isPinned, switchToSide]);
        positionRef.current = position;

        const setAnchor = useCallback(
            (anchor: Point | null) => {
                clearTimeout(hideTimeoutRef.current);
                if (anchor) {
                    anchorRef.current = anchor;
                    setIsShown(true);
                    if (frameRef.current === undefined) {
                        frameRef.current = requestAnimationFrame(() => {
                            frameRef.current = undefined;
                            positionRef.current();
                        });
                    }
                    return;
                }
                setIsShown(false);
                endSideSwitch();
                hideTimeoutRef.current = setTimeout(() => {
                    sideRef.current = undefined;
                }, FADE_MS);
            },
            [endSideSwitch],
        );

        const placeAt = useCallback(
            (anchor: Point) => {
                sideRef.current = undefined;
                setAnchor(anchor);
            },
            [setAnchor],
        );

        useImperativeHandle(ref, () => ({ setAnchor, placeAt }), [
            setAnchor,
            placeAt,
        ]);

        useLayoutEffect(() => {
            const layer = layerRef.current;
            if (!layer) return undefined;
            const observer = new ResizeObserver(() => {
                sizeRef.current = {
                    width: layer.offsetWidth,
                    height: layer.offsetHeight,
                };
                position();
            });
            observer.observe(layer);
            return () => observer.disconnect();
        }, [position]);

        useEffect(
            () => () => {
                clearTimeout(sideSwitchTimeoutRef.current);
                clearTimeout(hideTimeoutRef.current);
                if (frameRef.current !== undefined) {
                    cancelAnimationFrame(frameRef.current);
                }
            },
            [],
        );

        const content = useMemo(() => children(side), [children, side]);

        return createPortal(
            <div
                ref={layerRef}
                style={{
                    ...layerStyle,
                    zIndex: theme.zIndex.tooltip,
                    opacity: isShown && !isSwitchingSide ? 1 : 0,
                    pointerEvents: isPinned ? 'auto' : 'none',
                }}
            >
                {content}
            </div>,
            document.body,
        );
    },
);

FloatingLayer.displayName = 'FloatingLayer';
