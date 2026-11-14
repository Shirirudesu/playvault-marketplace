import { useState } from 'react'

interface ProductArtworkProps {
  src: string | null
  title: string
  className?: string
  fit?: 'cover' | 'contain'
  loading?: 'eager' | 'lazy'
  portraitBackdrop?: boolean
}

export function ProductArtwork({ src, title, className = '', fit = 'cover', loading = 'lazy', portraitBackdrop = false }: ProductArtworkProps) {
  const [failed, setFailed] = useState(false)
  const [portraitFailed, setPortraitFailed] = useState(false)
  const portraitSrc = src?.replace(/\/header\.jpg(?=$|[?#])/, '/library_600x900.jpg') ?? null
  const usingPortraitSource = portraitBackdrop && portraitSrc !== src && !portraitFailed
  const artworkSrc = usingPortraitSource ? portraitSrc : src

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#5825CC] via-[#351183] to-[#1F0A4D] ${className}`}>
      {src && !failed ? (
        <>
          {portraitBackdrop && !usingPortraitSource && (
            <img
              src={src}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
              loading={loading}
              decoding="async"
            />
          )}
          <img
            src={artworkSrc ?? src}
            alt={`${title} cover`}
            className={`absolute inset-0 h-full w-full ${fit === 'contain' ? 'object-contain p-2 sm:p-3' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`}
            loading={loading}
            decoding="async"
            onError={() => {
              if (usingPortraitSource) setPortraitFailed(true)
              else setFailed(true)
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_65%_25%,rgba(122,78,223,.55),transparent_38%),linear-gradient(145deg,#5825CC,#1F0A4D_70%)]">
          <span aria-hidden="true" className="text-6xl font-black tracking-tight text-white/20">{title.slice(0, 1)}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1F0A4D]/55 to-transparent" />
    </div>
  )
}
