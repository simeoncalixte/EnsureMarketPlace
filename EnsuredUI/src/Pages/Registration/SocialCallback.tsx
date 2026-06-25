import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router'
import { colors } from '../../xds/colors'
import { spacing, typography } from '../../xds/tokens'
import { saveAuthToken } from '../../lib/auth'

/**
 * Landing pad for the OAuth round-trip (see EnsuredAPI src/routes/oauth.ts).
 *
 * The API redirects here with `#authToken=...` — the token rides in the URL
 * FRAGMENT so it never reaches server logs or Referer headers. This page
 * commits it to storage, scrubs it from the address bar (replace navigation),
 * and enters the workspace. With no token it bounces back to the signup form.
 */

const Splash = styled.main`
  min-height: 60vh;
  display: grid;
  place-items: center;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.md}px;
  padding: ${spacing.xl}px;
`

const SocialCallback: React.FC = () => {
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const token = params.get('authToken')
    if (token) {
      saveAuthToken(token)
      navigate('/marketplace', { replace: true })
      return
    }
    setFailed(true)
    navigate('/auth/register?error=oauth_failed', { replace: true })
  }, [navigate])

  return <Splash role="status">{failed ? 'Sign-in failed — returning you to registration…' : 'Finishing sign-in…'}</Splash>
}

export default SocialCallback
