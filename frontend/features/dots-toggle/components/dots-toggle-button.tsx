import { getBulletListIcon } from '../../../components/steam-icons';
import { getTooltip } from '../../../components/tooltip';
import { useSettings } from '../../../hooks/use-settings';
import { setSetting } from '../../../stores/settings';
import { cn } from '../../../utils/cn';

type ToggleRowClasses = Record<'ViewFiltersBar' | 'Filters' | 'CheckboxWithImage' | 'Active' | 'Disabled', string>;

const TOOLTIP = 'Show ProtonDB rating dots';

export function DotsToggleButton({ classes }: { classes: ToggleRowClasses }) {
  const { sidebarDots } = useSettings();
  const Tooltip = getTooltip();
  const Icon = getBulletListIcon();
  if (!Icon) return null;

  const className = cn(classes.CheckboxWithImage, sidebarDots && classes.Active);
  const onClick = () => setSetting('sidebarDots', !sidebarDots);

  if (Tooltip) {
    return (
      <Tooltip toolTipContent={TOOLTIP} direction="top" nDelayShowMS={240} className={className} onClick={onClick}>
        <Icon />
      </Tooltip>
    );
  }
  return (
    <div className={className} title={TOOLTIP} onClick={onClick}>
      <Icon />
    </div>
  );
}
