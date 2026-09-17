import React from 'react';
import { moduleExportFinder } from '../lib/steam';

interface TooltipProps {
  toolTipContent: React.ReactNode;
  children: React.ReactNode;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  nDelayShowMS?: number;
  className?: string;
  onClick?: () => void;
}

export const getTooltip = moduleExportFinder<React.ComponentType<TooltipProps>>((candidate) => {
  if (typeof candidate !== 'function') return false;
  const source = String(candidate);
  return source.includes('toolTipContent') && source.includes('tool-tip-source') && source.includes('divProps');
});
