export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[65%]';
    case 'bottomRight':
      return 'bottom-[65%] right-[65%]';
    case 'right':
      return 'top-1/2 right-[65%] -translate-y-1/2';
    case 'topRight':
      return 'top-[65%] right-[65%]';
    case 'top':
      return 'top-[65%]';
    case 'topLeft':
      return 'top-[65%] left-[65%]';
    case 'left':
      return 'top-1/2 left-[65%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[65%] left-[65%]';
    default:
      return '';
  }
} 