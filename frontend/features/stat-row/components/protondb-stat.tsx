import React from 'react';
import { Rating, TIER_INFO } from '../../../config/tiers';
import { onRatingUpdate, cachedRating, requestRating } from '../../../stores/ratings';
import { getLinuxIcon } from '../../../components/steam-icons';
import { getTooltip } from '../../../components/tooltip';
import { openProtonDB } from '../../../lib/steam';
import { cn } from '../../../utils/cn';

type StatClasses = Record<
  'GameStat' | 'GameStatIcon' | 'GameStatRight' | 'PlayBarLabel' | 'PlayBarDetailLabel' | 'PlaytimeIcon' | 'LastPlayed' | 'LastPlayedInfo',
  string
>;

type RatingState = { status: 'loading' } | { status: 'unavailable' } | { status: 'rated'; rating: Rating };

const MUTED = 'rgba(255,255,255,.4)';

function describe(state: RatingState): { text: string; color: string; tip: string } {
  switch (state.status) {
    case 'loading':
      return { text: '…', color: MUTED, tip: 'Loading ProtonDB rating' };
    case 'unavailable':
      return { text: 'Unavailable', color: MUTED, tip: 'Could not reach ProtonDB. Click to open the report page.' };
    case 'rated': {
      const { tier, total } = state.rating;
      const info = TIER_INFO[tier];
      const reports = total ? `${total} report${total === 1 ? '' : 's'}` : 'no reports';
      return { text: info.label, color: info.color, tip: `${info.description} (${reports}). Click to open ProtonDB.` };
    }
  }
}

const cachedState = (appId: number): RatingState => {
  const known = cachedRating(appId);
  return known ? { status: 'rated', rating: known } : { status: 'loading' };
};

function useRating(appId: number): RatingState {
  const [state, setState] = React.useState<RatingState>(() => cachedState(appId));
  React.useEffect(() => {
    let alive = true;
    const load = () => {
      const cached = cachedState(appId);
      setState(cached);
      if (cached.status !== 'loading') return;
      requestRating(appId, 'high').then((rating) => {
        if (alive) setState(rating ? { status: 'rated', rating } : { status: 'unavailable' });
      });
    };
    if (state.status === 'loading') load();
    const stop = onRatingUpdate((id, rating) => {
      if (id !== appId) return;
      if (rating) setState({ status: 'rated', rating });
      else load();
    });
    return () => {
      alive = false;
      stop();
    };
  }, [appId]);
  return state;
}

export function ProtonDBStat({ appId, classes }: { appId: number; classes: StatClasses }) {
  const { text, color, tip } = describe(useRating(appId));
  const Tooltip = getTooltip();
  const LinuxIcon = getLinuxIcon();
  const body = (
    <div
      className={cn(classes.GameStat, classes.LastPlayed, 'Panel')}
      style={{ cursor: 'pointer' }}
      title={Tooltip ? undefined : tip}
      onClick={() => openProtonDB(appId)}
    >
      <div className={cn(classes.GameStatIcon, classes.PlaytimeIcon, 'pdb-stat-icon')}>{LinuxIcon && <LinuxIcon />}</div>
      <div className={classes.GameStatRight}>
        <div className={classes.PlayBarLabel}>ProtonDB</div>
        <div className={cn(classes.PlayBarDetailLabel, classes.LastPlayedInfo)} style={{ color }}>
          {text}
        </div>
      </div>
    </div>
  );
  return Tooltip ? <Tooltip toolTipContent={tip}>{body}</Tooltip> : body;
}
