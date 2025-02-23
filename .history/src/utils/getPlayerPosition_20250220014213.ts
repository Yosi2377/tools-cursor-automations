export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[85%]';
    case 'bottomRight':
      return 'bottom-[85%] right-[85%]';
    case 'right':
      return 'top-1/2 right-[85%] -translate-y-1/2';
    case 'topRight':
      return 'top-[85%] right-[85%]';
    case 'top':
      return 'top-[85%]';
    case 'topLeft':
      return 'top-[85%] left-[85%]';
    case 'left':
      return 'top-1/2 left-[85%] -translate-y-1/2';
    case 'bottomLeft':
      return 'bottom-[85%] left-[85%]';
    default:
      return '';
  }
} 