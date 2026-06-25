import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import styled from 'styled-components';
import { colors, withAlpha } from '../../xds/colors';
import { radii } from '../../xds/tokens';
import Avatar from '../../xds/components/Avatar';
import Badge from '../../xds/components/Badge';
import Button from '../../xds/components/Button';
import FormField from '../../xds/components/FormField';
import Textarea from '../../xds/components/Textarea';
import ConnectionButton from '../../xds/components/ConnectionButton';
import ProfileCard from '../../xds/components/ProfileCard';
import { useAuthMe } from '../../lib/useAuthMe';
import * as socialApi from '../../api/social';
import * as socialMessagesApi from '../../api/socialMessages';

const Page = styled.div`
  display: grid;
  gap: 24px;
  padding: 24px;
  max-width: 880px;
`;

const Header = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding: 24px;
  border-radius: ${radii.lg}px;
  background: ${colors.surfaceContainerHigh};
  border: 1px solid ${withAlpha(colors.neutral[400], 0.15)};
`;

const Identity = styled.div`
  flex: 1;
  display: grid;
  gap: 6px;
`;

const Name = styled.h1`
  margin: 0;
  font-size: 24px;
  color: ${colors.onSurface};
`;

const Headline = styled.div`
  font-size: 15px;
  color: ${colors.onSurfaceVariant};
`;

const MetaRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  color: ${colors.onSurface};
`;

const Bio = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: ${colors.onSurfaceVariant};
  white-space: pre-wrap;
`;

const EditForm = styled.div`
  display: grid;
  gap: 12px;
  max-width: 560px;
`;

const CoworkerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

export default function ProfilePage() {
  const { userId: userIdParam } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuthMe();
  const userId = Number(userIdParam);

  const [profile, setProfile] = useState<socialApi.SocialProfile | null>(null);
  const [coworkers, setCoworkers] = useState<socialApi.ProfileSummary[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ headline: '', bio: '', location: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(userId)) return;
    try {
      const [profileRes, coworkersRes] = await Promise.all([
        socialApi.getProfile(userId),
        socialApi.getCoworkers(userId),
      ]);
      setProfile(profileRes.profile);
      setCoworkers(coworkersRes.coworkers);
      setDraft({
        headline: profileRes.profile.headline ?? '',
        bio: profileRes.profile.bio ?? '',
        location: profileRes.profile.location ?? '',
      });
      setError(null);
    } catch {
      setError('Profile could not be loaded.');
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Page>{error}</Page>;
  if (!profile) return <Page>Loading profile…</Page>;

  const isSelf = profile.connectionStatus === 'self' || viewer?.id === profile.userId;
  const fullName = `${profile.firstName} ${profile.lastName}`;

  const saveProfile = async () => {
    setBusy(true);
    try {
      await socialApi.updateMyProfile(draft);
      setEditing(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    setBusy(true);
    try {
      await socialApi.requestConnection(profile.userId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const respond = async (accept: boolean) => {
    if (!profile.connectionId) return;
    setBusy(true);
    try {
      if (accept) await socialApi.acceptConnection(profile.connectionId);
      else await socialApi.declineConnection(profile.connectionId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!profile.connectionId) return;
    setBusy(true);
    try {
      await socialApi.removeConnection(profile.connectionId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const message = async () => {
    const res = await socialMessagesApi.openConversation(profile.userId);
    navigate(`/messages/${res.conversation.id}`);
  };

  return (
    <Page>
      <Header>
        <Avatar name={fullName} src={profile.avatarUrl} size="lg" />
        <Identity>
          <Name>{fullName}</Name>
          {profile.headline && <Headline>{profile.headline}</Headline>}
          <MetaRow>
            {profile.organization && <Badge variant="info">{profile.organization.name}</Badge>}
            <Badge variant="neutral">{profile.role}</Badge>
            {profile.location && <span>{profile.location}</span>}
            <span>{profile.connectionCount} connection{profile.connectionCount === 1 ? '' : 's'}</span>
          </MetaRow>
        </Identity>
        <Actions>
          {isSelf ? (
            <Button variant="secondary" onClick={() => setEditing((current) => !current)}>
              {editing ? 'Cancel' : 'Edit profile'}
            </Button>
          ) : (
            <>
              <ConnectionButton
                status={profile.connectionStatus === 'self' ? 'self' : profile.connectionStatus}
                busy={busy}
                onConnect={() => void connect()}
                onAccept={() => void respond(true)}
                onDecline={() => void respond(false)}
                onRemove={() => void remove()}
              />
              {profile.connectionStatus === 'connected' && (
                <Button variant="primary" onClick={() => void message()}>Message</Button>
              )}
            </>
          )}
        </Actions>
      </Header>

      {editing && (
        <EditForm>
          <FormField
            label="Headline"
            value={draft.headline}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, headline: e.target.value })}
          />
          <FormField
            label="Location"
            value={draft.location}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, location: e.target.value })}
          />
          <div>
            <Textarea
              rows={4}
              placeholder="Tell the market who you are…"
              value={draft.bio}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft({ ...draft, bio: e.target.value })}
            />
          </div>
          <div>
            <Button variant="primary" disabled={busy} onClick={() => void saveProfile()}>Save profile</Button>
          </div>
        </EditForm>
      )}

      {profile.bio && !editing && (
        <div>
          <SectionTitle>About</SectionTitle>
          <Bio>{profile.bio}</Bio>
        </div>
      )}

      <div>
        <SectionTitle>Coworkers at {profile.organization?.name ?? 'their organization'}</SectionTitle>
        {coworkers.length === 0 ? (
          <Bio>No coworkers listed.</Bio>
        ) : (
          <CoworkerGrid>
            {coworkers.map((coworker) => (
              <ProfileCard
                key={coworker.userId}
                name={`${coworker.firstName} ${coworker.lastName}`}
                headline={coworker.headline}
                organizationName={coworker.organization?.name ?? null}
                role={coworker.role}
                avatarUrl={coworker.avatarUrl}
                onClick={() => navigate(`/profile/${coworker.userId}`)}
              />
            ))}
          </CoworkerGrid>
        )}
      </div>
    </Page>
  );
}
