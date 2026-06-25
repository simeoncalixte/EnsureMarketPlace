import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import styled from 'styled-components';
import { colors } from '../../xds/colors';
import SubNavigation from '../../xds/components/SubNavigation';
import Input from '../../xds/components/Input';
import Button from '../../xds/components/Button';
import ProfileCard from '../../xds/components/ProfileCard';
import ConnectionButton from '../../xds/components/ConnectionButton';
import { useAuthMe } from '../../lib/useAuthMe';
import * as socialApi from '../../api/social';
import * as socialMessagesApi from '../../api/socialMessages';

const Page = styled.div`
  display: grid;
  gap: 24px;
  padding: 24px;
  max-width: 1080px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  color: ${colors.onSurface};
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const SearchRow = styled.div`
  display: flex;
  gap: 12px;
  max-width: 480px;
`;

const EmptyState = styled.div`
  padding: 32px;
  text-align: center;
  color: ${colors.onSurfaceVariant};
  font-size: 14px;
`;

type TabId = 'connections' | 'invitations' | 'coworkers' | 'people';

const TABS = [
  { id: 'connections', label: 'My Connections' },
  { id: 'invitations', label: 'Invitations' },
  { id: 'coworkers', label: 'Coworkers' },
  { id: 'people', label: 'Find People' },
];

export default function NetworkPage() {
  const navigate = useNavigate();
  const { user } = useAuthMe();
  const [tab, setTab] = useState<TabId>('connections');
  const [connections, setConnections] = useState<socialApi.ConnectionListItem[]>([]);
  const [invitations, setInvitations] = useState<socialApi.ConnectionListItem[]>([]);
  const [coworkers, setCoworkers] = useState<socialApi.ProfileSummary[]>([]);
  const [people, setPeople] = useState<socialApi.ProfileSummary[]>([]);
  const [peopleCursor, setPeopleCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [accepted, pending] = await Promise.all([
      socialApi.listConnections('accepted'),
      socialApi.listConnections('pending_incoming'),
    ]);
    setConnections(accepted.connections);
    setInvitations(pending.connections);
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (tab === 'coworkers' && user?.id) {
      void socialApi.getCoworkers(user.id).then((res) => setCoworkers(res.coworkers)).catch(() => undefined);
    }
  }, [tab, user?.id]);

  const loadPeople = useCallback(async (cursor?: string | null) => {
    const res = await socialApi.searchPeople({ search, cursor: cursor ?? undefined });
    setPeople((prev) => (cursor ? [...prev, ...res.people] : res.people));
    setPeopleCursor(res.nextCursor);
  }, [search]);

  useEffect(() => {
    if (tab === 'people') void loadPeople().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleConnect = async (userId: number) => {
    setBusyId(userId);
    try {
      await socialApi.requestConnection(userId);
      await loadPeople();
    } finally {
      setBusyId(null);
    }
  };

  const respond = async (connectionId: number, accept: boolean) => {
    setBusyId(connectionId);
    try {
      if (accept) await socialApi.acceptConnection(connectionId);
      else await socialApi.declineConnection(connectionId);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const openProfile = (userId: number) => navigate(`/profile/${userId}`);

  const message = async (userId: number) => {
    const res = await socialMessagesApi.openConversation(userId);
    navigate(`/messages/${res.conversation.id}`);
  };

  const renderSummaryCard = (summary: socialApi.ProfileSummary, action: React.ReactNode) => (
    <ProfileCard
      key={summary.userId}
      name={`${summary.firstName} ${summary.lastName}`}
      headline={summary.headline}
      organizationName={summary.organization?.name ?? null}
      role={summary.role}
      avatarUrl={summary.avatarUrl}
      onClick={() => openProfile(summary.userId)}
      action={action}
    />
  );

  return (
    <Page>
      <PageTitle>Network</PageTitle>
      <SubNavigation
        label={null}
        tabs={TABS}
        activeId={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {tab === 'connections' && (
        <CardGrid>
          {connections.length === 0 && <EmptyState>No connections yet — find people in the directory.</EmptyState>}
          {connections.map((connection) =>
            renderSummaryCard(
              connection.user,
              <Button variant="secondary" onClick={(e: React.MouseEvent) => { e.stopPropagation(); void message(connection.user.userId); }}>
                Message
              </Button>,
            ),
          )}
        </CardGrid>
      )}

      {tab === 'invitations' && (
        <CardGrid>
          {invitations.length === 0 && <EmptyState>No pending invitations.</EmptyState>}
          {invitations.map((invitation) =>
            renderSummaryCard(
              invitation.user,
              <ConnectionButton
                status="pending_incoming"
                busy={busyId === invitation.id}
                onAccept={() => void respond(invitation.id, true)}
                onDecline={() => void respond(invitation.id, false)}
              />,
            ),
          )}
        </CardGrid>
      )}

      {tab === 'coworkers' && (
        <CardGrid>
          {coworkers.length === 0 && <EmptyState>No coworkers found in your organization.</EmptyState>}
          {coworkers.map((coworker) => renderSummaryCard(coworker, null))}
        </CardGrid>
      )}

      {tab === 'people' && (
        <>
          <SearchRow>
            <Input
              placeholder="Search people by name or email…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') void loadPeople();
              }}
            />
            <Button variant="primary" onClick={() => void loadPeople()}>Search</Button>
          </SearchRow>
          <CardGrid>
            {people.length === 0 && <EmptyState>No people match your search.</EmptyState>}
            {people.map((person) =>
              renderSummaryCard(
                person,
                <ConnectionButton
                  status="none"
                  busy={busyId === person.userId}
                  onConnect={() => void handleConnect(person.userId)}
                />,
              ),
            )}
          </CardGrid>
          {peopleCursor && (
            <Button variant="secondary" onClick={() => void loadPeople(peopleCursor)}>Load more</Button>
          )}
        </>
      )}
    </Page>
  );
}
