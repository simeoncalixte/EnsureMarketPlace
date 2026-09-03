import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { typography } from '../tokens'
import Button from './Button'

type ChatMessage = {
  id: number
  sender: 'bot' | 'user'
  text: string
}

export type ChatbotProps = {
  audioSrc?: string
  autoPlayOnFirstVisit?: boolean
  storageKey?: string
  title?: string
}

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 ${withAlpha(colors.primary, 0.45)}, 0 18px 48px ${withAlpha(colors.scrim, 0.34)}; }
  50% { box-shadow: 0 0 0 12px ${withAlpha(colors.primary, 0)}, 0 18px 48px ${withAlpha(colors.scrim, 0.34)}; }
`

const Shell = styled.aside`
  position: fixed;
  right: clamp(0.8rem, 2.5vw, 1.6rem);
  bottom: clamp(0.8rem, 2.5vw, 1.6rem);
  z-index: 80;
  display: grid;
  justify-items: end;
  gap: 0.7rem;
  font-family: ${typography.fontFamily};
`

const Panel = styled.section<{ $highlighted: boolean }>`
  width: min(22rem, calc(100vw - 1.6rem));
  overflow: hidden;
  border: 1px solid ${colors.outline};
  background: ${withAlpha(colors.surfaceRaised, 0.98)};
  color: ${colors.text.primary};
  box-shadow: 0 18px 48px ${withAlpha(colors.scrim, 0.34)};
  backdrop-filter: blur(18px);
  transform-origin: bottom right;

  ${({ $highlighted }) => $highlighted && css`
    border-color: ${colors.primary};
    animation: ${pulse} 1.8s ease-in-out 3;
  `}
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.primaryContainer};
`

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
`

const Avatar = styled.div`
  position: relative;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid ${withAlpha(colors.onPrimaryContainer, 0.5)};
  background: ${colors.surfaceDeep};
  color: ${colors.primarySoft};
  font-family: ${typography.labelFamily};
  font-size: 0.6rem;
  font-weight: 700;

  &::after {
    content: '';
    position: absolute;
    right: -0.2rem;
    bottom: -0.2rem;
    width: 0.48rem;
    height: 0.48rem;
    border: 2px solid ${colors.primaryContainer};
    border-radius: 50%;
    background: ${colors.primarySoft};
  }
`

const TitleGroup = styled.div`
  min-width: 0;
`

const Title = styled.div`
  color: ${colors.white};
  font-family: ${typography.headlineFamily};
  font-size: 1rem;
  font-weight: 700;
`

const Status = styled.div`
  margin-top: 0.1rem;
  color: ${colors.onPrimaryContainer};
  font-family: ${typography.labelFamily};
  font-size: 0.48rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const IconButton = styled.button`
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid ${withAlpha(colors.onPrimaryContainer, 0.32)};
  background: transparent;
  color: ${colors.onPrimaryContainer};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${withAlpha(colors.white, 0.08)};
    color: ${colors.white};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primarySoft};
    outline-offset: 2px;
  }

  .material-symbols-outlined {
    font-size: 1rem;
  }
`

const WelcomeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceContainer};
`

const AudioButton = styled(Button)`
  min-width: 2.25rem;
  min-height: 2.25rem;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 50%;

  .material-symbols-outlined {
    font-size: 1rem;
  }
`

const AudioCopy = styled.div`
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    color: ${colors.text.primary};
    font-size: 0.76rem;
  }

  span {
    display: block;
    margin-top: 0.12rem;
    color: ${colors.onSurfaceVariant};
    font-family: ${typography.labelFamily};
    font-size: 0.48rem;
    line-height: 1.4;
    text-transform: uppercase;
  }
`

const Messages = styled.div`
  max-height: 13rem;
  display: grid;
  gap: 0.6rem;
  overflow-y: auto;
  padding: 0.8rem;
`

const Message = styled.div<{ $sender: 'bot' | 'user' }>`
  max-width: 88%;
  justify-self: ${({ $sender }) => ($sender === 'bot' ? 'start' : 'end')};
  padding: 0.62rem 0.7rem;
  border: 1px solid ${({ $sender }) => ($sender === 'bot' ? colors.border : colors.primary)};
  background: ${({ $sender }) => ($sender === 'bot' ? colors.surfaceContainer : colors.primaryContainer)};
  color: ${({ $sender }) => ($sender === 'bot' ? colors.text.primary : colors.onPrimaryContainer)};
  font-size: 0.78rem;
  line-height: 1.45;
`

const Suggestions = styled.div`
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding: 0 0.8rem 0.7rem;
`

const Suggestion = styled.button`
  flex: 0 0 auto;
  padding: 0.4rem 0.52rem;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceContainerLow};
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.48rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: ${colors.primary};
    color: ${colors.primarySoft};
  }
`

const Composer = styled.form`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.45rem;
  padding: 0.7rem 0.8rem 0.8rem;
  border-top: 1px solid ${colors.border};
`

const ChatInput = styled.input`
  min-width: 0;
  height: 2.35rem;
  padding: 0 0.65rem;
  border: 1px solid ${colors.border};
  border-radius: 0;
  background: ${colors.surfaceContainerLow};
  color: ${colors.text.primary};
  font: inherit;
  font-size: 0.75rem;
  outline: none;

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 2px ${withAlpha(colors.primary, 0.16)};
  }

  &::placeholder {
    color: ${colors.onSurfaceVariant};
  }
`

const SendButton = styled(Button)`
  width: 2.35rem;
  height: 2.35rem;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 0;

  .material-symbols-outlined {
    font-size: 1rem;
  }
`

const Launcher = styled.button<{ $highlighted: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 3.2rem;
  padding: 0.5rem 0.85rem 0.5rem 0.55rem;
  border: 1px solid ${colors.primary};
  background: ${colors.primaryContainer};
  color: ${colors.onPrimaryContainer};
  box-shadow: 0 14px 36px ${withAlpha(colors.scrim, 0.35)};
  font-family: ${typography.labelFamily};
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;

  ${({ $highlighted }) => $highlighted && css`
    animation: ${pulse} 1.8s ease-in-out infinite;
  `}

  &:focus-visible {
    outline: 2px solid ${colors.primarySoft};
    outline-offset: 3px;
  }
`

const LauncherAvatar = styled(Avatar)`
  width: 2.1rem;
  height: 2.1rem;
`

const answerFor = (question: string): string => {
  const normalized = question.toLowerCase()

  if (normalized.includes('capital') || normalized.includes('invest') || normalized.includes('yield')) {
    return 'Capital providers can review live tranches, compare yield and attachment terms, and begin institutional onboarding with Deploy Capital.'
  }
  if (normalized.includes('risk') || normalized.includes('insur') || normalized.includes('cede')) {
    return 'Insurers and cedants can use Transfer Risk to begin structuring a verified catastrophe layer and request underwriting capacity.'
  }
  if (normalized.includes('reusd') || normalized.includes('re usd') || normalized.includes('token')) {
    return '$reUSD is the platform’s collateralized settlement unit, combining Treasury backing with streamed reinsurance premium float.'
  }
  if (normalized.includes('claim') || normalized.includes('settle')) {
    return 'Verified events flow through the settlement system using live oracle data, with the platform designed around transparent, auditable payouts.'
  }
  return 'I can explain capital deployment, risk transfer, $reUSD, settlement mechanics, or help you choose the right onboarding role.'
}

const welcomeMessage: ChatMessage = {
  id: 1,
  sender: 'bot',
  text: 'Welcome to Ensured Re. I can introduce the marketplace or help you choose the right path through the platform.',
}

export const Chatbot: React.FC<ChatbotProps> = ({
  audioSrc = '/ensured-re-welcome.mp3',
  autoPlayOnFirstVisit = false,
  storageKey = 'ensured-landing-welcome-attempted-v1',
  title = 'Ensured AI',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const [isFirstVisit] = useState(() => {
    if (typeof window === 'undefined' || !autoPlayOnFirstVisit) return false
    return window.sessionStorage.getItem(storageKey) !== 'true'
  })
  const [isOpen, setIsOpen] = useState(isFirstVisit)
  const [highlighted, setHighlighted] = useState(isFirstVisit)
  const [audioState, setAudioState] = useState<'ready' | 'playing' | 'paused' | 'blocked'>('ready')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])

  const audioDescription = useMemo(() => {
    if (audioState === 'playing') return 'Playing your 44-second welcome briefing'
    if (audioState === 'blocked') return 'Select play to hear your welcome briefing'
    if (audioState === 'paused') return 'Welcome briefing paused'
    return 'Replay the 44-second welcome briefing'
  }, [audioState])

  useEffect(() => {
    if (!isFirstVisit || !autoPlayOnFirstVisit || !audioRef.current) return

    window.sessionStorage.setItem(storageKey, 'true')
    const timer = window.setTimeout(() => {
      audioRef.current?.play()
        .then(() => setAudioState('playing'))
        .catch(() => setAudioState('blocked'))
    }, 450)

    return () => window.clearTimeout(timer)
  }, [autoPlayOnFirstVisit, isFirstVisit, storageKey])

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const toggleAudio = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.paused) {
      audio.pause()
      setAudioState('paused')
      return
    }

    if (audio.ended || audio.currentTime > 0) audio.currentTime = 0
    try {
      await audio.play()
      window.sessionStorage.setItem(storageKey, 'true')
      setAudioState('playing')
      setHighlighted(true)
    } catch {
      setAudioState('blocked')
    }
  }

  const ask = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return

    const messageId = Date.now()
    setMessages((current) => [
      ...current,
      { id: messageId, sender: 'user', text: trimmed },
      { id: messageId + 1, sender: 'bot', text: answerFor(trimmed) },
    ])
    setInput('')
    setHighlighted(false)
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    ask(input)
  }

  return (
    <Shell aria-live="polite">
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="auto"
        onPlay={() => setAudioState('playing')}
        onPause={() => setAudioState((current) => current === 'playing' ? 'paused' : current)}
        onEnded={() => {
          setAudioState('ready')
          setHighlighted(false)
        }}
      />

      {isOpen ? (
        <Panel $highlighted={highlighted} role="dialog" aria-label={`${title} assistant`}>
          <Header>
            <Identity>
              <Avatar aria-hidden="true">AI</Avatar>
              <TitleGroup><Title>{title}</Title><Status>Online // Sovereign desk</Status></TitleGroup>
            </Identity>
            <IconButton type="button" onClick={() => setIsOpen(false)} aria-label="Minimize Ensured AI">
              <span className="material-symbols-outlined" aria-hidden="true">remove</span>
            </IconButton>
          </Header>

          <WelcomeControl>
            <AudioButton type="button" onClick={toggleAudio} aria-label={audioState === 'playing' ? 'Pause welcome audio' : 'Play welcome audio'}>
              <span className="material-symbols-outlined" aria-hidden="true">{audioState === 'playing' ? 'pause' : 'play_arrow'}</span>
            </AudioButton>
            <AudioCopy><strong>Your audio introduction</strong><span>{audioDescription}</span></AudioCopy>
          </WelcomeControl>

          <Messages ref={messagesRef} aria-label="Conversation">
            {messages.map((message) => <Message key={message.id} $sender={message.sender}>{message.text}</Message>)}
          </Messages>

          <Suggestions aria-label="Suggested questions">
            <Suggestion type="button" onClick={() => ask('How do I deploy capital?')}>Deploy capital</Suggestion>
            <Suggestion type="button" onClick={() => ask('How do I transfer risk?')}>Transfer risk</Suggestion>
            <Suggestion type="button" onClick={() => ask('What is reUSD?')}>What is $reUSD?</Suggestion>
          </Suggestions>

          <Composer onSubmit={submit}>
            <ChatInput value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about capital, risk, or $reUSD" aria-label="Ask Ensured AI" />
            <SendButton type="submit" aria-label="Send question" disabled={!input.trim()}>
              <span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
            </SendButton>
          </Composer>
        </Panel>
      ) : (
        <Launcher type="button" onClick={() => { setIsOpen(true); setHighlighted(false) }} $highlighted={highlighted} aria-label="Open Ensured AI assistant">
          <LauncherAvatar aria-hidden="true">AI</LauncherAvatar>
          Ask Ensured AI
        </Launcher>
      )}
    </Shell>
  )
}

export default Chatbot
