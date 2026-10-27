export interface CommunityMeeting {
  example: boolean;
  title: string;
  schedule: string;
  platform: string;
  meetingNumber?: string;
  joinNote?: string;
  nextStartsAt?: string;
  nextLabel?: string;
  timeZone: string;
  agenda: string[];
  calendarUrl?: string;
  minutesUrl?: string;
  meetingUrl?: string;
}

interface EventCopy {
  id: string;
  title: string;
  speaker: string;
  summary: string;
  draft: boolean;
}
export interface PublishedEvent extends EventCopy {
  example: false;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  registrationUrl?: string;
  liveUrl?: string;
  replayUrl?: string;
  slidesUrl?: string;
}
export interface ExampleEvent extends EventCopy {
  example: true;
  preview: {
    status: 'live' | 'upcoming' | 'recorded';
    badge: string;
    dateLabel: string;
    actionLabel: string;
  };
}
export type CommunityEvent = PublishedEvent | ExampleEvent;
export interface CommunityIndex {
  meeting: CommunityMeeting | null;
  events: CommunityEvent[];
  generatedAt: string;
  preview: boolean;
}
