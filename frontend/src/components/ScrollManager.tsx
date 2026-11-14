import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

export function ScrollManager() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const locationRef = useRef(location)
  const positionsRef = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  useLayoutEffect(() => {
    const currentLocation = location
    locationRef.current = currentLocation
    let animationFrame = 0
    let observer: MutationObserver | undefined

    const scrollToHash = () => {
      let id: string
      try {
        id = decodeURIComponent(currentLocation.hash.slice(1))
      } catch {
        id = currentLocation.hash.slice(1)
      }

      const target = document.getElementById(id)
      if (!target) return false

      observer?.disconnect()
      animationFrame = window.requestAnimationFrame(() => target.scrollIntoView())
      return true
    }

    const restorePosition = (position: number) => {
      const restore = () => {
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        )
        window.scrollTo(0, Math.min(position, maxScroll))
      }

      if (document.querySelector('[data-scroll-pending="true"]')) {
        observer = new MutationObserver(() => {
          if (document.querySelector('[data-scroll-pending="true"]')) return
          observer?.disconnect()
          animationFrame = window.requestAnimationFrame(restore)
        })
        observer.observe(document.body, { childList: true, subtree: true, attributes: true })
      } else {
        animationFrame = window.requestAnimationFrame(restore)
      }
    }

    if (navigationType === 'POP') {
      const savedPosition = positionsRef.current.get(currentLocation.key)
      if (savedPosition !== undefined) {
        restorePosition(savedPosition)
      } else if (currentLocation.hash) {
        if (!scrollToHash()) {
          observer = new MutationObserver(scrollToHash)
          observer.observe(document.body, { childList: true, subtree: true })
        }
      } else {
        animationFrame = window.requestAnimationFrame(() => window.scrollTo(0, 0))
      }
    } else if (currentLocation.hash) {
      if (!scrollToHash()) {
        observer = new MutationObserver(scrollToHash)
        observer.observe(document.body, { childList: true, subtree: true })
      }
    } else {
      animationFrame = window.requestAnimationFrame(() => window.scrollTo(0, 0))
    }

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer?.disconnect()
    }
  }, [location, navigationType])

  useLayoutEffect(() => {
    const rememberPosition = () => {
      positionsRef.current.set(locationRef.current.key, window.scrollY)
    }

    window.addEventListener('scroll', rememberPosition, { passive: true })
    return () => window.removeEventListener('scroll', rememberPosition)
  }, [])

  return null
}
