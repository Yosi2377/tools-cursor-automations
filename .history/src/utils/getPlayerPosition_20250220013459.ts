export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[15%]';
    case 'bottomRight':
      return 'bottom-[25%] right-[15%]';
    case 'right':
      return 'top-1/2 right-[15%] -translate-y-1/2';
    case 'topRight':
      return 'top-[25%] right-[15%]';
    case 'top':
      return 'top-[15%]';
    case 'topLeft':
      return 'top-[25%] left-[15%]';
    case 'left':
      return 'top-1/2 left-[15%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[25%] left-[15%]';
    default:
      return '';
  }
} 