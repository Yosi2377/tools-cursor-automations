export function getPlayerPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'bottom-[35%] left-1/2 -translate-x-1/2'
    case 'bottomRight':
      return 'bottom-[45%] right-[35%] translate-x-0'
    case 'right':
      return 'top-1/2 right-[25%] -translate-y-1/2 translate-x-0'
    case 'topRight':
      return 'top-[45%] right-[35%] translate-x-0'
    case 'top':
      return 'top-[35%] left-1/2 -translate-x-1/2'
    case 'topLeft':
      return 'top-[45%] left-[35%] translate-x-0'
    case 'left':
      return 'top-1/2 left-[25%] -translate-y-1/2 translate-x-0'
    case 'bottomLeft':
      return 'bottom-[45%] left-[35%] translate-x-0'
    default:
      return ''
  }
} 