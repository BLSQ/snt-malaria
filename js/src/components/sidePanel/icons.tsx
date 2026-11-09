import React from 'react';
import { createSvgIcon } from '@mui/material';

const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
} as const;

export const ShowSidePanelIcon = createSvgIcon(
    <>
        <rect x="3" y="4" width="18" height="16" rx="2" {...strokeProps} />
        <path d="M9 4v16M13 10l2 2-2 2" {...strokeProps} />
    </>,
    'ShowSidePanel',
);

export const UndockSidePanelIcon = createSvgIcon(
    <>
        <rect x="3" y="4" width="18" height="16" rx="2" {...strokeProps} />
        <path d="M9 4v16M16 10l-2 2 2 2" {...strokeProps} />
    </>,
    'UndockSidePanel',
);

export const DockSidePanelIcon = createSvgIcon(
    <path d="M9 3h6M10 3v6l-3 4h10l-3-4V3M12 13v8" {...strokeProps} />,
    'DockSidePanel',
);
