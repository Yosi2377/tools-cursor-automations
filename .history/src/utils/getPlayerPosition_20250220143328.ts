import { PlayerPosition } from '../types/poker';

export const getPlayerPosition = (position: PlayerPosition): string => {
  switch (position) {
    case 'bottom':
      return 'bottom-[60%] left-1/2 -translate-x-1/2';
    case 'bottomRight':
      return 'bottom-[55%] right-[60%]';
    case 'right':
      return 'top-1/2 right-[65%] -translate-y-1/2';
    case 'topRight':
      return 'top-[55%] right-[60%]';
    case 'top':
      return 'top-[60%] left-1/2 -translate-x-1/2';
    default:
      return '';
  }
}; 