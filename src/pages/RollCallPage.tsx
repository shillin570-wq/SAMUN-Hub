import React, { useEffect, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

type RollCallStatus = 'pending' | 'present' | 'absent';
const VOTING_ROLL_CALL_KEY = 'samun_voting_roll_call_bridge_v1';

export function RollCallPage() {
  const { meetingInfo, countries, attendance, setAttendance, setCurrentPage, addMeetingLog } = useMeeting();
  const { t, displayCountry, listJoiner } = useLanguage();
  const [status, setStatus] = useState<Record<string, RollCallStatus>>({});

  useEffect(() => {
    const initialStatus: Record<string, RollCallStatus> = {};
    countries.forEach((country) => {
      if (attendance[country] === true) initialStatus[country] = 'present';
      else if (attendance[country] === false) initialStatus[country] = 'absent';
      else initialStatus[country] = 'pending';
    });
    setStatus(initialStatus);
  }, [countries, attendance]);

  const toggleStatus = (country: string) => {
    setStatus((prev) => {
      const current = prev[country];
      let next: RollCallStatus = 'pending';
      if (current === 'pending') next = 'present';
      else if (current === 'present') next = 'absent';
      else next = 'pending';
      return { ...prev, [country]: next };
    });
  };

  const markAllPresent = () => {
    const newStatus: Record<string, RollCallStatus> = {};
    countries.forEach((c) => (newStatus[c] = 'present'));
    setStatus(newStatus);
  };

  const resetRollCall = () => {
    const newStatus: Record<string, RollCallStatus> = {};
    countries.forEach((c) => (newStatus[c] = 'pending'));
    setStatus(newStatus);
  };

  const finishRollCall = () => {
    const newAttendance: Record<string, boolean> = {};
    countries.forEach((c) => {
      newAttendance[c] = status[c] === 'present';
    });
    const presentCountries = countries.filter((c) => newAttendance[c]);
    const absentCountries = countries.filter((c) => !newAttendance[c]);
    addMeetingLog(
      'roll-call',
      t('log.rollCallTitle'),
      t('log.rollCallDetail', {
        p: presentCountries.length,
        a: absentCountries.length,
        pl: presentCountries.map(displayCountry).join(listJoiner) || t('common.none'),
        al: absentCountries.map(displayCountry).join(listJoiner) || t('common.none'),
      })
    );
    setAttendance(newAttendance);
    const rawBridge = localStorage.getItem(VOTING_ROLL_CALL_KEY);
    if (rawBridge) {
      try {
        const parsed = JSON.parse(rawBridge) as { status?: string };
        if (parsed.status === 'awaiting-roll-call') {
          localStorage.setItem(VOTING_ROLL_CALL_KEY, JSON.stringify({ ...parsed, status: 'ready-to-start' }));
          setCurrentPage('voting');
          return;
        }
      } catch (error) {
        console.error('Failed to parse voting roll call bridge data', error);
        localStorage.removeItem(VOTING_ROLL_CALL_KEY);
      }
    }
    setCurrentPage('meeting');
  };

  const stats = {
    total: countries.length,
    present: Object.values(status).filter((s) => s === 'present').length,
    absent: Object.values(status).filter((s) => s === 'absent').length,
    pending: Object.values(status).filter((s) => s === 'pending').length,
  };

  const progress = stats.total > 0 ? ((stats.present + stats.absent) / stats.total) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300 pb-4">
      <Card className="apple-panel border-0">
        <CardContent className="p-6 md:p-7">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
              {displayCountry(meetingInfo.committee) || t('common.committeeUnset')}
            </h1>
            <p className="text-lg text-slate-500">{meetingInfo.topic || t('common.topicUnsetLong')}</p>

            <div className="mt-3 w-full">
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="text-slate-600">{t('rollCall.progress')}</span>
                <span className={stats.pending === 0 ? 'text-emerald-600' : 'text-brand-600'}>
                  {stats.pending === 0 ? t('rollCall.done') : t('rollCall.pendingLeft', { n: stats.pending })}
                </span>
              </div>
              <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: t('rollCall.statTotal'), value: stats.total, color: 'text-slate-900' },
                { label: t('rollCall.statPresent'), value: stats.present, color: 'text-emerald-600' },
                { label: t('rollCall.statAbsent'), value: stats.absent, color: 'text-brand-600' },
                { label: t('rollCall.statPending'), value: stats.pending, color: 'text-amber-600' },
              ].map((stat, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white/80 px-3.5 py-2.5 text-center">
                  <div className={cn('text-xl font-bold leading-none', stat.color)}>{stat.value}</div>
                  <div className="mt-1 text-xs font-medium text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
              <CardTitle className="text-xl font-semibold">{t('rollCall.seatsTitle')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={resetRollCall}>
                  {t('rollCall.reset')}
                </Button>
                <Button variant="secondary" size="sm" onClick={markAllPresent}>
                  {t('rollCall.allPresent')}
                </Button>
              </div>
            </CardHeader>
            <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {countries.map((country) => {
                  const s = status[country];
                  return (
                    <button
                      key={country}
                      onClick={() => toggleStatus(country)}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-2',
                        s === 'present' && 'border-emerald-200 bg-emerald-50',
                        s === 'absent' && 'border-brand-200 bg-brand-50',
                        s === 'pending' && 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <span className="font-medium text-slate-900 text-sm line-clamp-2">{displayCountry(country)}</span>
                      {s === 'present' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> {t('rollCall.badgePresent')}
                        </span>
                      )}
                      {s === 'absent' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-100 px-2 py-1 rounded-full">
                          <XCircle className="w-3 h-3" /> {t('rollCall.badgeAbsent')}
                        </span>
                      )}
                      {s === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          <Clock className="w-3 h-3" /> {t('rollCall.badgePending')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-3 pt-1">
        <Button
          variant="secondary"
          onClick={() => {
            localStorage.removeItem(VOTING_ROLL_CALL_KEY);
            setCurrentPage('meeting');
          }}
        >
          {t('rollCall.backMeeting')}
        </Button>
        <Button variant={stats.pending === 0 ? 'primary' : 'secondary'} onClick={finishRollCall} disabled={stats.pending > 0}>
          {t('rollCall.finish')}
        </Button>
      </div>
    </div>
  );
}
