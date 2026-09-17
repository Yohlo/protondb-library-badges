import React from 'react';
import { DialogCheckbox, Focusable } from '@steambrew/client';
import { TIERS, TIER_INFO, Tier } from '../../../config/tiers';
import { getTooltip } from '../../../components/tooltip';
import { AppFilter, libraryApps } from '../../../lib/steam';
import { requestRating } from '../../../stores/ratings';
import { cn } from '../../../utils/cn';
import { PROTONDB_GROUP, tierOption } from '../filter-patch';

export type PanelClasses = Record<
  'Container' | 'WideFormat' | 'FilterArea' | 'FilterBucket' | 'FilterBucketLabel' | 'FilterBucketBoxes' | 'Row' | 'Checkbox',
  string
>;

export interface BucketProps {
  appFilter: AppFilter;
  fnOnChange?: () => void;
  classes: PanelClasses;
}

export function ProtonDBBucket({ appFilter, fnOnChange, classes }: BucketProps) {
  const [, rerender] = React.useReducer((n: number) => n + 1, 0);
  const Tooltip = getTooltip();

  const toggle = (tier: Tier, checked: boolean) => {
    appFilter.SelectOption(PROTONDB_GROUP, tierOption(tier), checked);
    if (checked) libraryApps().forEach((app) => requestRating(app.appid));
    fnOnChange?.();
    rerender();
  };

  return (
    <Focusable className={cn(classes.FilterBucket, 'pdb-bucket')} flow-children="column">
      <div className={classes.FilterBucketLabel}>ProtonDB rating</div>
      <div className={classes.FilterBucketBoxes} tabIndex={-1}>
        {TIERS.map((tier) => {
          const info = TIER_INFO[tier];
          const checkbox = (
            <DialogCheckbox
              className={classes.Checkbox}
              checked={appFilter.BIsSelected(PROTONDB_GROUP, tierOption(tier))}
              onChange={(checked) => toggle(tier, checked)}
              label={
                <>
                  <span className="pdb-swatch" data-tier={tier} style={{ '--pdb-color': info.color } as React.CSSProperties} />
                  <span>{info.label}</span>
                </>
              }
            />
          );
          return (
            <Focusable key={tier} className={classes.Row}>
              {Tooltip ? <Tooltip toolTipContent={`${info.label}: ${info.description}`}>{checkbox}</Tooltip> : checkbox}
            </Focusable>
          );
        })}
      </div>
    </Focusable>
  );
}
