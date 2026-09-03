import React from 'react'
import Chatbot, { type ChatbotProps } from '../components/Chatbot'

export type WithChatbotOptions = ChatbotProps

export function withChatbot<Props extends object>(
  WrappedComponent: React.ComponentType<Props>,
  options: WithChatbotOptions = {},
) {
  const WithChatbot: React.FC<Props> = (props) => (
    <>
      <WrappedComponent {...props} />
      <Chatbot {...options} />
    </>
  )

  const wrappedName = WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'
  WithChatbot.displayName = `withChatbot(${wrappedName})`

  return WithChatbot
}

export default withChatbot
