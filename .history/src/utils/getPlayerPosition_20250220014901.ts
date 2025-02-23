export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[35%]';
    case 'bottomRight':
      return 'bottom-[35%] right-[35%]';
    case 'right':
      return 'top-1/2 right-[35%] -translate-y-1/2';
    case 'topRight':
      return 'top-[35%] right-[35%]';
    case 'top':
      return 'top-[35%]';
    case 'topLeft':
      return 'top-[35%] left-[35%]';
    case 'left':
      return 'top-1/2 left-[35%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[35%] left-[35%]';
    default:
      return '';
  }
} 