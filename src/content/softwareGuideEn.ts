import type { SoftwareGuideSection } from './softwareGuide';

export const softwareGuideSectionsEn: SoftwareGuideSection[] = [
  {
    title: '1. Quick start',
    items: [
      'After launch, open Meeting settings in the sidebar and fill committee, topic, recorder, and review the country list.',
      'Use New meeting for a fresh session, or Load save to continue a saved one.',
      'In New meeting you can batch-import countries or type them manually.',
      'When ready, open In session to run timers and the speakers list.',
    ],
  },
  {
    title: '2. Meeting tools',
    items: [
      'Roll call: toggle present / absent; counts feed into later majority calculations.',
      'Agenda: maintain level-1 and level-2 items; the session screen can select the active item.',
      'You can import a full agenda from text or edit it manually.',
      'Voting: record yes / no / abstain and observers; results are calculated automatically.',
      'Before voting, pick a rule (including custom rules), optional veto, and observers.',
    ],
  },
  {
    title: '3. In session',
    items: [
      'Discussion mode switches among Agenda, Unmoderated caucus, Debate, Topic, Moderated caucus, and Main speakers.',
      'In Agenda mode, pick an item or switch to caucus, debate, or file discussion.',
      'Timers support per-speaker and total time; pause, reset, and advance speakers anytime.',
      'Search countries in the speaker list, press Enter to add, click to remove non-active speakers.',
    ],
  },
  {
    title: '4. Meeting management',
    items: [
      'Before session: Settings → Roll call → Agenda.',
      'During session: control speeches and timers; use Voting for procedural and substantive votes.',
      'After session: Save progress to create a loadable archive.',
    ],
  },
  {
    title: '5. Data & saves',
    items: [
      'Save progress stores configuration, roster, agenda, and voting state.',
      'Load save restores a meeting; save manually at key moments.',
      'New meeting clears the current session — save first if you need it.',
    ],
  },
];
