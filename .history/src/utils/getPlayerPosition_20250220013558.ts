export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[25%]';
    case 'bottomRight':
      return 'bottom-[35%] right-[25%]';
    case 'right':
      return 'top-1/2 right-[25%] -translate-y-1/2';
    case 'topRight':
      return 'top-[35%] right-[25%]';
    case 'top':
      return 'top-[25%]';
    case 'topLeft':
      return 'top-[35%] left-[25%]';
    case 'left':
      return 'top-1/2 left-[25%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[35%] left-[25%]';
    default:
      return '';
  }
} 