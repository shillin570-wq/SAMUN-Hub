import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Vote, CheckCircle2, XCircle, MinusCircle, ArrowRightCircle } from 'lucide-react';
import { cn } from '../lib/utils';

type VotePhase = 'setup' | 'voting' | 'result';
type VoteType = 'approve' | 'oppose' | 'abstain' | 'skip' | null;
type FinalVoteType = 'approve' | 'oppose' | 'abstain';
type RuleType = 'absolute' | 'simple' | 'custom';
type RatioBaseType = 'total' | 'casted' | 'decisive';
const VOTING_ROLL_CALL_KEY = 'samun_voting_roll_call_bridge_v1';

interface CustomRuleConfig {
  passRatio: string;
  passRatioBase: RatioBaseType;
  passRatioRoundUp: boolean;
  requireApproveGreaterThanOppose: boolean;
  allowSkipInFirstRound: boolean;
  enableVeto: boolean;
  abstainLimitEnabled: boolean;
  abstainLimitRatio: string;
}

interface VotingRollCallBridge {
  status: 'awaiting-roll-call' | 'ready-to-start';
  topic: string;
  rule: RuleType;
  customRule: CustomRuleConfig;
}

const RATIO_OPTIONS = ['1/2', '2/3', '3/4', '4/5'] as const;
const VotingResultCharts = lazy(() =>
  import('../components/charts/VotingResultCharts').then((m) => ({ default: m.VotingResultCharts }))
);
type VoteResults = {
  approve: number;
  oppose: number;
  abstain: number;
  total: number;
  valid: number;
  casted: number;
  passed: boolean;
  hasVeto: boolean;
  finalVotes: Record<string, FinalVoteType | null>;
};

const parseRatio = (ratio: string) => {
  const [numeratorRaw, denominatorRaw] = ratio.split('/');
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);
  if (!numerator || !denominator || numerator <= 0 || denominator <= 0) {
    return { numerator: 1, denominator: 2 };
  }
  return { numerator, denominator };
};

const normalizeRatio = (ratio: string) => ratio.replace(/\s+/g, '');

const isValidRatio = (ratio: string) => {
  const normalized = normalizeRatio(ratio);
  if (!/^\d+\/\d+$/.test(normalized)) return false;
  const [numeratorRaw, denominatorRaw] = normalized.split('/');
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);
  return numerator > 0 && denominator > 0 && numerator <= denominator;
};

const getRequiredVotesByRatio = (
  base: number,
  numerator: number,
  denominator: number,
  roundUp: boolean
) => {
  const rawRequired = (base * numerator) / denominator;
  if (roundUp) return Math.ceil(rawRequired);
  if (base <= 0) return 0;
  return Math.max(1, Math.floor(rawRequired));
};

export function VotingPage() {
  const { meetingInfo, countries, attendance, countryRights, setCountryRights, setCurrentPage, addMeetingLog } = useMeeting();
  const { t, locale, displayCountry, listJoiner } = useLanguage();

  const getPassBaseLabel = (base: RatioBaseType) =>
    base === 'total' ? t('vote.baseTotal') : base === 'casted' ? t('vote.baseCasted') : t('vote.baseDecisive');

  const logI18nRef = useRef({ t, displayCountry, listJoiner });
  logI18nRef.current = { t, displayCountry, listJoiner };
  
  const [phase, setPhase] = useState<VotePhase>('setup');
  const [topic, setTopic] = useState('');
  const [rule, setRule] = useState<RuleType>('absolute');
  const [showRightsConfig, setShowRightsConfig] = useState(false);
  const [customRule, setCustomRule] = useState<CustomRuleConfig>({
    passRatio: '2/3',
    passRatioBase: 'total',
    passRatioRoundUp: true,
    requireApproveGreaterThanOppose: false,
    allowSkipInFirstRound: true,
    enableVeto: true,
    abstainLimitEnabled: false,
    abstainLimitRatio: '1/2',
  });
  
  const [firstRoundVotes, setFirstRoundVotes] = useState<Record<string, VoteType>>({});
  const [secondRoundVotes, setSecondRoundVotes] = useState<Record<string, 'approve' | 'oppose' | null>>({});
  const [currentRound, setCurrentRound] = useState<1 | 2>(1);
  const [currentCountryIdx, setCurrentCountryIdx] = useState(0);
  const [showRollCallChoice, setShowRollCallChoice] = useState(false);

  const presentCountries = useMemo(
    () => countries.filter((country) => attendance[country]),
    [countries, attendance]
  );
  const votingCountries = useMemo(
    () => countries.filter((country) => attendance[country] && !countryRights[country]?.observer),
    [countries, attendance, countryRights]
  );
  const skippedCountries = useMemo(
    () => votingCountries.filter((country) => firstRoundVotes[country] === 'skip'),
    [votingCountries, firstRoundVotes]
  );
  const currentRoundCountries = useMemo(
    () => (currentRound === 1 ? votingCountries : skippedCountries),
    [currentRound, votingCountries, skippedCountries]
  );
  const overviewScrollRef = useRef<HTMLDivElement | null>(null);
  const hasLoggedResultRef = useRef(false);

  useEffect(() => {
    if (phase !== 'voting') return;
    const container = overviewScrollRef.current;
    if (!container) return;
    const currentCountryCard = container.querySelector('[data-current-vote="true"]') as HTMLElement | null;
    if (currentCountryCard) {
      currentCountryCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [phase, currentRound, currentCountryIdx, firstRoundVotes, secondRoundVotes]);

  useEffect(() => {
    const rawBridge = localStorage.getItem(VOTING_ROLL_CALL_KEY);
    if (!rawBridge) return;

    try {
      const bridge = JSON.parse(rawBridge) as VotingRollCallBridge;
      if (bridge.status !== 'ready-to-start') return;
      setTopic(bridge.topic);
      setRule(bridge.rule);
      setCustomRule(bridge.customRule);
      localStorage.removeItem(VOTING_ROLL_CALL_KEY);
      beginVotingSession();
    } catch (error) {
      console.error('Failed to parse voting roll call bridge data', error);
      localStorage.removeItem(VOTING_ROLL_CALL_KEY);
    }
  }, []);

  const validateVotingSetup = () => {
    if (!topic.trim()) {
      alert(t('vote.alertNoTopic'));
      return false;
    }
    if (rule === 'custom') {
      if (!isValidRatio(customRule.passRatio)) {
        alert(t('vote.alertBadRatio'));
        return false;
      }
      if (customRule.abstainLimitEnabled && !isValidRatio(customRule.abstainLimitRatio)) {
        alert(t('vote.alertBadAbstain'));
        return false;
      }
    }
    if (votingCountries.length === 0) {
      alert(t('vote.alertNoVoters'));
      return false;
    }
    return true;
  };

  const beginVotingSession = () => {
    const initialFirstRoundVotes: Record<string, VoteType> = {};
    votingCountries.forEach(c => { initialFirstRoundVotes[c] = null; });
    setFirstRoundVotes(initialFirstRoundVotes);
    setSecondRoundVotes({});
    setCurrentRound(1);
    setCurrentCountryIdx(0);
    setPhase('voting');
    hasLoggedResultRef.current = false;
  };

  const handleStartVoting = () => {
    if (!validateVotingSetup()) return;
    setShowRollCallChoice(true);
  };

  const handleStartVotingWithoutRollCall = () => {
    setShowRollCallChoice(false);
    beginVotingSession();
  };

  const handleStartVotingWithRollCall = () => {
    const bridge: VotingRollCallBridge = {
      status: 'awaiting-roll-call',
      topic,
      rule,
      customRule,
    };
    localStorage.setItem(VOTING_ROLL_CALL_KEY, JSON.stringify(bridge));
    setShowRollCallChoice(false);
    setCurrentPage('roll-call');
  };

  const castVote = (type: VoteType) => {
    if (currentCountryIdx < currentRoundCountries.length) {
      const country = currentRoundCountries[currentCountryIdx];

      if (currentRound === 1) {
        setFirstRoundVotes(prev => ({ ...prev, [country]: type }));
      } else {
        if (type !== 'approve' && type !== 'oppose') return;
        setSecondRoundVotes(prev => ({ ...prev, [country]: type }));
      }

      if (currentCountryIdx < currentRoundCountries.length - 1) {
        setCurrentCountryIdx(prev => prev + 1);
      } else if (currentRound === 1) {
        const nextFirstRoundVotes = {
          ...firstRoundVotes,
          [country]: type,
        };
        const nextSkippedCountries = votingCountries.filter(c => nextFirstRoundVotes[c] === 'skip');
        if (nextSkippedCountries.length > 0) {
          const initialSecondRoundVotes: Record<string, 'approve' | 'oppose' | null> = {};
          nextSkippedCountries.forEach(c => { initialSecondRoundVotes[c] = null; });
          setSecondRoundVotes(initialSecondRoundVotes);
          setCurrentRound(2);
          setCurrentCountryIdx(0);
        } else {
          setPhase('result');
        }
      } else {
        setPhase('result');
      }
    }
  };

  const results = useMemo<VoteResults>(() => {
    let approve = 0, oppose = 0, abstain = 0;
    let hasVeto = false;
    const finalVotes: Record<string, FinalVoteType | null> = {};

    votingCountries.forEach((country) => {
      const roundOneVote = firstRoundVotes[country];
      let finalVote: FinalVoteType | null = null;

      if (roundOneVote === 'approve' || roundOneVote === 'oppose' || roundOneVote === 'abstain') {
        finalVote = roundOneVote;
      } else if (roundOneVote === 'skip') {
        const roundTwoVote = secondRoundVotes[country];
        if (roundTwoVote === 'approve' || roundTwoVote === 'oppose') {
          finalVote = roundTwoVote;
        }
      }

      finalVotes[country] = finalVote;
    });

    Object.entries(finalVotes).forEach(([country, vote]) => {
      if (vote === 'approve') approve++;
      if (vote === 'oppose') {
        oppose++;
        if (countryRights[country]?.veto) hasVeto = true;
      }
      if (vote === 'abstain') abstain++;
    });

    const total = votingCountries.length;
    const valid = approve + oppose;
    const casted = approve + oppose + abstain;
    
    let passed = false;
    if (rule === 'absolute') {
      if (!hasVeto) {
        const required = Math.ceil((total - abstain) * 2 / 3);
        passed = approve >= required && abstain < Math.floor(total / 2) + 1;
      }
    } else if (rule === 'simple') {
      if (!hasVeto) {
        passed = approve > oppose;
      }
    } else {
      const { numerator: passNumerator, denominator: passDenominator } = parseRatio(normalizeRatio(customRule.passRatio));
      const passBase =
        customRule.passRatioBase === 'total'
          ? total
          : customRule.passRatioBase === 'casted'
            ? casted
            : valid;
      const requiredApprove = getRequiredVotesByRatio(
        passBase,
        passNumerator,
        passDenominator,
        customRule.passRatioRoundUp
      );

      const ratioPass = approve >= requiredApprove;
      const comparePass = customRule.requireApproveGreaterThanOppose ? approve > oppose : true;
      const vetoPass = customRule.enableVeto ? !hasVeto : true;

      let abstainPass = true;
      if (customRule.abstainLimitEnabled) {
        const { numerator: abstainNumerator, denominator: abstainDenominator } = parseRatio(normalizeRatio(customRule.abstainLimitRatio));
        const maxAbstain = Math.floor(total * abstainNumerator / abstainDenominator);
        abstainPass = abstain <= maxAbstain;
      }

      passed = ratioPass && comparePass && vetoPass && abstainPass;
    }

    return { approve, oppose, abstain, total, valid, casted, passed, hasVeto, finalVotes };
  }, [countryRights, customRule, firstRoundVotes, rule, secondRoundVotes, votingCountries]);

  useEffect(() => {
    if (phase !== 'result' || hasLoggedResultRef.current) return;
    hasLoggedResultRef.current = true;
    const { t: lt, displayCountry: dC, listJoiner: lj } = logI18nRef.current;
    const fmt = (clist: string[]) =>
      clist.length > 0 ? clist.map(dC).join(lj) : lt('common.none');
    const statusText = results.passed ? lt('vote.statusPassed') : lt('vote.statusFailed');
    const approveCountries = votingCountries.filter((country) => results.finalVotes[country] === 'approve');
    const opposeCountries = votingCountries.filter((country) => results.finalVotes[country] === 'oppose');
    const abstainCountries = votingCountries.filter((country) => results.finalVotes[country] === 'abstain');
    const uncastCountries = votingCountries.filter((country) => !results.finalVotes[country]);
    addMeetingLog(
      'vote-result',
      lt('vote.logTitle', { topic: topic.trim() || lt('common.noTopic') }),
      lt('vote.logDetail', {
        status: statusText,
        a: results.approve,
        o: results.oppose,
        ab: results.abstain,
        t: results.total,
        veto: results.hasVeto ? lt('vote.logVeto') : '',
        yesList: fmt(approveCountries),
        noList: fmt(opposeCountries),
        abList: fmt(abstainCountries),
        pending: fmt(uncastCountries),
      })
    );
  }, [phase, results, topic, addMeetingLog, votingCountries]);

  const getRuleDescription = (res: VoteResults) => {
    if (rule === 'absolute') return t('vote.ruleDescAbsolute');
    if (rule === 'simple') return t('vote.ruleDescSimple');

    const sep = locale === 'zh' ? '；' : '; ';
    const customRules: string[] = [];
    customRules.push(
      t('vote.customNeedApprove', {
        r: customRule.passRatio,
        b: getPassBaseLabel(customRule.passRatioBase),
      })
    );
    customRules.push(customRule.passRatioRoundUp ? t('vote.customRoundUp') : t('vote.customRoundDown'));
    if (customRule.requireApproveGreaterThanOppose) customRules.push(t('vote.customApproveGt'));
    customRules.push(customRule.allowSkipInFirstRound ? t('vote.customAllowSkip') : t('vote.customNoSkip'));
    customRules.push(customRule.enableVeto ? t('vote.customVetoOn') : t('vote.customVetoOff'));
    if (customRule.abstainLimitEnabled) {
      customRules.push(t('vote.customAbstainCap', { r: customRule.abstainLimitRatio }));
    }
    if (customRule.enableVeto && res.hasVeto) customRules.push(t('vote.customVetoTriggered'));
    const end = locale === 'zh' ? '。' : '.';
    return `${t('vote.ruleDescCustomPrefix')}${customRules.join(sep)}${end}`;
  };

  const handleToggleVeto = (country: string) => {
    setCountryRights((prev) => {
      const current = prev[country] || { veto: false, observer: false };
      if (current.observer) return prev;
      return {
        ...prev,
        [country]: {
          ...current,
          veto: !current.veto,
        },
      };
    });
  };

  const handleToggleObserver = (country: string) => {
    setCountryRights((prev) => {
      const current = prev[country] || { veto: false, observer: false };
      const nextObserver = !current.observer;
      return {
        ...prev,
        [country]: {
          veto: nextObserver ? false : current.veto,
          observer: nextObserver,
        },
      };
    });
  };

  const getCountryVoteStatus = (country: string) => {
    if (countryRights[country]?.observer) {
      return { label: t('vote.observerBadge'), tone: 'observer' as const };
    }

    if (currentRound === 1) {
      const vote = firstRoundVotes[country];
      if (vote === 'approve') return { label: t('vote.approve'), tone: 'approve' as const };
      if (vote === 'oppose') return { label: t('vote.oppose'), tone: 'oppose' as const };
      if (vote === 'abstain') return { label: t('vote.abstain'), tone: 'abstain' as const };
      if (vote === 'skip') return { label: t('vote.labelSkipRound'), tone: 'skip' as const };
      if (country === currentRoundCountries[currentCountryIdx])
        return { label: t('vote.labelCurrent'), tone: 'current' as const };
      return { label: t('vote.labelPending'), tone: 'pending' as const };
    }

    if (firstRoundVotes[country] === 'skip') {
      const second = secondRoundVotes[country];
      if (second === 'approve') return { label: t('vote.labelApproveR2'), tone: 'approve' as const };
      if (second === 'oppose') return { label: t('vote.labelOpposeR2'), tone: 'oppose' as const };
      if (country === currentRoundCountries[currentCountryIdx])
        return { label: t('vote.labelCurrentR2'), tone: 'current' as const };
      return { label: t('vote.labelPendingR2'), tone: 'pending' as const };
    }

    const first = firstRoundVotes[country];
    if (first === 'approve') return { label: t('vote.approve'), tone: 'approve' as const };
    if (first === 'oppose') return { label: t('vote.oppose'), tone: 'oppose' as const };
    if (first === 'abstain') return { label: t('vote.abstain'), tone: 'abstain' as const };
    return { label: t('vote.labelPending'), tone: 'pending' as const };
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="apple-panel border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-slate-700" />
            {t('vote.startTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t('vote.topicLabel')}</label>
            <Input 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={t('vote.topicPh')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t('vote.ruleLabel')}</label>
            <select 
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={rule}
              onChange={e => setRule(e.target.value as RuleType)}
            >
              <option value="absolute">{t('vote.ruleAbsolute')}</option>
              <option value="simple">{t('vote.ruleSimple')}</option>
              <option value="custom">{t('vote.ruleCustom')}</option>
            </select>
          </div>
          {rule === 'custom' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-slate-800">{t('vote.customTitle')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">{t('vote.passRatio')}</label>
                  <Input
                    value={customRule.passRatio}
                    placeholder={t('vote.passRatioPh')}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, passRatio: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-500">{t('vote.passRatioHint')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">{t('vote.ratioBase')}</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={customRule.passRatioBase}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, passRatioBase: e.target.value as RatioBaseType }))}
                  >
                    <option value="total">{t('vote.baseTotal')}</option>
                    <option value="casted">{t('vote.baseCasted')}</option>
                    <option value="decisive">{t('vote.baseDecisive')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.passRatioRoundUp}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, passRatioRoundUp: e.target.checked }))}
                  />
                  {t('vote.roundUp')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.requireApproveGreaterThanOppose}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, requireApproveGreaterThanOppose: e.target.checked }))}
                  />
                  {t('vote.tieFail')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.allowSkipInFirstRound}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, allowSkipInFirstRound: e.target.checked }))}
                  />
                  {t('vote.allowSkip')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.enableVeto}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, enableVeto: e.target.checked }))}
                  />
                  {t('vote.enableVeto')}
                </label>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.abstainLimitEnabled}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, abstainLimitEnabled: e.target.checked }))}
                  />
                  {t('vote.abstainLimit')}
                </label>
                {customRule.abstainLimitEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">{t('vote.abstainLimitLabel')}</label>
                      <select
                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={customRule.abstainLimitRatio}
                        onChange={(e) => setCustomRule((prev) => ({ ...prev, abstainLimitRatio: e.target.value }))}
                      >
                        {RATIO_OPTIONS.map((ratio) => (
                          <option key={ratio} value={ratio}>{ratio}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">{t('vote.rightsLabel')}</label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowRightsConfig(prev => !prev)}
              >
                {showRightsConfig ? t('common.collapse') : t('common.expand')}
              </Button>
            </div>
            <div className="text-xs text-slate-500">
              {t('vote.attendanceSummary', { p: presentCountries.length, v: votingCountries.length })}
            </div>
            {showRightsConfig && (
              <>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 custom-scrollbar">
                  {presentCountries.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4">{t('vote.noPresent')}</div>
                  ) : (
                    presentCountries.map((country) => {
                      const rights = countryRights[country] || { veto: false, observer: false };
                      return (
                        <div
                          key={country}
                          className={cn(
                            "border rounded-xl px-3 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between",
                            rights.observer
                              ? "bg-brand-50 border-brand-200"
                              : "bg-white border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{displayCountry(country)}</span>
                            {rights.observer && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-semibold">
                                {t('vote.observerBadge')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={rights.veto ? 'warning' : 'outline'}
                              onClick={() => handleToggleVeto(country)}
                              disabled={rights.observer}
                            >
                              {t('vote.vetoBtn')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={rights.observer ? 'danger' : 'outline'}
                              onClick={() => handleToggleObserver(country)}
                            >
                              {t('vote.observerBtn')}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {t('vote.rightsHint')}
                </p>
              </>
            )}
          </div>
          <Button className="w-full" size="lg" onClick={handleStartVoting}>
            {t('vote.startBtn')}
          </Button>
          {showRollCallChoice && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">{t('vote.rollCallAsk')}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleStartVotingWithRollCall}>
                  {t('vote.rollCallFirst')}
                </Button>
                <Button type="button" className="flex-1" onClick={handleStartVotingWithoutRollCall}>
                  {t('vote.startDirect')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderVoting = () => {
    const currentCountry = currentRoundCountries[currentCountryIdx];
    const isVeto = countryRights[currentCountry]?.veto;

    return (
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="apple-panel text-center space-y-2 p-6">
          <h2 className="text-2xl font-bold text-slate-900">{topic}</h2>
          <p className="text-sm font-medium text-slate-600">
            {currentRound === 1 ? t('vote.round1') : t('vote.round2')}
          </p>
          <p className="text-slate-500">
            {t('vote.progress')} {currentCountryIdx + 1} / {currentRoundCountries.length}
          </p>
        </div>

        <Card className="apple-panel border-0">
          <CardContent className="p-6 md:p-8">
            <div className="text-center space-y-8">
              <div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">{t('vote.currentCountry')}</div>
                <div className="text-4xl font-bold text-slate-900 flex items-center justify-center gap-3">
                  {currentCountry ? displayCountry(currentCountry) : ''}
                  {isVeto && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
                      {t('vote.vetoTag')}
                    </span>
                  )}
                </div>
              </div>

              {currentRound === 1 ? (
                <div
                  className={cn(
                    "gap-4 pt-8 grid",
                    rule === 'custom' && !customRule.allowSkipInFirstRound
                      ? "grid-cols-1 md:grid-cols-3"
                      : "grid-cols-2 md:grid-cols-4"
                  )}
                >
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => castVote('approve')}>
                    <CheckCircle2 className="w-6 h-6 mr-2" /> {t('vote.approve')}
                  </Button>
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-brand-600 hover:bg-brand-700" onClick={() => castVote('oppose')}>
                    <XCircle className="w-6 h-6 mr-2" /> {t('vote.oppose')}
                  </Button>
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-amber-500 hover:bg-amber-600" onClick={() => castVote('abstain')}>
                    <MinusCircle className="w-6 h-6 mr-2" /> {t('vote.abstain')}
                  </Button>
                  {(rule !== 'custom' || customRule.allowSkipInFirstRound) && (
                    <Button size="lg" className="h-20 text-lg rounded-2xl bg-slate-400 hover:bg-slate-500" onClick={() => castVote('skip')}>
                      <ArrowRightCircle className="w-6 h-6 mr-2" /> {t('vote.skip')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => castVote('approve')}>
                    <CheckCircle2 className="w-6 h-6 mr-2" /> {t('vote.approve')}
                  </Button>
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-brand-600 hover:bg-brand-700" onClick={() => castVote('oppose')}>
                    <XCircle className="w-6 h-6 mr-2" /> {t('vote.oppose')}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <CardTitle>{t('vote.overview')}</CardTitle>
              </div>
              <div ref={overviewScrollRef} className="max-h-[34vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {presentCountries.map((country) => {
                    const status = getCountryVoteStatus(country);
                    return (
                      <div
                        key={country}
                        data-current-vote={status.tone === 'current' ? 'true' : 'false'}
                        className={cn(
                          "rounded-xl border p-3 text-center",
                          status.tone === 'approve' && "bg-emerald-50 border-emerald-200",
                          status.tone === 'oppose' && "bg-brand-50 border-brand-200",
                          status.tone === 'abstain' && "bg-amber-50 border-amber-200",
                          status.tone === 'skip' && "bg-slate-100 border-slate-300",
                          status.tone === 'observer' && "bg-brand-50 border-brand-200",
                          status.tone === 'current' && "bg-blue-50 border-blue-200",
                          status.tone === 'pending' && "bg-white border-slate-200"
                        )}
                      >
                        <div className="text-sm font-medium text-slate-800 line-clamp-2">{displayCountry(country)}</div>
                        <div className={cn(
                          "mt-2 text-xs font-semibold",
                          status.tone === 'approve' && "text-emerald-700",
                          status.tone === 'oppose' && "text-brand-700",
                          status.tone === 'abstain' && "text-amber-700",
                          status.tone === 'skip' && "text-slate-700",
                          status.tone === 'observer' && "text-brand-700",
                          status.tone === 'current' && "text-blue-700",
                          status.tone === 'pending' && "text-slate-500"
                        )}>
                          {status.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderResult = () => {
    const res = results;
    const vetoApplied = rule === 'custom' ? customRule.enableVeto && res.hasVeto : res.hasVeto;
    const pieData = [
      { name: t('vote.approve'), value: res.approve, color: '#059669' },
      { name: t('vote.oppose'), value: res.oppose, color: '#e11d48' },
      { name: t('vote.abstain'), value: res.abstain, color: '#f59e0b' },
    ].filter((d) => d.value > 0);
    const barData = [
      { name: t('vote.approve'), value: res.approve },
      { name: t('vote.oppose'), value: res.oppose },
      { name: t('vote.abstain'), value: res.abstain },
    ];

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="apple-panel border-0 stage-entrance">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs tracking-[0.28em] uppercase text-slate-500">SAMUN · VOTING RESULT</p>
                <h2 className={cn(
                  "mt-2 text-4xl md:text-5xl font-semibold tracking-tight",
                  res.passed ? "text-emerald-700" : "text-brand-700"
                )}>
                  {res.passed ? t('vote.passed') : t('vote.failed')}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {vetoApplied ? t('vote.vetoed') : res.passed ? t('vote.passedDetail') : t('vote.failedDetail')}
                </p>
                <p className="mt-2 text-xs text-slate-500 max-w-2xl">
                  {getRuleDescription(res)}
                </p>
              </div>
              <div className="text-sm text-slate-600 leading-7">
                <p>{displayCountry(meetingInfo.committee) || t('common.committeeUnset')}</p>
                <p>{topic}</p>
                <p>
                  {t('vote.countSummary', { a: res.approve, o: res.oppose, ab: res.abstain, t: res.total })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Suspense fallback={<div className="h-[320px] rounded-2xl border border-slate-100 bg-white/70" />}>
          <VotingResultCharts pieData={pieData} barData={barData} passed={res.passed} />
        </Suspense>

        <Card className="apple-panel border-0 stage-entrance-delay">
          <CardHeader>
            <CardTitle className="text-base">{t('vote.finalBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {presentCountries.map((country) => {
                const isObserver = !!countryRights[country]?.observer;
                const vote = res.finalVotes[country];
                const label = isObserver
                  ? t('vote.observerBadge')
                  : vote === 'approve'
                    ? t('vote.approve')
                    : vote === 'oppose'
                      ? t('vote.oppose')
                      : vote === 'abstain'
                        ? t('vote.abstain')
                        : t('vote.notVoted');
                return (
                  <div
                    key={country}
                    className={cn(
                      "rounded-xl border px-3 py-2",
                      isObserver ? "bg-brand-50 border-brand-200" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="text-sm font-medium text-slate-800 line-clamp-2">{displayCountry(country)}</div>
                    <div className={cn(
                      "mt-1 text-xs font-semibold",
                      isObserver && "text-brand-700",
                      vote === 'approve' && "text-emerald-700",
                      vote === 'oppose' && "text-brand-700",
                      vote === 'abstain' && "text-amber-700",
                      !isObserver && !vote && "text-slate-500"
                    )}>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => setPhase('setup')} variant="secondary">
            {t('vote.restart')}
          </Button>
          <Button onClick={() => setCurrentPage('meeting')} variant="secondary">
            {t('vote.backMeeting')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300 pb-8">
      {phase === 'setup' && renderSetup()}
      {phase === 'voting' && renderVoting()}
      {phase === 'result' && renderResult()}
    </div>
  );
}
