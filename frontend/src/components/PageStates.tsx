import { ArrowRightIcon } from './Icons'

export function LoadingState({ label = 'Loading games' }: { label?: string }) {
  return (
    <div role="status" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-2xl border border-white/8 bg-[#17172a]">
          <div className="aspect-[4/3] bg-white/5" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-2/5 rounded bg-white/10" />
            <div className="h-4 rounded bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-white/10" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-400/5 p-6 text-sm text-rose-100">
      <p className="font-semibold">We couldn’t load this section.</p>
      <p className="mt-1 text-rose-100/70">{message}</p>
      {onRetry && <button className="mt-4 inline-flex items-center gap-2 font-semibold text-white hover:text-violet-200" onClick={onRetry}>Try again <ArrowRightIcon /></button>}
    </div>
  )
}
