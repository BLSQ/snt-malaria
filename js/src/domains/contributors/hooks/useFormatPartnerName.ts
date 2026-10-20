import { useCallback } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { PartnerName } from '../../../constants/contributors';

export const useFormatPartnerName = (): ((name: PartnerName) => string) => {
    const { formatMessage } = useSafeIntl();
    return useCallback(
        (name: PartnerName) =>
            typeof name === 'string' ? name : formatMessage(name),
        [formatMessage],
    );
};
