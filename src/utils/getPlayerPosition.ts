import { PlayerPosition } from '../types/poker';

export const getPlayerPosition = (position: PlayerPosition): string => {
  switch (position) {
    case 'bottom':
      return 'bottom-2 sm:bottom-3 md:bottom-4 left-1/2 -translate-x-1/2';
    case 'bottomLeft':
      return 'bottom-12 sm:bottom-14 md:bottom-16 left-12 sm:left-14 md:left-16 -translate-x-1/2';
    case 'left':
      return 'left-6 sm:left-7 md:left-8 top-1/2 -translate-y-1/2';
    case 'topLeft':
      return 'top-12 sm:top-14 md:top-16 left-12 sm:left-14 md:left-16 -translate-x-1/2';
    case 'top':
      return 'top-2 sm:top-3 md:top-4 left-1/2 -translate-x-1/2';
    case 'topRight':
      return 'top-12 sm:top-14 md:top-16 right-12 sm:right-14 md:right-16 translate-x-1/2';
    case 'right':
      return 'right-6 sm:right-7 md:right-8 top-1/2 -translate-y-1/2';
    case 'bottomRight':
      return 'bottom-12 sm:bottom-14 md:bottom-16 right-12 sm:right-14 md:right-16 translate-x-1/2';
    case 'leftTop':
      return 'top-[40%] left-[15%]';
    case 'leftBottom':
      return 'bottom-[40%] left-[15%]';
    default:
      return '';
  }
}; 