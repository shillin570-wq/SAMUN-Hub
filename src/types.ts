export interface MeetingInfo {
  committee: string;
  topic: string;
  recorder: string;
}

export interface CountryRight {
  veto: boolean;
  observer: boolean;
}

export interface AgendaItem {
  id: number;
  level: 1 | 2;
  title: string;
  status: 'normal' | 'postponed' | 'ended';
}

export type MeetingLogType = 'roll-call' | 'agenda-change' | 'vote-result' | 'speech';

export interface MeetingLog {
  id: string;
  timestamp: number;
  type: MeetingLogType;
  title: string;
  detail: string;
}

export interface MeetingArchive {
  id: string;
  timestamp: number;
  meetingInfo: MeetingInfo;
  countries: string[];
  attendance: Record<string, boolean>;
  countryRights: Record<string, CountryRight>;
  agendaItems: AgendaItem[];
  meetingLogs?: MeetingLog[];
}

export type PageType =
  | 'entry'
  | 'meeting-create'
  | 'meeting-intro'
  | 'meeting'
  | 'roll-call'
  | 'agenda-arrangement'
  | 'voting'
  | 'meeting-records';
