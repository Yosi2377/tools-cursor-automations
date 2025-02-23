export function getCardPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'top-full mt-12'
    case 'bottomRight':
      return '-top-1/2 -translate-y-full -mt-10'
    case 'right':
      return '-left-full -ml-10'
    case 'topRight':
      return 'bottom-full mb-10'
    case 'top':
      return 'bottom-full mb-12'
    case 'topLeft':
      return 'bottom-full mb-10'
    case 'left':
      return '-right-full -mr-10'
    case 'bottomLeft':
      return '-top-1/2 -translate-y-full -mt-10'
    default:
      return ''
  }
} 