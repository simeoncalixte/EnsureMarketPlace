export interface ProfileSummary {
  userId: number;
  firstName: string;
  lastName: string;
  role: string;
  headline: string | null;
  avatarUrl: string | null;
  organization: { id: number; name: string; type: string } | null;
}
