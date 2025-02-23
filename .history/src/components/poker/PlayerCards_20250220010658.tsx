const getCardPosition = (position: string) => {
  switch (position) {
    case 'bottom':
      return 'top-full mt-8'
    case 'bottomRight':
      return '-top-1/2 -translate-y-full -mt-6'
    case 'right':
      return '-left-full -translate-x-full -mt-6'
    case 'topRight':
      return 'bottom-full translate-y-1/2 -mb-6'
    case 'top':
      return 'bottom-full -mb-8'
    case 'topLeft':
      return 'bottom-full translate-y-1/2 -mb-6'
    case 'left':
      return '-right-full translate-x-full -mt-6'
    case 'bottomLeft':
      return '-top-1/2 -translate-y-full -mt-6'
    default:
      return 'top-0 -translate-y-full'
  }
} 