export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[50%] left-1/2 -translate-x-1/2'
    case 'bottomRight':
      return 'bottom-[70%] right-[50%] translate-x-0'
    case 'right':
      return 'top-1/2 right-[50%] -translate-y-1/2 translate-x-0'
    case 'topRight':
      return 'top-[70%] right-[50%] translate-x-0'
    case 'top':
      return 'top-[50%] left-1/2 -translate-x-1/2'
    case 'topLeft':
      return 'top-[70%] left-[50%] translate-x-0'
    case 'left':
      return 'top-1/2 left-[50%] -translate-y-1/2 translate-x-0'
    case 'bottomLeft':
      return 'bottom-[70%] left-[50%] translate-x-0'
    default:
      return ''
  }
} 