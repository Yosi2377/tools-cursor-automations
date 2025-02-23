import { PlayerPosition } from '../types/poker';

export const getPlayerPosition = (position: PlayerPosition): string => {
  switch (position) {
    case 'bottom':
      return 'bottom-[5%] left-1/2 -translate-x-1/2';
    case 'bottomLeft':
      return 'bottom-[15%] left-[25%] -translate-x-1/2';
    case 'left':
      return 'top-1/2 left-[5%] -translate-y-1/2';
    case 'topLeft':
      return 'top-[15%] left-[25%] -translate-x-1/2';
    case 'top':
      return 'top-[5%] left-1/2 -translate-x-1/2';
    case 'topRight':
      return 'top-[15%] right-[25%] translate-x-1/2';
    case 'right':
      return 'top-1/2 right-[5%] -translate-y-1/2';
    case 'bottomRight':
      return 'bottom-[15%] right-[25%] translate-x-1/2';
    case 'leftTop':
      return 'top-[35%] left-[10%]';
    case 'leftBottom':
      return 'bottom-[35%] left-[10%]';
    default:
      return '';
  }
}; 