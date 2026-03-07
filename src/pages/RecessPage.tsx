import React, { useState, useEffect } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Play, Pause, RotateCcw, Coffee, Users, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export function RecessPage() {
  const { meetingInfo, countries, attendance, setCurrentPage } = useMeeting();
  
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [customTime, setCustomTime] = useState('600');

  const presentCount = countries.filter(c => attendance[c]).length;
  const totalCount = countries.length;
  const requiredCount = Math.ceil(totalCount * 2 / 3);
  const shortageCount = Math.max(0, requiredCount - presentCount);

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

  const handleSetTime = () => {
    const t = parseInt(customTime);
    if (!isNaN(t) && t > 0) {
      setTimeLeft(t);
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2 bg-white p-8 rounded-xl border border-brand-200 shadow-sm bg-gradient-to-b from-white to-brand-50/30">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 text-brand-600 mb-4">
          <Coffee className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">展会状态</h1>
        <p className="text-slate-500 text-lg">会议因出席人数不足而暂停，或处于休息时间</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Panel: Attendance Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                出席情况
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">总人数</span>
                  <span className="font-bold text-slate-900 text-lg">{totalCount}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">出席人数</span>
                  <span className="font-bold text-emerald-600 text-lg">{presentCount}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">所需人数 (2/3)</span>
                  <span className="font-bold text-slate-900 text-lg">{requiredCount}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-brand-50 border border-brand-100 rounded-lg">
                  <span className="text-brand-700 font-medium">缺少人数</span>
                  <span className="font-bold text-brand-700 text-lg">{shortageCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-brand-600" />
                操作指南
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-medium text-slate-900">等待代表到场</p>
                  <p className="text-sm text-slate-500">在展会期间，请等待更多代表到场参加会议</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-medium text-slate-900">监控出席情况</p>
                  <p className="text-sm text-slate-500">实时关注出席人数变化，确保达到法定人数</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-medium text-slate-900">重新开始会议</p>
                  <p className="text-sm text-slate-500">当出席人数足够时，点击"重新进入点名"继续会议</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Timer */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                展会计时
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-8">
              
              <div className={cn(
                "text-6xl md:text-8xl font-black font-mono tracking-tight transition-colors duration-300 mb-12",
                timeLeft === 0 ? "text-red-500" : isRunning ? "text-brand-600" : "text-slate-800"
              )}>
                {formatTime(timeLeft)}
              </div>

              <div className="flex items-center justify-center gap-3 mb-8 bg-slate-50 p-3 rounded-lg w-full max-w-xs">
                <span className="text-sm font-medium text-slate-600">设置时间(秒):</span>
                <Input 
                  type="number" 
                  value={customTime} 
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-24 h-9 text-center"
                />
                <Button size="sm" variant="secondary" onClick={handleSetTime}>应用</Button>
              </div>

              <div className="flex justify-center gap-3 w-full">
                <Button 
                  size="lg" 
                  variant={isRunning ? "warning" : "success"} 
                  className="flex-1"
                  onClick={() => setIsRunning(!isRunning)}
                >
                  {isRunning ? <><Pause className="w-5 h-5 mr-2"/> 暂停</> : <><Play className="w-5 h-5 mr-2"/> 开始</>}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsRunning(false);
                    setTimeLeft(parseInt(customTime) || 600);
                  }}
                >
                  <RotateCcw className="w-5 h-5 mr-2"/> 重置
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="secondary" size="lg" onClick={() => setCurrentPage('meeting')} className="w-48">
          返回设置
        </Button>
        <Button size="lg" onClick={() => setCurrentPage('roll-call')} className="w-48">
          重新进入点名
        </Button>
      </div>
    </div>
  );
}
