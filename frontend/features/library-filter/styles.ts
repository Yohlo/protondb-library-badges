import { tierMarkerCss } from '../../config/tiers';
import { PanelClasses } from './components/protondb-bucket';

export const FILTER_STYLE_ID = 'protondb-filter-styles';

const AFTER_STEAM_BUCKETS = 6;

export const filterCss = (c: PanelClasses) => `
.pdb-bucket { order: ${AFTER_STEAM_BUCKETS}; }
.${c.Container} .${c.WideFormat} .${c.FilterArea}:has(.pdb-bucket) { grid-template-columns: repeat(5, 1fr); }
.pdb-bucket .DialogToggle_Label { display: flex; align-items: center; gap: 6px; }
.pdb-swatch { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
${tierMarkerCss('.pdb-swatch')}
`;
