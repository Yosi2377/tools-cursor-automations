export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[2%]';
    case 'bottomRight':
      return 'bottom-[10%] right-[2%]';
    case 'right':
      return 'top-1/2 right-[2%] -translate-y-1/2';
    case 'topRight':
      return 'top-[10%] right-[2%]';
    case 'top':
      return 'top-[2%]';
    case 'topLeft':
      return 'top-[10%] left-[2%]';
    case 'left':
      return 'top-1/2 left-[2%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[10%] left-[2%]';
    default:
      return '';
  }
} 