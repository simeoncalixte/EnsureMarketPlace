import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { colors } from '../../xds/colors';
import Input from '../../xds/components/Input';
import IntegrationCard from '../../xds/components/IntegrationCard';
import * as socialMessagesApi from '../../api/socialMessages';

const Grid = styled.div`
  display: grid;
  gap: 16px;
  max-width: 640px;
`;

const Note = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`;

const PROVIDERS: Array<'whatsapp' | 'telegram'> = ['telegram', 'whatsapp'];

/**
 * "Messaging" settings block: connect WhatsApp or Telegram so direct messages
 * reach you (and your replies flow back) through that channel. Rendered inside
 * the insurer Settings page.
 */
export default function MessagingIntegrationsSection() {
  const [integrations, setIntegrations] = useState<socialMessagesApi.MessagingIntegration[]>([]);
  const [phone, setPhone] = useState('');
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await socialMessagesApi.listIntegrations();
    setIntegrations(res.integrations);
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const connect = async (provider: 'whatsapp' | 'telegram') => {
    setBusyProvider(provider);
    setError(null);
    try {
      await socialMessagesApi.connectIntegration({
        provider,
        ...(provider === 'whatsapp' ? { phoneE164: phone.trim() } : {}),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setBusyProvider(null);
    }
  };

  const disconnect = async (integrationId: number, provider: string) => {
    setBusyProvider(provider);
    try {
      await socialMessagesApi.disconnectIntegration(integrationId);
      await refresh();
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <Grid>
      <Note>
        Connect WhatsApp or Telegram to receive direct messages on your phone and reply from there. After
        connecting, send the verification code to the bot (Telegram) or our WhatsApp number to finish linking.
      </Note>
      {error && <Note role="alert">{error}</Note>}
      {PROVIDERS.map((provider) => {
        const integration = integrations.find((candidate) => candidate.provider === provider) ?? null;
        return (
          <IntegrationCard
            key={provider}
            provider={provider}
            verified={integration?.verified ?? false}
            simulated={integration?.simulated}
            verificationCode={integration?.verificationCode ?? null}
            displayName={integration?.display.username ?? integration?.display.phoneMasked ?? null}
            busy={busyProvider === provider}
            connectFields={
              provider === 'whatsapp' && !integration ? (
                <Input
                  placeholder="WhatsApp number, e.g. +15551234567"
                  value={phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                />
              ) : undefined
            }
            onConnect={() => void connect(provider)}
            onDisconnect={integration ? () => void disconnect(integration.id, provider) : undefined}
          />
        );
      })}
    </Grid>
  );
}
