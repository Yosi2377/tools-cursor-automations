export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[30%]';
    case 'bottomRight':
      return 'bottom-[40%] right-[30%]';
    case 'right':
      return 'top-1/2 right-[20%] -translate-y-1/2';
    case 'topRight':
      return 'top-[40%] right-[30%]';
    case 'top':
      return 'top-[30%]';
    case 'topLeft':
      return 'top-[40%] left-[30%]';
    case 'left':
      return 'top-1/2 left-[20%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[40%] left-[30%]';
    default:
      return '';
  }
} 