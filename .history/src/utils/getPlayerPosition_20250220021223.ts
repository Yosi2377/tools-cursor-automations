export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[75%] left-1/2 -translate-x-1/2';
    case 'bottomRight':
      return 'bottom-[65%] right-[65%]';
    case 'right':
      return 'top-1/2 right-[75%] -translate-y-1/2';
    case 'topRight':
      return 'top-[65%] right-[65%]';
    case 'top':
      return 'top-[75%] left-1/2 -translate-x-1/2';
    default:
      return '';
  }
} 