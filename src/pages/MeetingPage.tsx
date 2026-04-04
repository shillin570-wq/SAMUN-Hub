import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { useLanguage } from '../context/LanguageContext';
import { Play, Pause, RotateCcw, SkipForward, UserRoundPlus, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { pinyin } from 'pinyin-pro';

const MEETING_PAGE_STATE_KEY = 'samun_meeting_page_state_v1';
const MEETING_PAGE_PERSIST_THROTTLE_MS = 3000;
const COUNTRY_SEARCH_ALIASES: Record<string, string[]> = {
  中华人民共和国: ['中国', 'china', 'prc', 'zhongguo', 'zg'],
  美利坚合众国: ['美国', 'unitedstates', 'usa', 'us', 'meiguo', 'mg'],
  大不列颠及北爱尔兰联合王国: ['英国', 'unitedkingdom', 'uk', 'britain', 'yingguo', 'yg'],
  法兰西共和国: ['法国', 'france', 'faguo', 'fg'],
  俄罗斯联邦: ['俄罗斯', 'russia', 'eluosi', 'els'],
  阿尔及利亚民主人民共和国: ['阿尔及利亚', 'algeria', 'aejly', 'aejlymzrmghg'],
  丹麦王国: ['丹麦', 'denmark', 'danmai', 'dm'],
  希腊共和国: ['希腊', 'greece', 'xila', 'xl'],
  圭亚那合作共和国: ['圭亚那', 'guyana', 'guiyana', 'gyn'],
  巴基斯坦伊斯兰共和国: ['巴基斯坦', 'pakistan', 'bajisitan', 'bjst'],
  巴拿马共和国: ['巴拿马', 'panama', 'banama', 'bnm'],
  大韩民国: ['韩国', 'southkorea', 'korea', 'hanguo', 'hg'],
  塞拉利昂共和国: ['塞拉利昂', 'sierraleone', 'sailaliang', 'sll'],
  斯洛文尼亚共和国: ['斯洛文尼亚', 'slovenia', 'siluowyniya', 'slwny'],
  索马里联邦共和国: ['索马里', 'somalia', 'suomali', 'sml'],
};

interface PersistedMeetingPageState {
  meetingSignature: string;
  speakerListsBySection: Record<string, string[]>;
  speakers?: string[];
  timerStatesBySection?: Record<string, TimerSectionState>;
  timeLeft?: number;
  totalElapsed?: number;
  totalDurationInput?: string;
  totalCountdownSeconds?: number | null;
  showTotalTimer?: boolean;
  customTime?: string;
  discussionMode: 'agenda' | 'consultation' | 'debate' | 'file' | 'moderated-caucus' | 'main-speaker-list';
  selectedAgendaId: string;
  discussionFileName: string;
  moderatedCaucusTopic: string;
  isSoundEnabled?: boolean;
}

type DiscussionMode = 'agenda' | 'consultation' | 'debate' | 'file' | 'moderated-caucus' | 'main-speaker-list';

/** 自由磋商 / 自由辩论：仅总时长倒计时，无单位发言时长 */
const isConsultationOrDebateTotalOnly = (mode: DiscussionMode) =>
  mode === 'consultation' || mode === 'debate';

type TimerTheme = {
  chipActive: string;
  chipInactive: string;
  panelWrap: string;
  panelInner: string;
  digits: string;
  digitsZero: string;
  status: string;
  playGo: string;
  pause: string;
  ctrl: string;
};

const TIMER_MODE_THEME: Record<DiscussionMode, TimerTheme> = {
  agenda: {
    chipActive: 'bg-slate-900 text-white shadow-sm',
    chipInactive: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100',
    panelWrap: 'border-slate-100/80',
    panelInner: 'bg-slate-50/70',
    digits: 'text-slate-900',
    digitsZero: 'text-red-500',
    status: 'text-slate-500',
    playGo: 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200',
    pause: 'bg-amber-100 text-amber-600 hover:bg-amber-200',
    ctrl: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
  },
  consultation: {
    chipActive: 'bg-amber-600 text-white shadow-sm',
    chipInactive: 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:border-amber-200',
    panelWrap: 'border-amber-100/90',
    panelInner: 'bg-amber-50/50',
    digits: 'text-amber-950',
    digitsZero: 'text-red-500',
    status: 'text-amber-900',
    playGo: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    pause: 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200',
    ctrl: 'bg-amber-100/80 text-amber-950 hover:bg-amber-200',
  },
  debate: {
    chipActive: 'bg-rose-600 text-white shadow-sm',
    chipInactive: 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50 hover:border-rose-200',
    panelWrap: 'border-rose-100/90',
    panelInner: 'bg-rose-50/50',
    digits: 'text-rose-950',
    digitsZero: 'text-red-600',
    status: 'text-rose-800',
    playGo: 'bg-rose-100 text-rose-700 hover:bg-rose-200',
    pause: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    ctrl: 'bg-rose-100/80 text-rose-900 hover:bg-rose-200',
  },
  file: {
    chipActive: 'bg-violet-600 text-white shadow-sm',
    chipInactive: 'bg-white text-slate-600 border border-slate-200 hover:bg-violet-50 hover:border-violet-200',
    panelWrap: 'border-violet-100/90',
    panelInner: 'bg-violet-50/50',
    digits: 'text-violet-950',
    digitsZero: 'text-red-500',
    status: 'text-violet-800',
    playGo: 'bg-violet-100 text-violet-700 hover:bg-violet-200',
    pause: 'bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200',
    ctrl: 'bg-violet-100/80 text-violet-900 hover:bg-violet-200',
  },
  'moderated-caucus': {
    chipActive: 'bg-sky-600 text-white shadow-sm',
    chipInactive: 'bg-white text-slate-600 border border-slate-200 hover:bg-sky-50 hover:border-sky-200',
    panelWrap: 'border-sky-100/90',
    panelInner: 'bg-sky-50/50',
    digits: 'text-sky-950',
    digitsZero: 'text-red-500',
    status: 'text-sky-700',
    playGo: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
    pause: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
    ctrl: 'bg-sky-100/80 text-sky-800 hover:bg-sky-200',
  },
  'main-speaker-list': {
    chipActive: 'bg-emerald-700 text-white shadow-sm',
    chipInactive: 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200',
    panelWrap: 'border-emerald-100/90',
    panelInner: 'bg-emerald-50/50',
    digits: 'text-emerald-950',
    digitsZero: 'text-red-500',
    status: 'text-emerald-900',
    playGo: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    pause: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
    ctrl: 'bg-emerald-100/80 text-emerald-900 hover:bg-emerald-200',
  },
};

interface TimerSectionState {
  timeLeft: number;
  totalElapsed: number;
  totalDurationInput: string;
  totalCountdownSeconds: number | null;
  showTotalTimer: boolean;
  customTime: string;
  isRunning: boolean;
}

const normalizeKeyword = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '').replace(/[\-_.]/g, '');

const sanitizeAgendaTitle = (title: string) =>
  title
    .replace(/^一级\s*[:：]\s*/i, '')
    .replace(/^二级\s*[:：]\s*/i, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*(?:\d+(?:[.．]\d+)*)(?:[)）.．、:：\s-]+)?/, '')
    .replace(/^\s*(?:第?[一二三四五六七八九十百零]+(?:项|条)?|[一二三四五六七八九十]+)(?:[)）.．、:：\s-]+)?/, '')
    .trim();

const getCountrySearchTokens = (country: string) => {
  const normalizedCountry = normalizeKeyword(country);
  const aliases = COUNTRY_SEARCH_ALIASES[country] ?? [];
  const normalizedAliases = aliases.map(normalizeKeyword);
  const countryPinyin = pinyin(country, { toneType: 'none' });
  const normalizedPinyin = normalizeKeyword(countryPinyin);
  const normalizedPinyinInitials = normalizeKeyword(
    countryPinyin
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join('')
  );
  return Array.from(
    new Set([normalizedCountry, ...normalizedAliases, normalizedPinyin, normalizedPinyinInitials].filter(Boolean))
  );
};

const getSectionKey = (mode: DiscussionMode, agendaId: string) => {
  if (mode === 'agenda') return `agenda:${agendaId || 'none'}`;
  return mode;
};

const getDefaultShowTotalTimer = (mode: DiscussionMode) =>
  mode === 'moderated-caucus' || mode === 'consultation' || mode === 'debate';

const CONSULTATION_DEFAULT_TOTAL_SEC = 30 * 60;
const DEBATE_DEFAULT_TOTAL_SEC = 10 * 60;

const sectionStorageKeyToMode = (key: string): DiscussionMode =>
  key.startsWith('agenda:') ? 'agenda' : (key as DiscussionMode);

const createDefaultTimerSectionState = (mode: DiscussionMode): TimerSectionState => {
  const showTotalTimer = getDefaultShowTotalTimer(mode);
  if (mode === 'consultation') {
    const sec = CONSULTATION_DEFAULT_TOTAL_SEC;
    return {
      timeLeft: sec,
      totalElapsed: 0,
      totalDurationInput: String(sec),
      totalCountdownSeconds: sec,
      showTotalTimer: true,
      customTime: '120',
      isRunning: false,
    };
  }
  if (mode === 'debate') {
    const sec = DEBATE_DEFAULT_TOTAL_SEC;
    return {
      timeLeft: sec,
      totalElapsed: 0,
      totalDurationInput: String(sec),
      totalCountdownSeconds: sec,
      showTotalTimer: true,
      customTime: '120',
      isRunning: false,
    };
  }
  return {
    timeLeft: 120,
    totalElapsed: 0,
    totalDurationInput: '',
    totalCountdownSeconds: null,
    showTotalTimer,
    customTime: '120',
    isRunning: false,
  };
};

const sanitizeTimerSectionState = (
  source: Partial<TimerSectionState> | undefined,
  fallbackShowTotalTimer: boolean,
  sectionKey?: string
): TimerSectionState => {
  const mode = sectionKey ? sectionStorageKeyToMode(sectionKey) : 'agenda';
  const defaults = createDefaultTimerSectionState(mode);
  const timeLeft = typeof source?.timeLeft === 'number' && source.timeLeft >= 0 ? source.timeLeft : defaults.timeLeft;
  const totalElapsed =
    typeof source?.totalElapsed === 'number' && source.totalElapsed >= 0 ? source.totalElapsed : defaults.totalElapsed;
  const totalDurationInput =
    typeof source?.totalDurationInput === 'string' ? source.totalDurationInput : defaults.totalDurationInput;
  const totalCountdownSeconds =
    typeof source?.totalCountdownSeconds === 'number' && source.totalCountdownSeconds >= 0
      ? source.totalCountdownSeconds
      : defaults.totalCountdownSeconds;
  const showTotalTimer = typeof source?.showTotalTimer === 'boolean' ? source.showTotalTimer : fallbackShowTotalTimer;
  const customTime = typeof source?.customTime === 'string' ? source.customTime : defaults.customTime;
  return {
    timeLeft,
    totalElapsed,
    totalDurationInput,
    totalCountdownSeconds,
    showTotalTimer,
    customTime,
    isRunning: false,
  };
};

export function MeetingPage() {
  const { meetingInfo, countries, attendance, agendaItems, addMeetingLog } = useMeeting();
  const { t, displayCountry } = useLanguage();
  const [speakerListsBySection, setSpeakerListsBySection] = useState<Record<string, string[]>>({});
  const [timerStatesBySection, setTimerStatesBySection] = useState<Record<string, TimerSectionState>>({});
  const [loggedSpeakerBySection, setLoggedSpeakerBySection] = useState<Record<string, string>>({});
  const [runStartTimeLeftBySection, setRunStartTimeLeftBySection] = useState<Record<string, number>>({});
  const [newSpeaker, setNewSpeaker] = useState('');
  const [isSpeakerSearchOpen, setIsSpeakerSearchOpen] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>('agenda');
  const [selectedAgendaId, setSelectedAgendaId] = useState<string>('');
  const [discussionFileName, setDiscussionFileName] = useState('');
  const [moderatedCaucusTopic, setModeratedCaucusTopic] = useState('');
  const [isAgendaSelectorCollapsed, setIsAgendaSelectorCollapsed] = useState(true);
  const [collapsedAgendaGroupIds, setCollapsedAgendaGroupIds] = useState<string[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isStateHydrated, setIsStateHydrated] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousTimeLeftBySectionRef = useRef<Record<string, number>>({});
  const previousTotalCountdownBySectionRef = useRef<Record<string, number | null>>({});
  const lastPersistAtRef = useRef(0);
  const meetingSignature = useMemo(
    () => [meetingInfo.committee, meetingInfo.topic, meetingInfo.recorder].join('||'),
    [meetingInfo.committee, meetingInfo.topic, meetingInfo.recorder]
  );

  const presentCount = countries.filter((country) => attendance[country]).length;
  const absoluteMajority = Math.ceil(presentCount * 2 / 3);
  const simpleMajority = Math.floor(presentCount / 2) + 1;
  const currentSectionKey = useMemo(
    () => getSectionKey(discussionMode, selectedAgendaId),
    [discussionMode, selectedAgendaId]
  );
  const speakers = useMemo(
    () => speakerListsBySection[currentSectionKey] ?? [],
    [speakerListsBySection, currentSectionKey]
  );
  const currentTimerState = useMemo(
    () =>
      timerStatesBySection[currentSectionKey] ??
      createDefaultTimerSectionState(discussionMode),
    [timerStatesBySection, currentSectionKey, discussionMode]
  );
  const { timeLeft, totalElapsed, totalDurationInput, totalCountdownSeconds, showTotalTimer, customTime, isRunning } =
    currentTimerState;
  const timerTheme = TIMER_MODE_THEME[discussionMode];
  const totalOnlyMode = isConsultationOrDebateTotalOnly(discussionMode);
  const displayMainSeconds = totalOnlyMode ? (totalCountdownSeconds ?? 0) : timeLeft;
  const currentSpeaker = useMemo(() => speakers[0], [speakers]);
  const speakerSet = useMemo(() => new Set(speakers), [speakers]);
  const collapsedAgendaGroupIdSet = useMemo(() => new Set(collapsedAgendaGroupIds), [collapsedAgendaGroupIds]);
  const selectedAgenda = useMemo(
    () => agendaItems.find((item) => String(item.id) === selectedAgendaId),
    [agendaItems, selectedAgendaId]
  );
  const agendaNumberMap = useMemo(() => {
    let levelOneCounter = 0;
    let levelTwoCounter = 0;
    return agendaItems.reduce<Record<number, string>>((acc, item) => {
      if (item.level === 1) {
        levelOneCounter += 1;
        levelTwoCounter = 0;
        acc[item.id] = `${levelOneCounter}`;
      } else {
        if (levelOneCounter === 0) levelOneCounter = 1;
        levelTwoCounter += 1;
        acc[item.id] = `${levelOneCounter}.${levelTwoCounter}`;
      }
      return acc;
    }, {});
  }, [agendaItems]);
  const agendaLevelOneChildCountMap = useMemo(() => {
    let currentLevelOneId: number | null = null;
    return agendaItems.reduce<Record<number, number>>((acc, item) => {
      if (item.level === 1) {
        currentLevelOneId = item.id;
        acc[item.id] = acc[item.id] ?? 0;
      } else if (currentLevelOneId !== null) {
        acc[currentLevelOneId] = (acc[currentLevelOneId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [agendaItems]);
  const agendaListForDisplay = useMemo(() => {
    let currentLevelOneId: string | null = null;
    return agendaItems
      .map((item) => {
        if (item.level === 1) currentLevelOneId = String(item.id);
        const parentLevelOneId = item.level === 2 ? currentLevelOneId : null;
        const isHiddenByParent =
          item.level === 2 &&
          parentLevelOneId !== null &&
          collapsedAgendaGroupIdSet.has(parentLevelOneId);
        return { item, parentLevelOneId, isHiddenByParent };
      })
      .filter((row) => !row.isHiddenByParent);
  }, [agendaItems, collapsedAgendaGroupIdSet]);
  const getAgendaStatusText = (status: 'normal' | 'postponed' | 'ended') => {
    if (status === 'postponed') return t('meeting.agendaStatusPostponed');
    if (status === 'ended') return t('meeting.agendaStatusEnded');
    return t('meeting.agendaStatusNormal');
  };
  const currentDiscussion = useMemo(() => {
    if (discussionMode === 'consultation') return t('meeting.modeConsult');
    if (discussionMode === 'debate') return t('meeting.modeDebate');
    if (discussionMode === 'file')
      return discussionFileName.trim()
        ? `${t('meeting.discussFilePrefix')}${discussionFileName.trim()}`
        : `${t('meeting.discussFilePrefix')}${t('meeting.discussFileEmpty')}`;
    if (discussionMode === 'moderated-caucus') {
      return moderatedCaucusTopic.trim()
        ? `${t('meeting.modCaucusPrefix')}${moderatedCaucusTopic.trim()}`
        : `${t('meeting.modCaucusPrefix')}${t('meeting.modCaucusEmpty')}`;
    }
    if (discussionMode === 'main-speaker-list') return t('meeting.modeMainList');
    if (!selectedAgenda) return t('meeting.noAgendaPick');
    return `${agendaNumberMap[selectedAgenda.id] || ''} ${sanitizeAgendaTitle(selectedAgenda.title)}`.trim();
  }, [discussionMode, selectedAgenda, discussionFileName, moderatedCaucusTopic, agendaNumberMap, t]);
  const mainSpeakerCapacity = useMemo(() => {
    const unitSeconds = parseInt(customTime, 10);
    const safeUnitSeconds = Number.isNaN(unitSeconds) || unitSeconds <= 0 ? 120 : unitSeconds;
    const totalSeconds =
      typeof totalCountdownSeconds === 'number' && totalCountdownSeconds >= 0
        ? totalCountdownSeconds
        : parseInt(totalDurationInput, 10);
    if (Number.isNaN(totalSeconds) || totalSeconds <= 0) return null;
    return Math.floor(totalSeconds / safeUnitSeconds);
  }, [customTime, totalCountdownSeconds, totalDurationInput]);
  const countrySearchIndex = useMemo(() => {
    const index = new Map<string, string[]>();
    countries.forEach((country) => {
      index.set(country, getCountrySearchTokens(country));
    });
    return index;
  }, [countries]);

  const speakerSuggestions = useMemo(() => {
    const keyword = normalizeKeyword(newSpeaker.trim());
    return countries
      .filter((country) => !speakerSet.has(country))
      .filter((country) => {
        if (!keyword) return true;
        const searchTokens = countrySearchIndex.get(country) ?? [];
        return searchTokens.some((token) => token.includes(keyword));
      })
      .slice(0, 8);
  }, [countries, newSpeaker, speakerSet, countrySearchIndex]);

  const updateCurrentTimerState = (updater: (prev: TimerSectionState) => TimerSectionState) => {
    setTimerStatesBySection((prev) => {
      const base =
        prev[currentSectionKey] ?? createDefaultTimerSectionState(discussionMode);
      return {
        ...prev,
        [currentSectionKey]: updater(base),
      };
    });
  };

  /** 旧版持久化可能在磋商/辩论下关掉总时长；仅总时长模式下必须始终为 true */
  useEffect(() => {
    if (!isConsultationOrDebateTotalOnly(discussionMode)) return;
    setTimerStatesBySection((prev) => {
      const base =
        prev[currentSectionKey] ?? createDefaultTimerSectionState(discussionMode);
      if (base.showTotalTimer) return prev;
      return {
        ...prev,
        [currentSectionKey]: { ...base, showTotalTimer: true },
      };
    });
  }, [discussionMode, currentSectionKey]);

  useEffect(() => {
    if (!isSpeakerSearchOpen || speakerSuggestions.length === 0) {
      setHighlightedSuggestionIndex(-1);
      return;
    }
    setHighlightedSuggestionIndex((prev) => {
      if (prev < 0 || prev >= speakerSuggestions.length) return 0;
      return prev;
    });
  }, [isSpeakerSearchOpen, speakerSuggestions]);

  useEffect(() => {
    if (!isRunning) return;

    if (isConsultationOrDebateTotalOnly(discussionMode)) {
      if (totalCountdownSeconds === null || totalCountdownSeconds <= 0) return;
      const timer = window.setInterval(() => {
        setTimerStatesBySection((prev) => {
          const base =
            prev[currentSectionKey] ?? createDefaultTimerSectionState(discussionMode);
          if (!base.isRunning || base.totalCountdownSeconds === null || base.totalCountdownSeconds <= 0) {
            return prev;
          }
          const nextTotal = Math.max(base.totalCountdownSeconds - 1, 0);
          const stillRunning = nextTotal > 0;
          return {
            ...prev,
            [currentSectionKey]: {
              ...base,
              totalCountdownSeconds: nextTotal,
              timeLeft: nextTotal,
              totalElapsed: base.totalElapsed + 1,
              isRunning: stillRunning,
            },
          };
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    if (timeLeft <= 0) return;
    const timer = window.setInterval(() => {
      setTimerStatesBySection((prev) => {
        const base =
          prev[currentSectionKey] ?? createDefaultTimerSectionState(discussionMode);
        if (!base.isRunning || base.timeLeft <= 0) return prev;
        const nextTimeLeft = Math.max(base.timeLeft - 1, 0);
        const nextState: TimerSectionState = {
          ...base,
          timeLeft: nextTimeLeft,
        };
        if (base.showTotalTimer) {
          nextState.totalElapsed = base.totalElapsed + 1;
          nextState.totalCountdownSeconds =
            base.totalCountdownSeconds === null ? null : Math.max(base.totalCountdownSeconds - 1, 0);
        }
        if (nextState.timeLeft === 0 || (nextState.showTotalTimer && nextState.totalCountdownSeconds === 0)) {
          nextState.isRunning = false;
        }
        return {
          ...prev,
          [currentSectionKey]: nextState,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, totalCountdownSeconds, currentSectionKey, discussionMode]);

  useEffect(() => {
    const rawState = localStorage.getItem(MEETING_PAGE_STATE_KEY);
    if (!rawState) {
      setIsStateHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(rawState) as PersistedMeetingPageState;
      if (parsed.meetingSignature !== meetingSignature) return;
      const restoredDiscussionMode = parsed.discussionMode ?? 'agenda';
      const restoredSelectedAgendaId = typeof parsed.selectedAgendaId === 'string' ? parsed.selectedAgendaId : '';
      const legacySectionKey = getSectionKey(restoredDiscussionMode, restoredSelectedAgendaId);

      if (parsed.speakerListsBySection && typeof parsed.speakerListsBySection === 'object') {
        setSpeakerListsBySection(parsed.speakerListsBySection);
      } else {
        const legacySpeakers = Array.isArray(parsed.speakers) ? parsed.speakers : [];
        setSpeakerListsBySection(
          legacySpeakers.length > 0
            ? {
                'agenda:none': legacySpeakers,
              }
            : {}
        );
      }
      if (parsed.timerStatesBySection && typeof parsed.timerStatesBySection === 'object') {
        const nextTimerStates = Object.entries(parsed.timerStatesBySection).reduce<Record<string, TimerSectionState>>(
          (acc, [key, value]) => {
            const fallbackShowTotalTimer =
              key === 'moderated-caucus' || key === 'consultation' || key === 'debate';
            acc[key] = sanitizeTimerSectionState(value, fallbackShowTotalTimer, key);
            return acc;
          },
          {}
        );
        setTimerStatesBySection(nextTimerStates);
      } else {
        const legacyTimerState = sanitizeTimerSectionState(
          {
            timeLeft: parsed.timeLeft,
            totalElapsed: parsed.totalElapsed,
            totalDurationInput: parsed.totalDurationInput,
            totalCountdownSeconds: parsed.totalCountdownSeconds,
            showTotalTimer: parsed.showTotalTimer,
            customTime: parsed.customTime,
          },
          getDefaultShowTotalTimer(restoredDiscussionMode),
          legacySectionKey
        );
        setTimerStatesBySection({
          [legacySectionKey]: legacyTimerState,
        });
      }
      setDiscussionMode(restoredDiscussionMode);
      setSelectedAgendaId(restoredSelectedAgendaId);
      setDiscussionFileName(typeof parsed.discussionFileName === 'string' ? parsed.discussionFileName : '');
      setModeratedCaucusTopic(typeof parsed.moderatedCaucusTopic === 'string' ? parsed.moderatedCaucusTopic : '');
      if (typeof parsed.isSoundEnabled === 'boolean') {
        setIsSoundEnabled(parsed.isSoundEnabled);
      }
    } catch (error) {
      console.error('Failed to parse meeting page state', error);
    } finally {
      setIsStateHydrated(true);
    }
  }, [meetingSignature]);

  useEffect(() => {
    if (!isStateHydrated) return;
    const now = Date.now();
    if (isRunning && now - lastPersistAtRef.current < MEETING_PAGE_PERSIST_THROTTLE_MS) {
      return;
    }

    const stateToPersist: PersistedMeetingPageState = {
      meetingSignature,
      speakerListsBySection,
      timerStatesBySection,
      discussionMode,
      selectedAgendaId,
      discussionFileName,
      moderatedCaucusTopic,
      isSoundEnabled,
    };

    lastPersistAtRef.current = now;
    localStorage.setItem(MEETING_PAGE_STATE_KEY, JSON.stringify(stateToPersist));
  }, [
    meetingSignature,
    speakerListsBySection,
    timerStatesBySection,
    discussionMode,
    selectedAgendaId,
    discussionFileName,
    moderatedCaucusTopic,
    isSoundEnabled,
    isRunning,
    isStateHydrated,
  ]);

  useEffect(() => {
    return () => {
      if (!isStateHydrated) return;
      const stateToPersist: PersistedMeetingPageState = {
        meetingSignature,
        speakerListsBySection,
        timerStatesBySection,
        discussionMode,
        selectedAgendaId,
        discussionFileName,
        moderatedCaucusTopic,
        isSoundEnabled,
      };
      localStorage.setItem(MEETING_PAGE_STATE_KEY, JSON.stringify(stateToPersist));
    };
  }, [
    isStateHydrated,
    meetingSignature,
    speakerListsBySection,
    timerStatesBySection,
    discussionMode,
    selectedAgendaId,
    discussionFileName,
    moderatedCaucusTopic,
    isSoundEnabled,
  ]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatLongTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMainClock = (seconds: number) =>
    seconds >= 3600 ? formatLongTime(seconds) : formatTime(seconds);

  const handleAddSpeaker = (inputValue?: string) => {
    const value = (inputValue ?? newSpeaker).trim();
    if (!value || speakerSet.has(value)) return;
    if (discussionMode === 'moderated-caucus') {
      if (mainSpeakerCapacity === null) {
        alert(t('meeting.alertNeedTotal'));
        return;
      }
      if (mainSpeakerCapacity <= 0) {
        alert(t('meeting.alertCapacityZero'));
        return;
      }
      if (speakers.length >= mainSpeakerCapacity) {
        alert(t('meeting.alertCapacityMax', { n: mainSpeakerCapacity }));
        return;
      }
    }
    setSpeakerListsBySection((prev) => ({
      ...prev,
      [currentSectionKey]: [...(prev[currentSectionKey] ?? []), value],
    }));
    setNewSpeaker('');
    setIsSpeakerSearchOpen(false);
    setHighlightedSuggestionIndex(-1);
  };

  const handleSpeakerInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const suggestionCount = speakerSuggestions.length;
    const hasSuggestions = suggestionCount > 0;
    const currentIndex = highlightedSuggestionIndex < 0 ? 0 : highlightedSuggestionIndex;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      if (!hasSuggestions) return;
      e.preventDefault();
      setIsSpeakerSearchOpen(true);
      setHighlightedSuggestionIndex((currentIndex + 1) % suggestionCount);
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      if (!hasSuggestions) return;
      e.preventDefault();
      setIsSpeakerSearchOpen(true);
      setHighlightedSuggestionIndex((currentIndex - 1 + suggestionCount) % suggestionCount);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (hasSuggestions && isSpeakerSearchOpen) {
        const selected = speakerSuggestions[Math.max(0, highlightedSuggestionIndex)];
        if (selected) {
          handleAddSpeaker(selected);
          return;
        }
      }
      handleAddSpeaker();
      return;
    }

    if (e.key === 'Escape') {
      setIsSpeakerSearchOpen(false);
      setHighlightedSuggestionIndex(-1);
    }
  };

  const handleNextSpeaker = () => {
    if (speakers.length === 0) return;
    setSpeakerListsBySection((prev) => {
      const currentList = prev[currentSectionKey] ?? [];
      return {
        ...prev,
        [currentSectionKey]: currentList.slice(1),
      };
    });
    setLoggedSpeakerBySection((prev) => {
      const next = { ...prev };
      delete next[currentSectionKey];
      return next;
    });
    if (!isConsultationOrDebateTotalOnly(discussionMode)) {
      updateCurrentTimerState((prev) => ({
        ...prev,
        isRunning: false,
        timeLeft: parseInt(prev.customTime, 10) || 120,
      }));
    }
  };

  const handleSetTime = () => {
    const value = parseInt(customTime, 10);
    if (Number.isNaN(value) || value <= 0) return;
    updateCurrentTimerState((prev) => ({
      ...prev,
      isRunning: false,
      timeLeft: value,
      customTime: String(value),
    }));
  };

  const handleSetTotalDuration = () => {
    const value = parseInt(totalDurationInput, 10);
    if (Number.isNaN(value) || value <= 0) return;
    updateCurrentTimerState((prev) => ({
      ...prev,
      isRunning: false,
      totalCountdownSeconds: value,
      totalDurationInput: String(value),
    }));
  };

  const playTone = (frequency: number, durationSeconds: number, gainValue = 0.03) => {
    if (typeof window === 'undefined') return;
    if (!isSoundEnabled) return;
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }
    const context = audioContextRef.current;
    if (context.state === 'suspended') {
      void context.resume();
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + durationSeconds);
  };

  const playCountdownBeep = () => {
    playTone(920, 0.08, 0.025);
  };

  const playTimeUpBeep = () => {
    playTone(700, 0.12, 0.03);
    window.setTimeout(() => playTone(980, 0.18, 0.035), 120);
  };

  const handleToggleTimer = () => {
    if (totalOnlyMode) {
      if (totalCountdownSeconds === null || totalCountdownSeconds <= 0) return;
    } else if (showTotalTimer && totalCountdownSeconds === 0) {
      return;
    }
    if (isRunning) {
      if (discussionMode === 'consultation' || discussionMode === 'debate') {
        const startedAt = runStartTimeLeftBySection[currentSectionKey];
        const endTotal = totalCountdownSeconds ?? 0;
        const elapsedSeconds =
          typeof startedAt === 'number' ? Math.max(startedAt - endTotal, 0) : 0;
        const modeLabel =
          discussionMode === 'consultation' ? t('meeting.modeConsult') : t('meeting.modeDebate');
        const elapsedLabel =
          elapsedSeconds >= 3600 ? formatLongTime(elapsedSeconds) : formatTime(elapsedSeconds);
        addMeetingLog(
          'speech',
          `${t('meeting.logSpeechTitlePrefix')}${currentDiscussion}`,
          t('meeting.logTotalTime', { mode: modeLabel, time: elapsedLabel })
        );
      }
      updateCurrentTimerState((prev) => ({
        ...prev,
        isRunning: false,
      }));
      if (discussionMode === 'consultation' || discussionMode === 'debate') {
        setLoggedSpeakerBySection((prev) => {
          const next = { ...prev };
          delete next[currentSectionKey];
          return next;
        });
        setRunStartTimeLeftBySection((prev) => {
          const next = { ...prev };
          delete next[currentSectionKey];
          return next;
        });
      }
      return;
    }
    if (discussionMode === 'consultation' || discussionMode === 'debate') {
      setRunStartTimeLeftBySection((prev) => ({
        ...prev,
        [currentSectionKey]: totalCountdownSeconds ?? 0,
      }));
    }
    if (currentSpeaker && loggedSpeakerBySection[currentSectionKey] !== currentSpeaker) {
      addMeetingLog(
        'speech',
        `${t('meeting.logSpeechTitlePrefix')}${currentDiscussion}`,
        `${currentSpeaker}${t('meeting.logSpokeSuffix')}`
      );
      setLoggedSpeakerBySection((prev) => ({
        ...prev,
        [currentSectionKey]: currentSpeaker,
      }));
    }
    updateCurrentTimerState((prev) => ({
      ...prev,
      isRunning: true,
    }));
  };

  useEffect(() => {
    const previousTimeLeft = previousTimeLeftBySectionRef.current[currentSectionKey];
    const previousTotalCountdown = previousTotalCountdownBySectionRef.current[currentSectionKey];

    const mainDisplay = totalOnlyMode ? (totalCountdownSeconds ?? 0) : timeLeft;
    const previousMain =
      totalOnlyMode && typeof previousTotalCountdown === 'number'
        ? previousTotalCountdown
        : previousTimeLeft;

    const hasMainChanged = typeof previousMain === 'number' && previousMain !== mainDisplay;
    const isCountdownTick = hasMainChanged && previousMain > mainDisplay;
    const mainReachedTenSeconds =
      typeof previousMain === 'number' && previousMain > 10 && mainDisplay === 10;
    const totalTimerReachedTenSeconds =
      !totalOnlyMode &&
      showTotalTimer &&
      typeof previousTotalCountdown === 'number' &&
      previousTotalCountdown > 10 &&
      totalCountdownSeconds === 10;
    if (isRunning && isCountdownTick && (mainReachedTenSeconds || totalTimerReachedTenSeconds)) {
      playCountdownBeep();
    }

    const mainEnded = typeof previousMain === 'number' && previousMain > 0 && mainDisplay === 0;
    const totalTimerEnded =
      !totalOnlyMode &&
      showTotalTimer &&
      typeof previousTotalCountdown === 'number' &&
      previousTotalCountdown > 0 &&
      totalCountdownSeconds === 0;
    if (mainEnded || totalTimerEnded) {
      playTimeUpBeep();
    }

    previousTimeLeftBySectionRef.current[currentSectionKey] = timeLeft;
    previousTotalCountdownBySectionRef.current[currentSectionKey] =
      typeof totalCountdownSeconds === 'number' ? totalCountdownSeconds : null;
  }, [
    currentSectionKey,
    isRunning,
    showTotalTimer,
    timeLeft,
    totalCountdownSeconds,
    isSoundEnabled,
    totalOnlyMode,
  ]);

  const toggleAgendaGroup = (levelOneId: string) => {
    setCollapsedAgendaGroupIds((prev) =>
      prev.includes(levelOneId) ? prev.filter((id) => id !== levelOneId) : [...prev, levelOneId]
    );
  };

  return (
    <div className="max-w-[76rem] mx-auto space-y-2 animate-in fade-in duration-500 pb-2">
      {/* 顶部简明会议信息 - Apple 纯白磨砂卡片感 */}
      <div className="bg-white rounded-[2rem] p-4 md:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div className="space-y-1.5">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
              {displayCountry(meetingInfo.committee) || t('common.committeeUnset')}
            </h1>
            <p className="text-lg text-slate-500 font-medium">
              {meetingInfo.topic || t('common.topicUnsetLong')}
            </p>
            <p className="text-base text-slate-700 font-medium">
              {t('meeting.discussing')}
              <span className="text-slate-900">{currentDiscussion}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2.5 border border-slate-100/80 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-semibold text-slate-600">
                {t('meeting.present')} {presentCount}
              </span>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2.5 border border-slate-100/80 shadow-sm">
              <span className="text-sm font-semibold text-slate-600">
                {t('meeting.absMajority')} {absoluteMajority}
              </span>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2.5 border border-slate-100/80 shadow-sm">
              <span className="text-sm font-semibold text-slate-600">
                {t('meeting.simpleMajority')} {simpleMajority}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-4 md:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* 合并后的计时与发言区 */}
          <div className="lg:col-span-7 flex flex-col min-h-[420px]">
            <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-700">{t('meeting.currentTopic')}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDiscussionMode('agenda')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    discussionMode === 'agenda'
                      ? TIMER_MODE_THEME.agenda.chipActive
                      : TIMER_MODE_THEME.agenda.chipInactive
                  )}
                >
                  {t('meeting.modeAgenda')}
                </button>
                <button
                  onClick={() => setDiscussionMode('consultation')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    discussionMode === 'consultation'
                      ? TIMER_MODE_THEME.consultation.chipActive
                      : TIMER_MODE_THEME.consultation.chipInactive
                  )}
                >
                  {t('meeting.modeConsult')}
                </button>
                <button
                  onClick={() => setDiscussionMode('debate')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    discussionMode === 'debate'
                      ? TIMER_MODE_THEME.debate.chipActive
                      : TIMER_MODE_THEME.debate.chipInactive
                  )}
                >
                  {t('meeting.modeDebate')}
                </button>
                <button
                  onClick={() => setDiscussionMode('file')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    discussionMode === 'file'
                      ? TIMER_MODE_THEME.file.chipActive
                      : TIMER_MODE_THEME.file.chipInactive
                  )}
                >
                  {t('meeting.modeFile')}
                </button>
                <button
                  onClick={() => setDiscussionMode('moderated-caucus')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    discussionMode === 'moderated-caucus'
                      ? TIMER_MODE_THEME['moderated-caucus'].chipActive
                      : TIMER_MODE_THEME['moderated-caucus'].chipInactive
                  )}
                >
                  {t('meeting.modeModCaucus')}
                </button>
                <button
                  onClick={() => setDiscussionMode('main-speaker-list')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    discussionMode === 'main-speaker-list'
                      ? TIMER_MODE_THEME['main-speaker-list'].chipActive
                      : TIMER_MODE_THEME['main-speaker-list'].chipInactive
                  )}
                >
                  {t('meeting.modeMainList')}
                </button>
              </div>
              {discussionMode === 'agenda' && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-slate-500">{t('meeting.pickAgenda')}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {agendaItems.length}
                        {t('meeting.agendaCount')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAgendaSelectorCollapsed((prev) => !prev)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                        title={isAgendaSelectorCollapsed ? t('meeting.expandAgenda') : t('meeting.collapseAgenda')}
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform duration-200',
                            isAgendaSelectorCollapsed ? '-rotate-90' : 'rotate-0'
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {isAgendaSelectorCollapsed ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                      {t('meeting.currentLabel')}
                      {selectedAgenda
                        ? `${agendaNumberMap[selectedAgenda.id] || ''} ${sanitizeAgendaTitle(selectedAgenda.title)}`.trim()
                        : t('meeting.noAgendaPick')}
                    </p>
                  ) : agendaItems.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
                      {t('meeting.noAgendaHint')}
                    </p>
                  ) : (
                    <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                      <button
                        type="button"
                        onClick={() => setSelectedAgendaId('')}
                        className={cn(
                          'w-full rounded-xl border px-3 py-2 text-left text-sm transition-all',
                          selectedAgendaId === ''
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                        )}
                      >
                        {t('meeting.noAgendaPick')}
                      </button>
                      {agendaListForDisplay.map(({ item }) => {
                        const itemId = String(item.id);
                        const isActive = selectedAgendaId === itemId;
                        const isLevelOne = item.level === 1;
                        const levelOneChildCount = agendaLevelOneChildCountMap[item.id] ?? 0;
                        const hasChildren = isLevelOne && levelOneChildCount > 0;
                        const isGroupCollapsed = collapsedAgendaGroupIdSet.has(itemId);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedAgendaId(itemId)}
                            className={cn(
                              'w-full rounded-xl border px-3 py-2 text-left transition-all',
                              !isLevelOne && 'ml-4 w-[calc(100%-1rem)]',
                              isActive
                                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={cn('truncate text-sm', isLevelOne ? 'font-semibold' : 'font-medium')}>
                                  {`${agendaNumberMap[item.id] || ''} ${sanitizeAgendaTitle(item.title)}`.trim()}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasChildren && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAgendaGroup(itemId);
                                    }}
                                    className={cn(
                                      'inline-flex h-5 w-5 items-center justify-center rounded-md transition-colors',
                                      isActive ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                                    )}
                                    title={isGroupCollapsed ? t('meeting.expandL2') : t('meeting.collapseL2')}
                                  >
                                    {isGroupCollapsed ? (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                )}
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                    isActive
                                      ? 'bg-white/15 text-slate-100'
                                      : 'bg-slate-100 text-slate-500'
                                  )}
                                >
                                  {getAgendaStatusText(item.status)}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {discussionMode === 'file' && (
                <input
                  type="text"
                  value={discussionFileName}
                  onChange={(e) => setDiscussionFileName(e.target.value)}
                  placeholder={t('meeting.phFileTopic')}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none"
                />
              )}
              {discussionMode === 'moderated-caucus' && (
                <input
                  type="text"
                  value={moderatedCaucusTopic}
                  onChange={(e) => setModeratedCaucusTopic(e.target.value)}
                  placeholder={t('meeting.phModTopic')}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none"
                />
              )}
            </div>

            <div className={cn('flex items-center gap-2 font-medium', timerTheme.status)}>
              <Clock className="w-5 h-5" />
              {totalOnlyMode
                ? totalCountdownSeconds === 0
                  ? t('meeting.timerTotalEnd')
                  : isRunning
                    ? t('meeting.timerRunning')
                    : t('meeting.timerReady')
                : showTotalTimer && totalCountdownSeconds === 0
                  ? t('meeting.timerTotalEnd')
                  : isRunning
                    ? t('meeting.timerRunning')
                    : timeLeft === 0
                      ? t('meeting.timerDone')
                      : t('meeting.timerReady')}
            </div>

            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center rounded-[2rem] border p-4 md:p-5 transition-colors duration-500',
                timerTheme.panelWrap,
                timerTheme.panelInner
              )}
            >
              <div
                className={cn(
                  'text-[7rem] md:text-[8.5rem] lg:text-[10rem] leading-none font-light tracking-tighter tabular-nums transition-colors duration-500 select-none',
                  displayMainSeconds === 0 ? timerTheme.digitsZero : timerTheme.digits
                )}
              >
                {formatMainClock(displayMainSeconds)}
              </div>
              {showTotalTimer && !totalOnlyMode && (
                <div className="mt-3 flex flex-col items-center">
                  <span className="text-xs font-semibold tracking-wider text-slate-400">{t('meeting.totalDuration')}</span>
                  <span
                    className={cn(
                      'mt-1 text-xl md:text-2xl font-medium tabular-nums',
                      totalCountdownSeconds === 0 ? 'text-red-500' : 'text-slate-500'
                    )}
                  >
                    {formatLongTime(totalCountdownSeconds === null ? totalElapsed : totalCountdownSeconds)}
                  </span>
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-5">
                <button
                  onClick={() => {
                    if (totalOnlyMode) {
                      const v = parseInt(totalDurationInput, 10);
                      if (!Number.isNaN(v) && v > 0) {
                        updateCurrentTimerState((prev) => ({
                          ...prev,
                          isRunning: false,
                          totalCountdownSeconds: v,
                          timeLeft: v,
                          totalDurationInput: String(v),
                        }));
                      } else {
                        updateCurrentTimerState((prev) => ({ ...prev, isRunning: false }));
                      }
                    } else {
                      updateCurrentTimerState((prev) => ({
                        ...prev,
                        isRunning: false,
                        timeLeft: parseInt(prev.customTime, 10) || 120,
                      }));
                    }
                  }}
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 outline-none',
                    timerTheme.ctrl
                  )}
                  title={t('meeting.resetTime')}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={handleToggleTimer}
                  className={cn(
                    'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 outline-none border-[5px] border-white',
                    isRunning ? timerTheme.pause : timerTheme.playGo
                  )}
                >
                  {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1.5" />}
                </button>

                <button
                  onClick={handleNextSpeaker}
                  disabled={!currentSpeaker}
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 outline-none',
                    timerTheme.ctrl
                  )}
                  title={t('meeting.nextSpeaker')}
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3 space-y-2.5">
              {!totalOnlyMode && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">{t('meeting.unitSeconds')}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customTime}
                      onChange={(e) =>
                        updateCurrentTimerState((prev) => ({
                          ...prev,
                          customTime: e.target.value,
                        }))
                      }
                      className="w-24 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2 text-center text-sm focus:ring-2 focus:ring-slate-300 outline-none font-medium text-slate-700 transition-all"
                      placeholder={t('meeting.phUnitSec')}
                    />
                    <button
                      onClick={handleSetTime}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1"
                    >
                      {t('common.apply')}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">{t('meeting.totalSecondsLabel')}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={totalDurationInput}
                    onChange={(e) =>
                      updateCurrentTimerState((prev) => ({
                        ...prev,
                        totalDurationInput: e.target.value,
                      }))
                    }
                    className="w-24 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2 text-center text-sm focus:ring-2 focus:ring-slate-300 outline-none font-medium text-slate-700 transition-all disabled:bg-slate-100"
                    placeholder={t('meeting.phTotalSec')}
                    disabled={!totalOnlyMode && !showTotalTimer}
                  />
                  <button
                    onClick={handleSetTotalDuration}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 disabled:opacity-40"
                    disabled={!totalOnlyMode && !showTotalTimer}
                  >
                    {t('common.apply')}
                  </button>
                  {!totalOnlyMode && (
                    <button
                      onClick={() =>
                        updateCurrentTimerState((prev) => ({
                          ...prev,
                          showTotalTimer: !prev.showTotalTimer,
                        }))
                      }
                      className="text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors px-2 py-1"
                    >
                      {showTotalTimer ? t('common.hide') : t('common.show')}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">{t('meeting.sound')}</p>
                <button
                  type="button"
                  onClick={() => setIsSoundEnabled((prev) => !prev)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                    isSoundEnabled
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {isSoundEnabled ? t('meeting.soundOn') : t('meeting.soundOff')}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col min-h-[420px] border-t border-slate-100 pt-3 lg:border-t-0 lg:border-l lg:pl-3 lg:pt-0 lg:border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 mb-2.5">{t('meeting.speakerList')}</h2>
            
            <div className="flex gap-2 mb-3.5">
              <div className="relative flex-1">
                <input
                  value={newSpeaker}
                  onChange={(e) => {
                    setNewSpeaker(e.target.value);
                    setIsSpeakerSearchOpen(true);
                  }}
                  onKeyDown={handleSpeakerInputKeyDown}
                  onFocus={() => setIsSpeakerSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setIsSpeakerSearchOpen(false), 120)}
                  placeholder={t('meeting.phAddCountry')}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-base focus:ring-2 focus:ring-slate-200 outline-none font-medium placeholder:text-slate-400 transition-all"
                />
                {isSpeakerSearchOpen && speakerSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {speakerSuggestions.map((country, idx) => (
                      <button
                        key={country}
                        type="button"
                        onMouseDown={() => handleAddSpeaker(country)}
                        onMouseEnter={() => setHighlightedSuggestionIndex(idx)}
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-sm transition-colors',
                          highlightedSuggestionIndex === idx
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        {displayCountry(country)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={handleAddSpeaker}
                className="bg-slate-900 text-white rounded-2xl px-5 flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 shadow-sm outline-none"
              >
                <UserRoundPlus className="w-5 h-5" />
              </button>
            </div>
            {discussionMode === 'moderated-caucus' && (
              <p className="mb-3 text-xs text-slate-500">
                {t('meeting.capacityHint', { cap: mainSpeakerCapacity ?? 0, cur: speakers.length })}
              </p>
            )}

            <div className="h-[32rem] overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
              {!currentSpeaker ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <UserRoundPlus className="w-12 h-12 mb-4 stroke-[1.5]" />
                  <p className="text-base font-medium">{t('meeting.emptyList')}</p>
                </div>
              ) : (
                speakers.map((speaker, idx) => (
                  <div
                    key={idx + speaker}
                    className={cn(
                      "group flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300",
                      idx === 0 
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 scale-[1.02] origin-left" 
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100/50"
                    )}
                  >
                    <span className={cn(
                      "font-semibold", 
                      idx === 0 ? "text-lg tracking-wide" : "text-base"
                    )}>
                      {displayCountry(speaker)}
                    </span>
                    {idx === 0 && (
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                        {t('meeting.speakingNow')}
                      </span>
                    )}
                    {idx !== 0 && (
                      <button 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1 outline-none"
                        onClick={() => {
                          const newArr = [...speakers];
                          newArr.splice(idx, 1);
                          setSpeakerListsBySection((prev) => ({
                            ...prev,
                            [currentSectionKey]: newArr,
                          }));
                        }}
                        title={t('meeting.removeFromList')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
