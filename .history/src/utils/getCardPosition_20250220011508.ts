export function getCardPosition(position: string): string {
  switch (position) {
    case 'bottom':
      return 'top-full mt-10'
    case 'bottomRight':
      return '-top-1/2 -translate-y-full -mt-12'
    case 'right':
      return '-left-full -translate-x-full -mt-6'
    case 'topRight':
      return 'bottom-full mb-12'
    case 'top':
      return 'bottom-full mb-10'
    case 'topLeft':
      return 'bottom-full mb-12'
    case 'left':
      return '-right-full translate-x-full -mt-6'
    case 'bottomLeft':
      return '-top-1/2 -translate-y-full -mt-12'
    default:
      return ''
  }
} 