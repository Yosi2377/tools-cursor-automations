import { PlayerPosition } from '../types/poker';

export const getPlayerPosition = (position: PlayerPosition): string => {
  switch (position) {
    case 'bottom':
      return 'bottom-[15%] left-1/2 -translate-x-1/2';
    case 'bottomLeft':
      return 'bottom-[20%] left-[20%]';
    case 'left':
      return 'top-1/2 left-[10%] -translate-y-1/2';
    case 'topLeft':
      return 'top-[20%] left-[20%]';
    case 'top':
      return 'top-[15%] left-1/2 -translate-x-1/2';
    case 'topRight':
      return 'top-[20%] right-[20%]';
    case 'right':
      return 'top-1/2 right-[10%] -translate-y-1/2';
    case 'bottomRight':
      return 'bottom-[20%] right-[20%]';
    case 'leftTop':
      return 'top-[40%] left-[15%]';
    case 'leftBottom':
      return 'bottom-[40%] left-[15%]';
    default:
      return '';
  }
}; 