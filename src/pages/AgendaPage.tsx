import React, { useState, useEffect } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Play, Pause, RotateCcw, SkipForward, Users, Clock, ListTodo } from 'lucide-react';
import { cn } from '../lib/utils';

type AgendaTab = 'intro' | 'main-list' | 'free-debate' | 'consultation';

export function AgendaPage() {
  const { setCurrentPage } = useMeeting();
  
  const [tab, setTab] = useState<AgendaTab>('intro');
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [newSpeaker, setNewSpeaker] = useState('');
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [customTime, setCustomTime] = useState('120');

  useEffect(() => {
    let interval: number;
    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddSpeaker = () => {
    if (newSpeaker.trim() && !speakers.includes(newSpeaker.trim())) {
      setSpeakers([...speakers, newSpeaker.trim()]);
      setNewSpeaker('');
    }
  };

  const handleNextSpeaker = () => {
    if (speakers.length > 0) {
      const newSpeakers = [...speakers];
      newSpeakers.splice(currentSpeakerIndex, 1);
      setSpeakers(newSpeakers);
      
      if (currentSpeakerIndex >= newSpeakers.length) {
        setCurrentSpeakerIndex(0);
      }
      
      setTimeLeft(parseInt(customTime) || 120);
      setIsRunning(false);
    }
  };

  const handleSetTime = () => {
    const t = parseInt(customTime);
    if (!isNaN(t) && t > 0) {
      setTimeLeft(t);
      setIsRunning(false);
    }
  };

  const tabs = [
    { id: 'intro', label: '议程单介绍' },
    { id: 'main-list', label: '设置发言名单' },
    { id: 'free-debate', label: '自由辩论' },
    { id: 'consultation', label: '自由磋商' },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">议程设置</h1>
        <p className="text-slate-500">春秋议事规则会议系统</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Panel: Settings & Timer */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-0">
              <div className="flex gap-1 mb-4">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2",
                      tab === t.id 
                        ? "border-brand-600 text-brand-700 bg-brand-50/50" 
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {(tab === 'intro' || tab === 'main-list') ? (
                <div className="flex gap-2 mb-8">
                  <Input 
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSpeaker()}
                    placeholder="输入发言国名称后按回车添加..."
                    className="h-12 text-base flex-1 min-w-0"
                  />
                  <Button onClick={handleAddSpeaker} className="h-12 px-6 shrink-0">添加</Button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-8 text-center text-sm">
                  {tab === 'free-debate' ? '自由辩论结束后可以返回发言名单继续进行' : '自由磋商结束后可以返回发言名单继续进行'}
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
                <h3 className="text-center text-slate-500 font-medium mb-4">发言计时器</h3>
                <div className="flex-1 flex flex-col items-center justify-center py-4">
                  <div className={cn(
                    "text-6xl md:text-7xl font-black font-mono tracking-tight transition-colors duration-300",
                    timeLeft === 0 ? "text-red-500" : isRunning ? "text-brand-600" : "text-slate-800"
                  )}>
                    {formatTime(timeLeft)}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 mb-8">
                  <Input 
                    type="number" 
                    value={customTime} 
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-24 h-9 text-center"
                  />
                  <span className="text-sm text-slate-500">秒</span>
                  <Button size="sm" variant="secondary" onClick={handleSetTime}>设置时间</Button>
                </div>

                <div className="flex justify-center gap-3 flex-wrap">
                  <Button 
                    size="lg" 
                    variant={isRunning ? "warning" : "success"} 
                    className="flex-1 min-w-[100px]"
                    onClick={() => setIsRunning(!isRunning)}
                  >
                    {isRunning ? <><Pause className="w-4 h-4 mr-2 shrink-0"/> 暂停</> : <><Play className="w-4 h-4 mr-2 shrink-0"/> 开始</>}
                  </Button>
                  <Button 
                    size="lg" 
                    variant="primary" 
                    className="flex-1 min-w-[100px]"
                    onClick={handleNextSpeaker}
                  >
                    <SkipForward className="w-4 h-4 mr-2 shrink-0"/> 下一位
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="flex-1 min-w-[100px]"
                    onClick={() => {
                      setIsRunning(false);
                      setTimeLeft(parseInt(customTime) || 120);
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2 shrink-0"/> 重置
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <Button variant="secondary" size="lg" onClick={() => setCurrentPage('roll-call')}>返回点名</Button>
                <Button variant="warning" size="lg" onClick={() => setCurrentPage('voting')}>开启投票</Button>
                <Button size="lg" onClick={() => setCurrentPage('meeting')}>开始会议</Button>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Speaker Queue */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                发言队列
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {(tab === 'free-debate' || tab === 'consultation') ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  {tab === 'free-debate' ? '自由辩论模式' : '自由磋商模式'}<br/>无发言队列
                </div>
              ) : speakers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  暂无发言国
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 p-2">
                  {speakers.map((speaker, idx) => (
                    <li 
                      key={idx} 
                      className={cn(
                        "px-4 py-3 flex items-center justify-between text-sm rounded-lg mb-1",
                        idx === currentSpeakerIndex ? "bg-brand-50 border border-brand-200" : "bg-slate-50 border border-transparent"
                      )}
                    >
                      <span className={cn("font-medium", idx === currentSpeakerIndex ? "text-brand-900" : "text-slate-700")}>
                        {speaker}
                      </span>
                      <div className="flex items-center gap-2">
                        {idx === currentSpeakerIndex && (
                          <span className="text-xs font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded">当前</span>
                        )}
                        <button 
                          className="text-slate-400 hover:text-red-500"
                          onClick={() => {
                            const newSpeakers = [...speakers];
                            newSpeakers.splice(idx, 1);
                            setSpeakers(newSpeakers);
                            if (currentSpeakerIndex >= newSpeakers.length) {
                              setCurrentSpeakerIndex(Math.max(0, newSpeakers.length - 1));
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
