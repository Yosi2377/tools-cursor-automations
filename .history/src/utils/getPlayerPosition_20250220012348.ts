export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[5%]';
    case 'bottomRight':
      return 'bottom-[15%] right-[5%]';
    case 'right':
      return 'top-1/2 right-[5%] -translate-y-1/2';
    case 'topRight':
      return 'top-[15%] right-[5%]';
    case 'top':
      return 'top-[5%]';
    case 'topLeft':
      return 'top-[15%] left-[5%]';
    case 'left':
      return 'top-1/2 left-[5%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[15%] left-[5%]';
    default:
      return '';
  }
} 