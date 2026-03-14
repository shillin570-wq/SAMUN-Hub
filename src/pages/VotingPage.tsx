import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
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

const getPassBaseLabel = (base: RatioBaseType) => {
  if (base === 'total') return '参与投票总数';
  if (base === 'casted') return '已投票总数(含弃权)';
  return '有效票(赞成+反对)';
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

const formatCountryList = (countries: string[]) => (countries.length > 0 ? countries.join('、') : '无');

export function VotingPage() {
  const { meetingInfo, countries, attendance, countryRights, setCountryRights, setCurrentPage, addMeetingLog } = useMeeting();
  
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

  const validateVotingSetup = () => {
    if (!topic.trim()) {
      alert('请输入投票主题');
      return false;
    }
    if (rule === 'custom') {
      if (!isValidRatio(customRule.passRatio)) {
        alert('通过比例格式无效，请输入“分子/分母”，且分子不大于分母（例如 2/3）。');
        return false;
      }
      if (customRule.abstainLimitEnabled && !isValidRatio(customRule.abstainLimitRatio)) {
        alert('弃权上限比例格式无效，请输入“分子/分母”（例如 1/2）。');
        return false;
      }
    }
    if (votingCountries.length === 0) {
      alert('当前没有可参与投票的国家，请检查观察员设置。');
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
    const statusText = results.passed ? '通过' : '未通过';
    const approveCountries = votingCountries.filter((country) => results.finalVotes[country] === 'approve');
    const opposeCountries = votingCountries.filter((country) => results.finalVotes[country] === 'oppose');
    const abstainCountries = votingCountries.filter((country) => results.finalVotes[country] === 'abstain');
    const uncastCountries = votingCountries.filter((country) => !results.finalVotes[country]);
    addMeetingLog(
      'vote-result',
      `投票结果：${topic || '未命名议题'}`,
      `结果${statusText}；赞成 ${results.approve}，反对 ${results.oppose}，弃权 ${results.abstain}，总计 ${results.total}${results.hasVeto ? '；触发一票否决' : ''}；赞成票：${formatCountryList(approveCountries)}；反对票：${formatCountryList(opposeCountries)}；弃权票：${formatCountryList(abstainCountries)}；未投票：${formatCountryList(uncastCountries)}`
    );
  }, [phase, results, topic, addMeetingLog]);

  const getRuleDescription = (res: VoteResults) => {
    if (rule === 'absolute') {
      return '绝对多数：需达到 2/3 赞成，且弃权不过半，同时不得触发一票否决。';
    }
    if (rule === 'simple') {
      return '简单多数：赞成票需多于反对票，同时不得触发一票否决。';
    }

    const customRules: string[] = [];
    customRules.push(`赞成票需达到 ${customRule.passRatio}（基数：${getPassBaseLabel(customRule.passRatioBase)}）`);
    customRules.push(customRule.passRatioRoundUp ? '通过票门槛按向上取整计算' : '通过票门槛按向下取整计算');
    if (customRule.requireApproveGreaterThanOppose) {
      customRules.push('赞成票需严格大于反对票');
    }
    customRules.push(customRule.allowSkipInFirstRound ? '允许第一轮跳过' : '不允许第一轮跳过');
    if (customRule.enableVeto) {
      customRules.push('启用一票否决');
    } else {
      customRules.push('不启用一票否决');
    }
    if (customRule.abstainLimitEnabled) {
      customRules.push(`弃权票不超过参与投票总数的 ${customRule.abstainLimitRatio}`);
    }
    if (customRule.enableVeto && res.hasVeto) {
      customRules.push('当前已触发一票否决');
    }
    return `自定义规则：${customRules.join('；')}。`;
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
      return { label: '观察员', tone: 'observer' as const };
    }

    if (currentRound === 1) {
      const vote = firstRoundVotes[country];
      if (vote === 'approve') return { label: '赞成', tone: 'approve' as const };
      if (vote === 'oppose') return { label: '反对', tone: 'oppose' as const };
      if (vote === 'abstain') return { label: '弃权', tone: 'abstain' as const };
      if (vote === 'skip') return { label: '待二轮', tone: 'skip' as const };
      if (country === currentRoundCountries[currentCountryIdx]) return { label: '当前待投', tone: 'current' as const };
      return { label: '待投票', tone: 'pending' as const };
    }

    if (firstRoundVotes[country] === 'skip') {
      const second = secondRoundVotes[country];
      if (second === 'approve') return { label: '赞成(二轮)', tone: 'approve' as const };
      if (second === 'oppose') return { label: '反对(二轮)', tone: 'oppose' as const };
      if (country === currentRoundCountries[currentCountryIdx]) return { label: '当前待投(二轮)', tone: 'current' as const };
      return { label: '待投票(二轮)', tone: 'pending' as const };
    }

    const first = firstRoundVotes[country];
    if (first === 'approve') return { label: '赞成', tone: 'approve' as const };
    if (first === 'oppose') return { label: '反对', tone: 'oppose' as const };
    if (first === 'abstain') return { label: '弃权', tone: 'abstain' as const };
    return { label: '待投票', tone: 'pending' as const };
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="apple-panel border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-slate-700" />
            发起投票
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">投票主题</label>
            <Input 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="例如：关于气候变化的决议案"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">投票规则</label>
            <select 
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={rule}
              onChange={e => setRule(e.target.value as RuleType)}
            >
              <option value="absolute">绝对多数 (2/3赞成，且弃权不过半)</option>
              <option value="simple">简单多数 (赞成&gt;反对)</option>
              <option value="custom">自定义规则（可视化配置）</option>
            </select>
          </div>
          {rule === 'custom' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-slate-800">自定义规则配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">通过比例</label>
                  <Input
                    value={customRule.passRatio}
                    placeholder="例如 2/3"
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, passRatio: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-500">支持手动输入分数格式，如 1/2、2/3、3/5。</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">比例基数</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={customRule.passRatioBase}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, passRatioBase: e.target.value as RatioBaseType }))}
                  >
                    <option value="total">参与投票总数</option>
                    <option value="casted">已投票总数（含弃权）</option>
                    <option value="decisive">有效票（赞成+反对）</option>
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
                  通过门槛向上取整
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.requireApproveGreaterThanOppose}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, requireApproveGreaterThanOppose: e.target.checked }))}
                  />
                  平票不通过
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.allowSkipInFirstRound}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, allowSkipInFirstRound: e.target.checked }))}
                  />
                  允许第一轮跳过
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.enableVeto}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, enableVeto: e.target.checked }))}
                  />
                  启用一票否决
                </label>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={customRule.abstainLimitEnabled}
                    onChange={(e) => setCustomRule((prev) => ({ ...prev, abstainLimitEnabled: e.target.checked }))}
                  />
                  限制弃权上限
                </label>
                {customRule.abstainLimitEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">弃权上限比例（按参与投票总数）</label>
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
              <label className="text-sm font-medium text-slate-700">国家权限设置</label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowRightsConfig(prev => !prev)}
              >
                {showRightsConfig ? '收起' : '展开'}
              </Button>
            </div>
            <div className="text-xs text-slate-500">
              出席 {presentCountries.length} / 参与投票 {votingCountries.length}
            </div>
            {showRightsConfig && (
              <>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 custom-scrollbar">
                  {presentCountries.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4">暂无出席国家，请先完成点名</div>
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
                            <span className="text-sm font-medium text-slate-800">{country}</span>
                            {rights.observer && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-semibold">观察员</span>
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
                              一票否决权
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={rights.observer ? 'danger' : 'outline'}
                              onClick={() => handleToggleObserver(country)}
                            >
                              观察员国
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  规则说明：拥有一票否决权的国家只要投反对票，投票即不通过；观察员国不参与投票。
                </p>
              </>
            )}
          </div>
          <Button className="w-full" size="lg" onClick={handleStartVoting}>
            开始投票
          </Button>
          {showRollCallChoice && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">发起投票前，是否重新点名？</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleStartVotingWithRollCall}>
                  先重新点名
                </Button>
                <Button type="button" className="flex-1" onClick={handleStartVotingWithoutRollCall}>
                  直接开始投票
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
            {currentRound === 1 ? '第一轮投票' : '第二轮投票（仅首轮跳过国家）'}
          </p>
          <p className="text-slate-500">
            进度: {currentCountryIdx + 1} / {currentRoundCountries.length}
          </p>
        </div>

        <Card className="apple-panel border-0">
          <CardContent className="p-6 md:p-8">
            <div className="text-center space-y-8">
              <div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">当前投票国</div>
                <div className="text-4xl font-bold text-slate-900 flex items-center justify-center gap-3">
                  {currentCountry}
                  {isVeto && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">一票否决权</span>}
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
                    <CheckCircle2 className="w-6 h-6 mr-2" /> 赞成
                  </Button>
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-brand-600 hover:bg-brand-700" onClick={() => castVote('oppose')}>
                    <XCircle className="w-6 h-6 mr-2" /> 反对
                  </Button>
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-amber-500 hover:bg-amber-600" onClick={() => castVote('abstain')}>
                    <MinusCircle className="w-6 h-6 mr-2" /> 弃权
                  </Button>
                  {(rule !== 'custom' || customRule.allowSkipInFirstRound) && (
                    <Button size="lg" className="h-20 text-lg rounded-2xl bg-slate-400 hover:bg-slate-500" onClick={() => castVote('skip')}>
                      <ArrowRightCircle className="w-6 h-6 mr-2" /> 跳过
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => castVote('approve')}>
                    <CheckCircle2 className="w-6 h-6 mr-2" /> 赞成
                  </Button>
                  <Button size="lg" className="h-20 text-lg rounded-2xl bg-brand-600 hover:bg-brand-700" onClick={() => castVote('oppose')}>
                    <XCircle className="w-6 h-6 mr-2" /> 反对
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <CardTitle>投票情况总览</CardTitle>
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
                        <div className="text-sm font-medium text-slate-800 line-clamp-2">{country}</div>
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
      { name: '赞成', value: res.approve, color: '#059669' },
      { name: '反对', value: res.oppose, color: '#e11d48' },
      { name: '弃权', value: res.abstain, color: '#f59e0b' },
    ].filter((d) => d.value > 0);
    const barData = [
      { name: '赞成', value: res.approve },
      { name: '反对', value: res.oppose },
      { name: '弃权', value: res.abstain },
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
                  {res.passed ? '投票通过' : '投票未通过'}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {vetoApplied ? '投票被一票否决' : res.passed ? '投票已获得足够支持' : '投票未获得足够支持'}
                </p>
                <p className="mt-2 text-xs text-slate-500 max-w-2xl">
                  {getRuleDescription(res)}
                </p>
              </div>
              <div className="text-sm text-slate-600 leading-7">
                <p>{meetingInfo.committee || '未设置委员会'}</p>
                <p>{topic}</p>
                <p>赞成 {res.approve} · 反对 {res.oppose} · 弃权 {res.abstain} · 总计 {res.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Suspense fallback={<div className="h-[320px] rounded-2xl border border-slate-100 bg-white/70" />}>
          <VotingResultCharts pieData={pieData} barData={barData} passed={res.passed} />
        </Suspense>

        <Card className="apple-panel border-0 stage-entrance-delay">
          <CardHeader>
            <CardTitle className="text-base">最终国家投票情况</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {presentCountries.map((country) => {
                const isObserver = !!countryRights[country]?.observer;
                const vote = res.finalVotes[country];
                const label = isObserver
                  ? '观察员'
                  : vote === 'approve'
                    ? '赞成'
                    : vote === 'oppose'
                      ? '反对'
                      : vote === 'abstain'
                        ? '弃权'
                        : '未投票';
                return (
                  <div
                    key={country}
                    className={cn(
                      "rounded-xl border px-3 py-2",
                      isObserver ? "bg-brand-50 border-brand-200" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="text-sm font-medium text-slate-800 line-clamp-2">{country}</div>
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
            重新发起投票
          </Button>
          <Button onClick={() => setCurrentPage('meeting')} variant="secondary">
            返回会议
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
