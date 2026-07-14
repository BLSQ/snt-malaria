import { alpha, Theme } from '@mui/material';

/**
 * Flume comments only allow one of eight fixed colour slots. We remap those slots onto our
 * theme/brand colours instead of Flume's defaults. Comments are large translucent regions, so the
 * body uses a light tint (dark text stays readable) with a stronger, saturated border, while the
 * colour-picker swatch shows the solid colour.
 */
const commentPalette = (theme: Theme): Record<string, string> => ({
    purple: theme.palette.primary.main,
    blue: '#3D74FF',
    pink: '#E5399A',
    yellow: '#FFC107',
    orange: theme.palette.warning.main,
    red: theme.palette.error.main,
    green: theme.palette.success.main,
    grey: theme.palette.grey[500],
});

const commentColorStyles = (theme: Theme) =>
    Object.fromEntries(
        Object.entries(commentPalette(theme)).map(([name, color]) => [
            `& [data-flume-component="comment"][data-color="${name}"]`,
            {
                background: alpha(color, 0.22),
                borderColor: alpha(color, 0.6),
            },
        ]),
    );

/**
 * Flume ships a dark default theme. These overrides target Flume's stable
 * `data-flume-component` attributes (rather than its content-hashed CSS-module classes) so the
 * node editor matches the MUI theme. Spread `flumeThemeSx` onto the `sx` of the element wrapping
 * the `<NodeEditor>`.
 *
 * Note: the "Add node" context menu is rendered in a portal on `document.body`, so it lives
 * outside this scoped wrapper and is themed separately via `<GlobalStyles>` in `index.tsx`.
 */
export const flumeThemeSx = (theme: Theme) => ({
    // Canvas background + subtle dotted grid.
    '& [data-flume-component="stage"]': {
        backgroundColor: theme.palette.background.default,
        backgroundImage: `radial-gradient(${theme.palette.divider} 1px, transparent 1px)`,
        backgroundSize: '22px 22px',
    },
    // Node card. No `overflow: hidden` here: the connector dots intentionally overflow the edges.
    '& [data-flume-component="node"]': {
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        boxShadow: theme.shadows[3],
        fontFamily: theme.typography.fontFamily,
    },
    // Node title bar. Round only the top corners so it sits flush inside the rounded card.
    '& [data-flume-component="node-header"]': {
        margin: 0,
        marginBottom: theme.spacing(0.5),
        padding: theme.spacing(0.75, 1.25),
        color: theme.palette.primary.contrastText,
        backgroundColor: theme.palette.primary.main,
        borderRadius: '7px 7px 0 0',
        borderBottom: 'none',
        fontWeight: 600,
        fontSize: 13,
        textTransform: 'none',
    },
    // Port + control labels.
    '& [data-flume-component="port-label"], & [data-flume-component="control-label"]':
        {
            color: theme.palette.text.secondary,
            fontSize: 12,
            fontWeight: 400,
        },
    // A connectable input port with no controls of its own (e.g. the output node's "Composite
    // layer" input) still renders an empty, full-width controls container while it's disconnected —
    // Flume only drops it once `isConnected` is true. That empty div shares the port's flex row and
    // steals the horizontal space, forcing the label to wrap until something connects. Collapse any
    // empty controls container so the label keeps the full width in both states.
    '& [class*="IoPorts_controls__"]:empty': {
        display: 'none',
    },
    // Control wrapper. Flume ships an asymmetric `padding-right: 3px` with no left padding, which
    // leaves inputs cramped and off-centre. Give them consistent, slightly roomier side padding.
    '& [data-flume-component="control"]': {
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        paddingTop: theme.spacing(0.5),
        paddingBottom: theme.spacing(0.75),
    },
    // Connector dots. The extra `[data-port-color]` bumps specificity above Flume's own colour
    // rules so every port uses a theme colour (flat, no gradient). Ports are grey while empty and
    // turn primary once connected — the `data-connected` flag is maintained from the graph in
    // `index.tsx` (Flume doesn't reflect connection state onto the port DOM itself).
    '& [data-flume-component="port-handle"][data-port-color]': {
        background: theme.palette.grey[400],
        boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    },
    '& [data-flume-component="port-handle"][data-port-color][data-connected="true"]':
        {
            background: theme.palette.primary.main,
        },
    // Text inputs (formula, name).
    '& [data-flume-component="text-input"] input, & [data-flume-component="text-input"] textarea':
        {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            padding: theme.spacing(0.5, 1),
            fontFamily: theme.typography.fontFamily,
            fontSize: 13,
            '&:focus': {
                borderColor: theme.palette.primary.main,
                outline: 'none',
            },
        },
    // Select control (data layer picker), selected state.
    '& [data-flume-component="select"]': {
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '6px',
        padding: theme.spacing(0.5, 1),
        '&::after': { borderTopColor: theme.palette.text.secondary },
    },
    // Select control, placeholder state. Flume renders this as a plain div with no stable
    // `data-flume-component` attribute, so match its (stable) CSS-module class prefix and give it
    // the same white styling instead of the default dark-grey gradient.
    '& [class*="Select_wrapper__"]': {
        background: theme.palette.background.paper,
        color: theme.palette.text.secondary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '6px',
        '&:hover': { background: theme.palette.action.hover },
        '&::after': { borderTopColor: theme.palette.text.secondary },
    },
    '& [data-flume-component="select-label"]': {
        color: theme.palette.text.primary,
        fontSize: 13,
    },
    '& [data-flume-component="select-desc"]': {
        color: theme.palette.text.secondary,
        fontSize: 12,
    },
    // Keep comment text readable on the light tinted backgrounds (Flume's default is light).
    '& [data-flume-component="comment"]': {
        color: theme.palette.text.primary,
        fontFamily: theme.typography.fontFamily,
    },
    '& [data-flume-component="comment"] textarea': {
        color: theme.palette.text.primary,
        fontFamily: theme.typography.fontFamily,
    },
    // Remap Flume's fixed colour slots onto our palette.
    ...commentColorStyles(theme),
});

/**
 * Styles for the "Add node" / node-options context menu, which Flume portals onto `document.body`.
 * Applied globally (scoped to Flume's `ctx-menu` data attributes) so it can't reach other UI.
 */
export const flumeContextMenuStyles = (theme: Theme) => ({
    '[data-flume-component="ctx-menu"]': {
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        boxShadow: theme.shadows[6],
        fontFamily: theme.typography.fontFamily,
        overflow: 'hidden',
    },
    '[data-flume-component="ctx-menu-header"]': {
        borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '[data-flume-component="ctx-menu-title"]': {
        color: theme.palette.text.secondary,
    },
    '[data-flume-component="ctx-menu-input"]': {
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '6px',
    },
    '[data-flume-component="ctx-menu-option"]': {
        color: theme.palette.text.primary,
        '&:hover, &[data-selected="true"]': {
            backgroundColor: theme.palette.action.hover,
        },
    },
    '[data-flume-component="ctx-menu-empty"]': {
        color: theme.palette.text.secondary,
    },
    // Comment colour picker (also portaled). The extra `color-picker` ancestor bumps specificity
    // above Flume's own swatch colours. Solid swatches to match the remapped comment palette.
    ...Object.fromEntries(
        Object.entries(commentPalette(theme)).map(([name, color]) => [
            `[data-flume-component="color-picker"] [data-flume-component="color-button"][data-color="${name}"]`,
            { background: color },
        ]),
    ),
});
