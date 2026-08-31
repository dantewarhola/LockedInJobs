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

export interface ApplicationEvent {
  id: string;
  application_id: string;
  user_id: string;
  from_status: Status | null;
  to_status: Status;
  changed_at: string; // ISO timestamp
}

export interface UserSettings {
  user_id: string;
  weekly_goal: number;
}

/** A status that represents an employer response to an application. */
export const RESPONSE_STATUSES: readonly Status[] = [
  'Online Assessment',
  'Interview',
  'Offer',
  'Rejected',
];

/** Stages whose dwell time we measure. Excludes terminal / non-progress states. */
export const TIMED_STAGES: readonly Status[] = [
  'Applied',
  'Online Assessment',
  'Interview',
  'Offer',
];

export const DEFAULT_WEEKLY_GOAL = 5;
