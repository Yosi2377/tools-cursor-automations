import { PlayerPosition } from '../types/poker';

export const getPlayerPosition = (position: PlayerPosition): string => {
  switch (position) {
    case 'bottom':
      return 'bottom-[60%] left-1/2 -translate-x-1/2';
    case 'bottomLeft':
      return 'bottom-[55%] left-[70%]';
    case 'left':
      return 'top-1/2 left-[80%] -translate-y-1/2';
    case 'topLeft':
      return 'top-[55%] left-[70%]';
    case 'top':
      return 'top-[60%] left-1/2 -translate-x-1/2';
    case 'topRight':
      return 'top-[55%] right-[70%]';
    case 'right':
      return 'top-1/2 right-[80%] -translate-y-1/2';
    case 'bottomRight':
      return 'bottom-[55%] right-[70%]';
    case 'leftTop':
      return 'top-[40%] left-[75%]';
    case 'leftBottom':
      return 'bottom-[40%] left-[75%]';
    default:
      return '';
  }
}; 