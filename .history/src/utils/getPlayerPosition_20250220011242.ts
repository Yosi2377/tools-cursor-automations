export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[55%] left-1/2 -translate-x-1/2'
    case 'bottomRight':
      return 'bottom-[75%] right-[55%] translate-x-0'
    case 'right':
      return 'top-1/2 right-[55%] -translate-y-1/2 translate-x-0'
    case 'topRight':
      return 'top-[75%] right-[55%] translate-x-0'
    case 'top':
      return 'top-[55%] left-1/2 -translate-x-1/2'
    case 'topLeft':
      return 'top-[75%] left-[55%] translate-x-0'
    case 'left':
      return 'top-1/2 left-[55%] -translate-y-1/2 translate-x-0'
    case 'bottomLeft':
      return 'bottom-[75%] left-[55%] translate-x-0'
    default:
      return ''
  }
} 