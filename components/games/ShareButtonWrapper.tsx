'use client'

import { useSyncExternalStore } from 'react'
import { ShareButton } from '@/components/ui/ShareButton'

interface ShareButtonWrapperProps {
  title: string
  text: string
}

const emptySubscribe = () => () => {}
const getUrl = () => window.location.href
const getServerUrl = () => ''

export function ShareButtonWrapper({ title, text }: ShareButtonWrapperProps) {
  const url = useSyncExternalStore(emptySubscribe, getUrl, getServerUrl)

  if (!url) return null

  return <ShareButton title={title} text={text} url={url} />
}
