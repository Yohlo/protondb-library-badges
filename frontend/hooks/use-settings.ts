import React from 'react';
import { Settings, getSettings, subscribeSettings } from '../stores/settings';

export const useSettings = (): Settings => React.useSyncExternalStore(subscribeSettings, getSettings);
