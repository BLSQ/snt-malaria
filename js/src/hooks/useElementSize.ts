import { useEffect, useState } from 'react';

type ElementSize = {
    width: number;
    height: number;
};

/** Tracks an element's rendered size; pass `ref` as the element's callback ref. */
export const useElementSize = <T extends HTMLElement>() => {
    const [element, setElement] = useState<T | null>(null);
    const [size, setSize] = useState<ElementSize | undefined>();

    useEffect(() => {
        if (!element) return undefined;
        const observer = new ResizeObserver(() =>
            setSize({
                width: element.clientWidth,
                height: element.offsetHeight,
            }),
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [element]);

    return { ref: setElement, element, size };
};
