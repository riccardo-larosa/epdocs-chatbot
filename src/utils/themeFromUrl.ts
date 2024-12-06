'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export function useThemeFromUrl() {
  const searchParams = useSearchParams()
  const { setTheme } = useTheme()
  
  useEffect(() => {
    const theme = searchParams.get('theme')
    if (theme === 'dark' || theme === 'light') {
      setTheme(theme)
    }
  }, [searchParams, setTheme])
} 