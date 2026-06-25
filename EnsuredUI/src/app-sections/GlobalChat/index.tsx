import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import CinematicChat from '../../xds/components/CinematicChat'
import type { CinematicChatMessage } from '../../xds/components/CinematicChat'
import { colors, withAlpha } from '../../xds/colors'
import { radii, typography, zIndices } from '../../xds/tokens'

type GlobalChatContextValue = {
  isOpen: boolean
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
}

const GlobalChatContext = createContext<GlobalChatContextValue>({
  isOpen: false,
  openChat: () => {},
  closeChat: () => {},
  toggleChat: () => {}
})

export function useGlobalChat() {
  return useContext(GlobalChatContext)
}

const SUGGESTIONS = [
  'Summarize my open submissions',
  'Where am I over appetite?',
  'Explain my latest pipeline failure'
]

// Placeholder reply until the global chat agent is outlined and wired in. The
// overlay is intentionally NOT connected to any backend yet — this provider only
// owns the cinematic takeover UX (open/close, escape, local transcript state).
const NOT_CONNECTED_REPLY =
  'The Ensured copilot is not connected yet — this is a preview of the conversation experience. Once the global chat agent is in place, your question will be answered here.'

const LauncherButton = styled.button`
  position: fixed;
  right: 1.25rem;
  bottom: 1.5rem;
  z-index: ${zIndices.modal - 1};
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.3)};
  border-radius: ${radii.round}px;
  background: ${colors.primary};
  color: ${colors.onPrimary};
  padding: 0.8rem 1.15rem;
  font-family: inherit;
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.bold};
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 18px 40px -12px ${withAlpha(colors.primary, 0.55)};
  transition: transform 140ms ease, filter 140ms ease;

  &:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.96);
  }
`

const LauncherGlyph = styled.span`
  font-size: ${typography.sizes.md}px;
  line-height: 1;
`

/**
 * Floating CTA that opens the cinematic chat. Rendered by the provider on every
 * screen; hidden while the overlay is up so it never floats above the scrim.
 */
function GlobalChatLauncher() {
  const { isOpen, openChat } = useGlobalChat()

  if (isOpen) return null

  return (
    <LauncherButton type="button" aria-label="Open Ensured copilot chat" onClick={openChat}>
      <LauncherGlyph aria-hidden="true">✦</LauncherGlyph>
      Ask Copilot
    </LauncherButton>
  )
}

export type GlobalChatProviderProps = {
  children?: React.ReactNode
}

/**
 * App-wide cinematic chat wrapper. Mounts the launcher CTA and the full-screen
 * CinematicChat overlay above whatever the router renders, and exposes
 * open/close controls via useGlobalChat() so any screen can trigger the takeover.
 */
export function GlobalChatProvider({ children }: GlobalChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<CinematicChatMessage[]>([])

  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])
  const toggleChat = useCallback(() => setIsOpen((current) => !current), [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSend = useCallback((content: string) => {
    setMessages((current) => [
      ...current,
      { id: `msg-${current.length + 1}`, role: 'user', content },
      { id: `msg-${current.length + 2}`, role: 'assistant', content: NOT_CONNECTED_REPLY }
    ])
    setDraft('')
  }, [])

  const contextValue = useMemo(
    () => ({ isOpen, openChat, closeChat, toggleChat }),
    [isOpen, openChat, closeChat, toggleChat]
  )

  return (
    <GlobalChatContext.Provider value={contextValue}>
      {children}
      <GlobalChatLauncher />
      <CinematicChat
        open={isOpen}
        messages={messages}
        draft={draft}
        suggestions={SUGGESTIONS}
        onClose={closeChat}
        onDraftChange={setDraft}
        onSend={handleSend}
        onSuggestionSelect={setDraft}
      />
    </GlobalChatContext.Provider>
  )
}

export default GlobalChatProvider
