import {
    RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

const PIN_BEFORE_CONTENT_HIDDEN_PX = 1;
const CONTENT_END_TOLERANCE_PX = 1;

const observeBelowView = (
    target: Element,
    root: Element,
    bottomMarginPx: number,
    onChange: (isBelowView: boolean) => void,
): (() => void) => {
    const observer = new IntersectionObserver(
        ([entry]) =>
            onChange(
                entry.boundingClientRect.top >
                    (entry.rootBounds?.bottom ?? Infinity),
            ),
        { root, rootMargin: `0px 0px ${bottomMarginPx}px 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
};

type StickyBottomTitle = {
    titleRef: RefObject<HTMLElement>;
    /** Place directly after the title, in flow. */
    titleEndRef: RefObject<HTMLDivElement>;
    /** Place directly after the content the title introduces, in flow. */
    contentEndRef: RefObject<HTMLDivElement>;
    /** Bottom-anchored element whose height follows the title's top edge while pinned. */
    backdropRef: RefObject<HTMLDivElement>;
    isTitlePinned: boolean;
    isContentCut: boolean;
    scrollToTitle: () => void;
};

export const useStickyBottomTitle = (
    scrollContainer: HTMLElement | null,
    enabled: boolean,
): StickyBottomTitle => {
    const titleRef = useRef<HTMLElement>(null);
    const titleEndRef = useRef<HTMLDivElement>(null);
    const contentEndRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const [isTitlePinned, setIsTitlePinned] = useState(false);
    const [isContentCut, setIsContentCut] = useState(false);

    useEffect(() => {
        const titleEnd = titleEndRef.current;
        const contentEnd = contentEndRef.current;
        if (!enabled || !scrollContainer || !titleEnd || !contentEnd) {
            return undefined;
        }
        const stopObservingTitle = observeBelowView(
            titleEnd,
            scrollContainer,
            -PIN_BEFORE_CONTENT_HIDDEN_PX,
            setIsTitlePinned,
        );
        const stopObservingContent = observeBelowView(
            contentEnd,
            scrollContainer,
            CONTENT_END_TOLERANCE_PX,
            setIsContentCut,
        );
        return () => {
            stopObservingTitle();
            stopObservingContent();
        };
    }, [enabled, scrollContainer]);

    const isPinned = enabled && isTitlePinned;

    useLayoutEffect(() => {
        const title = titleRef.current;
        const backdrop = backdropRef.current;
        if (!isPinned || !scrollContainer || !title || !backdrop) {
            return undefined;
        }
        const syncBackdropToTitle = () => {
            const height =
                backdrop.getBoundingClientRect().bottom -
                title.getBoundingClientRect().top;
            backdrop.style.height = `${height}px`;
        };
        syncBackdropToTitle();
        scrollContainer.addEventListener('scroll', syncBackdropToTitle, {
            passive: true,
        });
        window.addEventListener('resize', syncBackdropToTitle);
        return () => {
            scrollContainer.removeEventListener('scroll', syncBackdropToTitle);
            window.removeEventListener('resize', syncBackdropToTitle);
        };
    }, [isPinned, scrollContainer]);

    const scrollToTitle = useCallback(() => {
        const title = titleRef.current;
        const titleEnd = titleEndRef.current;
        if (!scrollContainer || !title || !titleEnd) return;
        const titleEndOffset =
            titleEnd.getBoundingClientRect().top -
            scrollContainer.getBoundingClientRect().top +
            scrollContainer.scrollTop;
        scrollContainer.scrollTo({
            top: titleEndOffset - title.offsetHeight,
            behavior: 'smooth',
        });
    }, [scrollContainer]);

    return {
        titleRef,
        titleEndRef,
        contentEndRef,
        backdropRef,
        isTitlePinned: isPinned,
        isContentCut: enabled && isContentCut,
        scrollToTitle,
    };
};
