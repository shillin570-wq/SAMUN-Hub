import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
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
  speakers: string[];
  timeLeft: number;
  totalElapsed: number;
  totalDurationInput: string;
  totalCountdownSeconds: number | null;
  showTotalTimer: boolean;
  customTime: string;
  discussionMode: 'agenda' | 'consultation' | 'debate' | 'file';
  selectedAgendaId: string;
  discussionFileName: string;
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

export function MeetingPage() {
  const { meetingInfo, countries, attendance, agendaItems, addMeetingLog } = useMeeting();
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [newSpeaker, setNewSpeaker] = useState('');
  const [isSpeakerSearchOpen, setIsSpeakerSearchOpen] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(120);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [totalDurationInput, setTotalDurationInput] = useState('');
  const [totalCountdownSeconds, setTotalCountdownSeconds] = useState<number | null>(null);
  const [showTotalTimer, setShowTotalTimer] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [customTime, setCustomTime] = useState('120');
  const [discussionMode, setDiscussionMode] = useState<'agenda' | 'consultation' | 'debate' | 'file'>('agenda');
  const [selectedAgendaId, setSelectedAgendaId] = useState<string>('');
  const [discussionFileName, setDiscussionFileName] = useState('');
  const [isAgendaSelectorCollapsed, setIsAgendaSelectorCollapsed] = useState(true);
  const [collapsedAgendaGroupIds, setCollapsedAgendaGroupIds] = useState<string[]>([]);
  const [isStateHydrated, setIsStateHydrated] = useState(false);
  const lastPersistAtRef = useRef(0);
  const meetingSignature = useMemo(
    () => [meetingInfo.committee, meetingInfo.topic, meetingInfo.recorder].join('||'),
    [meetingInfo.committee, meetingInfo.topic, meetingInfo.recorder]
  );

  const presentCount = countries.filter((country) => attendance[country]).length;
  const absoluteMajority = Math.ceil(presentCount * 2 / 3);
  const simpleMajority = Math.floor(presentCount / 2) + 1;
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
    if (status === 'postponed') return '延置';
    if (status === 'ended') return '结束';
    return '正常';
  };
  const currentDiscussion = useMemo(() => {
    if (discussionMode === 'consultation') return '自由磋商';
    if (discussionMode === 'debate') return '自由辩论';
    if (discussionMode === 'file') return discussionFileName.trim() ? `文件 - ${discussionFileName.trim()}` : '文件 - 未填写文件名';
    if (!selectedAgenda) return '未选择议程项';
    return `${agendaNumberMap[selectedAgenda.id] || ''} ${sanitizeAgendaTitle(selectedAgenda.title)}`.trim();
  }, [discussionMode, selectedAgenda, discussionFileName, agendaNumberMap]);
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
    if (!isRunning || timeLeft <= 0) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => prev - 1);
      if (showTotalTimer) {
        setTotalElapsed((prev) => prev + 1);
        setTotalCountdownSeconds((prev) => {
          if (prev === null) return null;
          return Math.max(prev - 1, 0);
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, showTotalTimer]);

  useEffect(() => {
    if (timeLeft === 0) setIsRunning(false);
  }, [timeLeft]);

  useEffect(() => {
    if (totalCountdownSeconds === 0) setIsRunning(false);
  }, [totalCountdownSeconds]);

  useEffect(() => {
    const rawState = localStorage.getItem(MEETING_PAGE_STATE_KEY);
    if (!rawState) {
      setIsStateHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(rawState) as PersistedMeetingPageState;
      if (parsed.meetingSignature !== meetingSignature) return;

      setSpeakers(Array.isArray(parsed.speakers) ? parsed.speakers : []);
      setTimeLeft(typeof parsed.timeLeft === 'number' && parsed.timeLeft >= 0 ? parsed.timeLeft : 120);
      setTotalElapsed(typeof parsed.totalElapsed === 'number' && parsed.totalElapsed >= 0 ? parsed.totalElapsed : 0);
      setTotalDurationInput(typeof parsed.totalDurationInput === 'string' ? parsed.totalDurationInput : '');
      setTotalCountdownSeconds(
        typeof parsed.totalCountdownSeconds === 'number' && parsed.totalCountdownSeconds >= 0
          ? parsed.totalCountdownSeconds
          : null
      );
      setShowTotalTimer(Boolean(parsed.showTotalTimer));
      setCustomTime(typeof parsed.customTime === 'string' ? parsed.customTime : '120');
      setDiscussionMode(parsed.discussionMode ?? 'agenda');
      setSelectedAgendaId(typeof parsed.selectedAgendaId === 'string' ? parsed.selectedAgendaId : '');
      setDiscussionFileName(typeof parsed.discussionFileName === 'string' ? parsed.discussionFileName : '');
      // 页面重新进入后默认暂停，避免后台计时导致状态跳变
      setIsRunning(false);
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
      speakers,
      timeLeft,
      totalElapsed,
      totalDurationInput,
      totalCountdownSeconds,
      showTotalTimer,
      customTime,
      discussionMode,
      selectedAgendaId,
      discussionFileName,
    };

    lastPersistAtRef.current = now;
    localStorage.setItem(MEETING_PAGE_STATE_KEY, JSON.stringify(stateToPersist));
  }, [
    meetingSignature,
    speakers,
    timeLeft,
    totalElapsed,
    totalDurationInput,
    totalCountdownSeconds,
    showTotalTimer,
    customTime,
    discussionMode,
    selectedAgendaId,
    discussionFileName,
    isRunning,
    isStateHydrated,
  ]);

  useEffect(() => {
    return () => {
      if (!isStateHydrated) return;
      const stateToPersist: PersistedMeetingPageState = {
        meetingSignature,
        speakers,
        timeLeft,
        totalElapsed,
        totalDurationInput,
        totalCountdownSeconds,
        showTotalTimer,
        customTime,
        discussionMode,
        selectedAgendaId,
        discussionFileName,
      };
      localStorage.setItem(MEETING_PAGE_STATE_KEY, JSON.stringify(stateToPersist));
    };
  }, [
    isStateHydrated,
    meetingSignature,
    speakers,
    timeLeft,
    totalElapsed,
    totalDurationInput,
    totalCountdownSeconds,
    showTotalTimer,
    customTime,
    discussionMode,
    selectedAgendaId,
    discussionFileName,
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

  const handleAddSpeaker = (inputValue?: string) => {
    const value = (inputValue ?? newSpeaker).trim();
    if (!value || speakerSet.has(value)) return;
    setSpeakers((prev) => [...prev, value]);
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
    const speaker = speakers[0];
    addMeetingLog(
      'speech',
      `发言议题：${currentDiscussion}`,
      `${speaker} 发言`
    );
    setSpeakers((prev) => prev.slice(1));
    setIsRunning(false);
    setTimeLeft(parseInt(customTime, 10) || 120);
  };

  const handleSetTime = () => {
    const value = parseInt(customTime, 10);
    if (Number.isNaN(value) || value <= 0) return;
    setIsRunning(false);
    setTimeLeft(value);
  };

  const handleSetTotalDuration = () => {
    const value = parseInt(totalDurationInput, 10);
    if (Number.isNaN(value) || value <= 0) return;
    setIsRunning(false);
    setTotalCountdownSeconds(value);
  };
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
              {meetingInfo.committee || '未设置委员会'}
            </h1>
            <p className="text-lg text-slate-500 font-medium">
              {meetingInfo.topic || '请在会议管理中补充会议议题'}
            </p>
            <p className="text-base text-slate-700 font-medium">
              正在讨论：<span className="text-slate-900">{currentDiscussion}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2.5 border border-slate-100/80 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-semibold text-slate-600">出席 {presentCount}</span>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2.5 border border-slate-100/80 shadow-sm">
              <span className="text-sm font-semibold text-slate-600">绝对多数 {absoluteMajority}</span>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2.5 border border-slate-100/80 shadow-sm">
              <span className="text-sm font-semibold text-slate-600">简单多数 {simpleMajority}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-4 md:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* 合并后的计时与发言区 */}
          <div className="lg:col-span-7 flex flex-col min-h-[420px]">
            <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-700">当前讨论内容</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDiscussionMode('agenda')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                    discussionMode === 'agenda'
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  议程单
                </button>
                <button
                  onClick={() => setDiscussionMode('consultation')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                    discussionMode === 'consultation'
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  自由磋商
                </button>
                <button
                  onClick={() => setDiscussionMode('debate')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                    discussionMode === 'debate'
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  自由辩论
                </button>
                <button
                  onClick={() => setDiscussionMode('file')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                    discussionMode === 'file'
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  文件
                </button>
              </div>
              {discussionMode === 'agenda' && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-slate-500">选择正在讨论的议程项</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{agendaItems.length} 项</span>
                      <button
                        type="button"
                        onClick={() => setIsAgendaSelectorCollapsed((prev) => !prev)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                        title={isAgendaSelectorCollapsed ? '展开议程列表' : '折叠议程列表'}
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
                      当前：{selectedAgenda ? `${agendaNumberMap[selectedAgenda.id] || ''} ${sanitizeAgendaTitle(selectedAgenda.title)}`.trim() : '未选择议程项'}
                    </p>
                  ) : agendaItems.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
                      暂无议程项，请先在议程编辑中添加
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
                        未选择议程项
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
                                    title={isGroupCollapsed ? '展开附属二级标题' : '折叠附属二级标题'}
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
                  placeholder="请输入要讨论的文件名"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none"
                />
              )}
            </div>

            <div className="text-slate-400 flex items-center gap-2 font-medium">
              <Clock className="w-5 h-5" />
              {showTotalTimer && totalCountdownSeconds === 0 ? '总时长到' : isRunning ? '正在计时' : timeLeft === 0 ? '时间到' : '准备就绪'}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={cn(
                "text-[7rem] md:text-[8.5rem] lg:text-[10rem] leading-none font-light tracking-tighter tabular-nums transition-colors duration-500 select-none",
                timeLeft === 0 ? "text-red-500" : "text-slate-900"
              )}>
                {formatTime(timeLeft)}
              </div>
              {showTotalTimer && (
                <div className="mt-3 flex flex-col items-center">
                  <span className="text-xs font-semibold tracking-wider text-slate-400">总时长</span>
                  <span className={cn(
                    "mt-1 text-xl md:text-2xl font-medium tabular-nums",
                    totalCountdownSeconds === 0 ? "text-red-500" : "text-slate-500"
                  )}>
                    {formatLongTime(totalCountdownSeconds === null ? totalElapsed : totalCountdownSeconds)}
                  </span>
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-5">
                <button
                  onClick={() => { setIsRunning(false); setTimeLeft(parseInt(customTime, 10) || 120); }}
                  className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center transition-all hover:bg-slate-200 active:scale-95 outline-none"
                  title="重置时间"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    if (totalCountdownSeconds === 0) return;
                    setIsRunning(!isRunning);
                  }}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md active:scale-95 outline-none border-[5px] border-white ring-1",
                    isRunning
                      ? "bg-amber-100 text-amber-600 hover:bg-amber-200 ring-amber-200"
                      : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 ring-emerald-200"
                  )}
                >
                  {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1.5" />}
                </button>

                <button
                  onClick={handleNextSpeaker}
                  disabled={!currentSpeaker}
                  className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 outline-none"
                  title="下一位发言"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">单位时长设置（秒）</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-24 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2 text-center text-sm focus:ring-2 focus:ring-slate-300 outline-none font-medium text-slate-700 transition-all"
                    placeholder="单位秒数"
                  />
                  <button
                    onClick={handleSetTime}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1"
                  >
                    应用
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">总时长设置（秒）</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={totalDurationInput}
                    onChange={(e) => setTotalDurationInput(e.target.value)}
                    className="w-24 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2 text-center text-sm focus:ring-2 focus:ring-slate-300 outline-none font-medium text-slate-700 transition-all disabled:bg-slate-100"
                    placeholder="总秒数"
                    disabled={!showTotalTimer}
                  />
                  <button
                    onClick={handleSetTotalDuration}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 disabled:opacity-40"
                    disabled={!showTotalTimer}
                  >
                    应用
                  </button>
                  <button
                    onClick={() => setShowTotalTimer((prev) => !prev)}
                    className="text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors px-2 py-1"
                  >
                    {showTotalTimer ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col min-h-[420px] border-t border-slate-100 pt-3 lg:border-t-0 lg:border-l lg:pl-3 lg:pt-0 lg:border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 mb-2.5">发言名单</h2>
            
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
                  placeholder="添加国家..."
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
                        {country}
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

            <div className="h-[32rem] overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
              {!currentSpeaker ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <UserRoundPlus className="w-12 h-12 mb-4 stroke-[1.5]" />
                  <p className="text-base font-medium">名单为空，请先添加</p>
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
                      {speaker}
                    </span>
                    {idx === 0 && (
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                        正在发言
                      </span>
                    )}
                    {idx !== 0 && (
                      <button 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1 outline-none"
                        onClick={() => {
                          const newArr = [...speakers];
                          newArr.splice(idx, 1);
                          setSpeakers(newArr);
                        }}
                        title="移出名单"
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
