import { useCallback, useRef } from 'react'
import useAuthStore from '@/store/authStore'
import { translations } from '@/utils/translations'

// Global queue for batching translations across all component instances
let translationQueue = []
let batchTimeout = null
const BATCH_WAIT_MS = 100 // Wait 100ms for more requests before sending

export default function useLanguage() {
  const { language, setLanguage, accessToken } = useAuthStore()
  const resolversRef = useRef({})

  const processBatch = useCallback(async () => {
    if (translationQueue.length === 0) return

    const currentQueue = [...new Set(translationQueue)]
    const currentResolvers = { ...resolversRef.current }
    
    // Reset global queue and local resolvers for next batch
    translationQueue = []
    resolversRef.current = {}
    batchTimeout = null

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const token = useAuthStore.getState().accessToken

      const response = await fetch(`${apiUrl}/translate/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ texts: currentQueue, to: language }),
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const result = await response.json()
      if (result.success && result.data?.translations) {
        currentQueue.forEach((text, index) => {
          const translated = result.data.translations[index] || text
          localStorage.setItem(`trans_${language}_${text}`, translated)
          
          // Resolve all promises waiting for this specific text
          if (currentResolvers[text]) {
            currentResolvers[text].forEach(resolve => resolve(translated))
          }
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Batch translation failed:', err)
      // Fallback to original text for everything in this batch
      currentQueue.forEach(text => {
        if (currentResolvers[text]) {
          currentResolvers[text].forEach(resolve => resolve(text))
        }
      })
    }
  }, [language])

  const translateData = useCallback((text) => {
    if (language === 'en' || !text) return Promise.resolve(text)

    const cacheKey = `trans_${language}_${text}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) return Promise.resolve(cached)

    return new Promise((resolve) => {
      // Add text to global queue
      translationQueue.push(text)
      
      // Add resolver to local ref
      if (!resolversRef.current[text]) {
        resolversRef.current[text] = []
      }
      resolversRef.current[text].push(resolve)

      // Set/Reset timeout
      if (batchTimeout) clearTimeout(batchTimeout)
      batchTimeout = setTimeout(processBatch, BATCH_WAIT_MS)
    })
  }, [language, processBatch])

  const t = useCallback((path) => {
    const keys = path.split('.')
    let result = translations[language]

    for (const key of keys) {
      if (result && result[key]) {
        result = result[key]
      } else {
        let fallback = translations['en']
        for (const fKey of keys) {
          if (fallback && fallback[fKey]) {
            fallback = fallback[fKey]
          } else {
            return path
          }
        }
        return fallback
      }
    }
    return result
  }, [language])

  return { language, setLanguage, t, translateData }
}
