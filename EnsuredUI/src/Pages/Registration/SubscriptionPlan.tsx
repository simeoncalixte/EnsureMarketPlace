import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import Card from '../../xds/components/Card'
import Badge from '../../xds/components/Badge'
import FormField from '../../xds/components/FormField'
import SegmentedSwitch from '../../xds/components/SegmentedSwitch'
import ValidationMessage from '../../xds/components/ValidationMessage'
import { Button } from '../../xds/components/Button'
import { PageTitle, PageSubtitle, SmallText, SectionSmallTitle } from '../../xds/components/Typography'
import { colors, withAlpha } from '../../xds/colors'
import { saveAuthToken } from '../../lib/auth'
import {
  BillingInterval,
  SubscriptionPlanDTO,
  checkoutSubscription,
  getSubscriptionPlans,
  resolveTestPaymentMethod,
} from '../../api/subscriptions'

const Wrapper = styled.main`
  min-height: 100vh;
  padding: 48px 32px;
  background: ${colors.surfaceDeep};
  color: ${colors.onSurfaceStrong};
`

const Layout = styled.div`
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 900px) {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: start;
  }
`

const PlanCard = styled(Card)`
  display: grid;
  gap: 16px;
`

const PayCard = styled(Card)`
  display: grid;
  gap: 18px;
`

const Header = styled.div`
  max-width: 960px;
  margin: 0 auto 24px;
`

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`

const Price = styled.span`
  font-size: 38px;
  font-weight: 700;
  color: ${colors.onSurfaceStrong};
`

const PriceCadence = styled.span`
  color: ${colors.onSurfaceVariant};
  font-size: 14px;
`

const FeatureList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
`

const FeatureItem = styled.li`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  color: ${colors.onSurfaceVariant};
  font-size: 14px;
  &::before {
    content: '✓';
    color: ${colors.primary};
    font-weight: 700;
  }
`

const CardGrid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr 1fr;
`

const FullRow = styled.div`
  grid-column: 1 / -1;
`

const TestHint = styled.div`
  background: ${withAlpha(colors.primary, 0.08)};
  border: 1px solid ${withAlpha(colors.primary, 0.25)};
  border-radius: 10px;
  padding: 10px 12px;
  color: ${colors.onSurfaceVariant};
  font-size: 12px;
  line-height: 1.5;
`

const SuccessPanel = styled(Card)`
  max-width: 640px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
  text-align: center;
`

type RoleKey = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin'

type RegistrationSession = {
  selectedRole?: RoleKey
  pendingAuthToken?: string
  backendUserId?: number
  subscriptionStatus?: string
  subscriptionPlanCode?: string
}

function readSession(): RegistrationSession {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem('registrationSession') ?? '{}') as RegistrationSession
  } catch {
    return {}
  }
}

function patchSession(patch: Partial<RegistrationSession>): void {
  if (typeof window === 'undefined') return
  const current = readSession()
  window.localStorage.setItem(
    'registrationSession',
    JSON.stringify({ ...current, ...patch, updatedAt: new Date().toISOString() }),
  )
}

export default function SubscriptionPlan() {
  const navigate = useNavigate()
  const session = useMemo(() => readSession(), [])
  const [plans, setPlans] = useState<SubscriptionPlanDTO[] | null>(null)
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState<{ planName: string; amountDisplay: string } | null>(null)

  useEffect(() => {
    let mounted = true
    getSubscriptionPlans()
      .then((res) => {
        if (mounted) setPlans(res.plans)
      })
      .catch(() => {
        if (mounted) setPlans([])
      })
    return () => {
      mounted = false
    }
  }, [])

  const plan = useMemo(() => {
    if (!plans) return undefined
    return plans.find((p) => p.role === session.selectedRole) ?? plans[0]
  }, [plans, session.selectedRole])

  const isFree = plan ? plan.pricing.monthly.amountCents === 0 : false
  const price = plan ? plan.pricing[interval] : null

  function enterMarketplace() {
    if (session.pendingAuthToken) {
      saveAuthToken(session.pendingAuthToken)
    }
    navigate('/', { replace: true })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!plan) return

    setFieldError('')
    setPaymentError('')

    let paymentMethodId: string | undefined
    if (!isFree) {
      if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim()) {
        setFieldError('Enter your card number, expiry, and CVC to continue.')
        return
      }
      const resolved = resolveTestPaymentMethod(cardNumber)
      if (!resolved) {
        setFieldError('Enter a valid test card number (e.g. 4242 4242 4242 4242).')
        return
      }
      paymentMethodId = resolved
    }

    if (!session.pendingAuthToken) {
      setPaymentError('Your registration session has expired. Please start registration again.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await checkoutSubscription(
        { planCode: plan.code, billingInterval: interval, paymentMethodId },
        session.pendingAuthToken,
      )
      patchSession({
        subscriptionStatus: result.subscription.status,
        subscriptionPlanCode: result.subscription.planCode,
      })
      setConfirmed({ planName: plan.name, amountDisplay: result.subscription.amountDisplay })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment could not be processed.'
      setPaymentError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <Wrapper>
        <SuccessPanel>
          <Badge variant="success">Subscription active</Badge>
          <PageTitle>Payment received</PageTitle>
          <PageSubtitle>
            Your {confirmed.planName} membership is active. {confirmed.amountDisplay}/
            {interval === 'annual' ? 'year' : 'month'} has been charged to your card. Welcome to Sovereign Re.
          </PageSubtitle>
          <div>
            <Button variant="primary" onClick={enterMarketplace}>
              Enter the marketplace
            </Button>
          </div>
        </SuccessPanel>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <Header>
        <Badge variant="primary">Step 5 · Membership</Badge>
        <PageTitle>Activate your membership</PageTitle>
        <PageSubtitle>
          Sovereign Re access is subscription-based. Confirm your plan and billing cadence, then enter a
          payment method to complete onboarding.
        </PageSubtitle>
      </Header>

      <Layout>
        <PlanCard aria-label="Selected plan">
          {!plan ? (
            <SmallText>Loading your plan…</SmallText>
          ) : (
            <>
              <div>
                <SectionSmallTitle>{plan.name}</SectionSmallTitle>
                <SmallText>{plan.tagline}</SmallText>
              </div>

              <SegmentedSwitch
                aria-label="Billing cadence"
                value={interval}
                onChange={(value: string) => setInterval(value as BillingInterval)}
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Annual (save ~17%)', value: 'annual' },
                ]}
              />

              <PriceRow>
                <Price>{price?.display}</Price>
                <PriceCadence>/{interval === 'annual' ? 'year' : 'month'}</PriceCadence>
              </PriceRow>

              <FeatureList>
                {plan.features.map((feature) => (
                  <FeatureItem key={feature}>{feature}</FeatureItem>
                ))}
              </FeatureList>
            </>
          )}
        </PlanCard>

        <PayCard aria-label="Payment details">
          <SectionSmallTitle>{isFree ? 'Confirm membership' : 'Payment details'}</SectionSmallTitle>
          <form onSubmit={handleSubmit} noValidate>
            {!isFree && (
              <>
                <CardGrid>
                  <FullRow>
                    <FormField
                      label="Name on card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Morgan Riskwell"
                      autoComplete="cc-name"
                    />
                  </FullRow>
                  <FullRow>
                    <FormField
                      label="Card number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      inputMode="numeric"
                      autoComplete="cc-number"
                    />
                  </FullRow>
                  <FormField
                    label="Expiry (MM/YY)"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="04/27"
                    autoComplete="cc-exp"
                  />
                  <FormField
                    label="CVC"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                  />
                </CardGrid>

                <TestHint>
                  Test mode — use Stripe test card <strong>4242 4242 4242 4242</strong> with any future expiry
                  and CVC. Card <strong>4000 0000 0000 0002</strong> simulates a decline.
                </TestHint>
              </>
            )}

            {fieldError && <ValidationMessage>{fieldError}</ValidationMessage>}
            {paymentError && <ValidationMessage>{paymentError}</ValidationMessage>}

            <div style={{ marginTop: 16 }}>
              <Button type="submit" variant="primary" disabled={isSubmitting || !plan}>
                {isSubmitting
                  ? 'Processing…'
                  : isFree
                    ? 'Activate membership'
                    : `Pay ${price?.display ?? ''} and activate membership`}
              </Button>
            </div>
          </form>
        </PayCard>
      </Layout>
    </Wrapper>
  )
}
