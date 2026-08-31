export const STATUS_VALUES = [
  'Applied',
  'Online Assessment',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
  'Ghosted',
  'N/A',
] as const;

export type Status = (typeof STATUS_VALUES)[number];

export const CLOSED_STATUSES: readonly Status[] = ['Rejected', 'Withdrawn', 'Ghosted'];

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  application_date: string; // 'YYYY-MM-DD'
  status: Status;
  dashboard_url: string | null;
  notes: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}
