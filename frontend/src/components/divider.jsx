export function Divider({ orientation = 'horizontal', className = '' }) {
  const baseClass =
    orientation === 'vertical'
      ? 'w-px self-stretch bg-slate-200'
      : 'h-px w-full bg-slate-200'

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`${baseClass} ${className}`.trim()}
    />
  )
}

export default Divider