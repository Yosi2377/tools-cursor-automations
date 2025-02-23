import { PlayerPosition } from '../types/poker';

export const getPlayerPosition = (position: PlayerPosition): string => {
  switch (position) {
    case 'bottom':
      return 'bottom-[65%] left-1/2 -translate-x-1/2';
    case 'bottomRight':
      return 'bottom-[60%] right-[65%]';
    case 'right':
      return 'top-1/2 right-[70%] -translate-y-1/2';
    case 'topRight':
      return 'top-[60%] right-[65%]';
    case 'top':
      return 'top-[65%] left-1/2 -translate-x-1/2';
    default:
      return '';
  }
}; 