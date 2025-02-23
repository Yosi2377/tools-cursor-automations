export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[55%]';
    case 'bottomRight':
      return 'bottom-[65%] right-[55%]';
    case 'right':
      return 'top-1/2 right-[55%] -translate-y-1/2';
    case 'topRight':
      return 'top-[65%] right-[55%]';
    case 'top':
      return 'top-[55%]';
    case 'topLeft':
      return 'top-[65%] left-[55%]';
    case 'left':
      return 'top-1/2 left-[55%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[65%] left-[55%]';
    default:
      return '';
  }
} 