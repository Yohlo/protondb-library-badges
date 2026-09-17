import React from 'react';
import { DialogButton, Field, IconsModule, ToggleField } from '@steambrew/client';
import { useSettings } from '../../../hooks/use-settings';
import { libraryApps } from '../../../lib/steam';
import { clearRatingCache, onRatingUpdate, cachedRating } from '../../../stores/ratings';
import { setSetting } from '../../../stores/settings';
import { throttle } from '../../../utils/throttle';

function useCacheStats() {
  const [, rerender] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    const scheduled = throttle(rerender, 300);
    const stop = onRatingUpdate(scheduled);
    return () => {
      stop();
      scheduled.cancel();
    };
  }, []);
  const apps = libraryApps();
  return { total: apps.length, fetched: apps.filter((app) => cachedRating(app.appid)).length };
}

function ClearCacheButton() {
  const [label, setLabel] = React.useState('Clear');
  const clear = async () => {
    setLabel('Clearing…');
    await clearRatingCache();
    setLabel('Cleared');
    setTimeout(() => setLabel('Clear'), 2000);
  };
  return (
    <DialogButton onClick={clear} disabled={label !== 'Clear'} style={{ padding: '0 16px' }}>
      {label}
    </DialogButton>
  );
}

export function SettingsPanel() {
  const settings = useSettings();
  const { fetched, total } = useCacheStats();
  return (
    <>
      <Field label="ProtonDB Library Badges" icon={<IconsModule.Settings />} bottomSeparator="standard" focusable={false} />
      <ToggleField label="Game page stat" checked={settings.statRow} onChange={(value) => setSetting('statRow', value)} />
      <ToggleField label="Sidebar indicators" checked={settings.sidebarDots} onChange={(value) => setSetting('sidebarDots', value)} />
      <ToggleField label="Library filter section" checked={settings.filterButton} onChange={(value) => setSetting('filterButton', value)} />
      <Field label="Cached ratings" description={`${fetched} of ${total} games`} bottomSeparator="none">
        <ClearCacheButton />
      </Field>
    </>
  );
}
