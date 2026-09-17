import React from 'react';
import { moduleExportFinder } from '../lib/steam';

const steamIcon = (name: string) =>
  moduleExportFinder<React.ComponentType<React.SVGAttributes<SVGElement>>>(
    (candidate) => typeof candidate === 'function' && String(candidate).includes(`SVGIcon_${name}"`),
  );

export const getLinuxIcon = steamIcon('LinuxLogo');
export const getBulletListIcon = steamIcon('TextBullets');
