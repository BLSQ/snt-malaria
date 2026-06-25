import React, { FC, ReactNode, useMemo, useState } from 'react';
import {
    SettingsInputCompositeOutlined,
    SettingsOutlined,
    TollOutlined,
} from '@mui/icons-material';
import {
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stack,
    Theme,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { CardStyled } from '../../../components/CardStyled';
import { IconBoxed } from '../../../components/IconBoxed';
import {
    CardScrollable,
    MainColumn,
    SidebarColumn,
    SidebarLayout,
} from '../../../components/styledComponents';
import { MESSAGES } from '../../messages';
import { AccountSettingsTab } from '../accountSettings';
import { BudgetSettingsTab } from '../budget';

const styles = {
    listItem: {
        cursor: 'pointer',
        borderRadius: 2,
        padding: (theme: Theme) => theme.spacing(0, 1),
    },
    activeListItem: {
        cursor: 'pointer',
        backgroundColor: (theme: Theme) => theme.palette.primary.light,
        borderRadius: 2,
        padding: (theme: Theme) => theme.spacing(0, 1),
    },
    listItemIcon: {
        minWidth: 36,
    },
};

type GeneralSection = {
    key: string;
    label: string;
    icon: React.ElementType;
    content: ReactNode;
};

export const GeneralSettings: FC = () => {
    const { formatMessage } = useSafeIntl();

    // Sub-entries of the "General" tab. Add more here as other singleton
    // settings move under General; the sidebar acts as their navigation menu.
    const sections: GeneralSection[] = useMemo(
        () => [
            {
                key: 'account',
                label: formatMessage(MESSAGES.accountSettingsTitle),
                icon: SettingsInputCompositeOutlined,
                content: <AccountSettingsTab />,
            },
            {
                key: 'budget',
                label: formatMessage(MESSAGES.budgetSettingsTitle),
                icon: TollOutlined,
                content: <BudgetSettingsTab />,
            },
        ],
        [formatMessage],
    );

    const [activeKey, setActiveKey] = useState(sections[0].key);
    const activeSection =
        sections.find(section => section.key === activeKey) ?? sections[0];

    return (
        <SidebarLayout>
            <SidebarColumn>
                <CardScrollable>
                    <CardStyled
                        header={
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                            >
                                <IconBoxed Icon={SettingsOutlined} />
                                <Typography
                                    variant="h6"
                                    sx={{ flexGrow: 1, mb: 0 }}
                                >
                                    {formatMessage(MESSAGES.generalTitle)}
                                </Typography>
                            </Stack>
                        }
                    >
                        <List>
                            {sections.map(section => {
                                const Icon = section.icon;
                                return (
                                    <ListItem
                                        key={section.key}
                                        onClick={() =>
                                            setActiveKey(section.key)
                                        }
                                        sx={
                                            section.key === activeKey
                                                ? styles.activeListItem
                                                : styles.listItem
                                        }
                                    >
                                        <ListItemIcon sx={styles.listItemIcon}>
                                            <Icon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText primary={section.label} />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </CardStyled>
                </CardScrollable>
            </SidebarColumn>
            <MainColumn>{activeSection.content}</MainColumn>
        </SidebarLayout>
    );
};
