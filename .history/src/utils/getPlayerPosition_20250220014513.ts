export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[45%]';
    case 'bottomRight':
      return 'bottom-[45%] right-[45%]';
    case 'right':
      return 'top-1/2 right-[45%] -translate-y-1/2';
    case 'topRight':
      return 'top-[45%] right-[45%]';
    case 'top':
      return 'top-[45%]';
    case 'topLeft':
      return 'top-[45%] left-[45%]';
    case 'left':
      return 'top-1/2 left-[45%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[45%] left-[45%]';
    default:
      return '';
  }
} 