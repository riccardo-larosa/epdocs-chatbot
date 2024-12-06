'use client'

import { Suspense } from 'react'
import { useThemeFromUrl } from '@/utils/themeFromUrl'

function ThemeHandler() {
  useThemeFromUrl()
  return null
}

export function ThemeUrlHandler() {
  return (
    <Suspense fallback={null}>
      <ThemeHandler />
    </Suspense>
  )
} 