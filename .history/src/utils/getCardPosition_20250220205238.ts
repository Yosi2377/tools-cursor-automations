export function getCardPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'top-full mt-8'
    case 'bottomRight':
      return '-top-1/2 -translate-y-full -mt-8'
    case 'right':
      return '-left-full -translate-x-full -mt-4'
    case 'topRight':
      return 'bottom-full mb-8'
    case 'top':
      return 'bottom-full mb-8'
    case 'topLeft':
      return 'bottom-full mb-8'
    case 'left':
      return '-right-full translate-x-full -mt-4'
    case 'bottomLeft':
      return '-top-1/2 -translate-y-full -mt-8'
    default:
      return ''
  }
} 