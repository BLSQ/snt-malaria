import React, { ComponentType, FC, ReactNode } from 'react';
import { Card, Divider, SvgIconProps } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { SidebarColumn } from '../styledComponents';
import { useSidePanelContext } from './SidePanelContext';
import { SidePanelIconToggle } from './SidePanelIconToggle';

const styles = {
    collapsedCard: {
        flexShrink: 0,
        width: 65,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 1.5,
        pt: 2,
    },
    divider: {
        width: '60%',
    },
} satisfies SxStyles;

type Props = {
    icon: ComponentType<SvgIconProps>;
    actions?: ReactNode;
    children: ReactNode;
};

export const SidePanel: FC<Props> = ({ icon, actions, children }) => {
    const { isOpen } = useSidePanelContext();

    if (!isOpen) {
        return (
            <Card sx={styles.collapsedCard}>
                <SidePanelIconToggle icon={icon} />
                {actions && (
                    <>
                        <Divider sx={styles.divider} />
                        {actions}
                    </>
                )}
            </Card>
        );
    }

    return <SidebarColumn>{children}</SidebarColumn>;
};
