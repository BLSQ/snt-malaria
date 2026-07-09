// Minimal ambient declarations for `flume` (the package ships no TypeScript types).
// Richer graph types (as consumed by the backend) live in `types/flumeGraph.ts`.
declare module 'flume' {
    import { ComponentType } from 'react';

    export type FlumeNodes = Record<string, any>;

    export type FlumeComment = {
        id: string;
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        color: string;
        isNew?: boolean;
    };

    export type FlumeCommentMap = Record<string, FlumeComment>;

    export const Colors: Record<string, string>;

    export const Controls: {
        text: (config: Record<string, any>) => any;
        select: (config: Record<string, any>) => any;
        number: (config: Record<string, any>) => any;
        checkbox: (config: Record<string, any>) => any;
        multiselect: (config: Record<string, any>) => any;
        custom: (config: Record<string, any>) => any;
    };

    export class FlumeConfig {
        portTypes: Record<string, any>;
        nodeTypes: Record<string, any>;
        addPortType(config: Record<string, any>): FlumeConfig;
        addNodeType(config: Record<string, any>): FlumeConfig;
        addRootNodeType(config: Record<string, any>): FlumeConfig;
    }

    export const NodeEditor: ComponentType<Record<string, any>>;

    export class RootEngine {
        constructor(...args: any[]);
        resolveRootNode(nodes: FlumeNodes, options?: Record<string, any>): any;
    }

    export function useRootEngine(...args: any[]): any;
}
