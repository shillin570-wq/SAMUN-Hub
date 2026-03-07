import React, { useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Users, Plus, Trash2 } from 'lucide-react';

export function SetupPage() {
  const { meetingInfo, setMeetingInfo, countries, setCountries, setCurrentPage } = useMeeting();
  const [newCountry, setNewCountry] = useState('');
  const canStart = Boolean(meetingInfo.committee.trim() && meetingInfo.topic.trim() && countries.length > 0);

  const handleAddCountry = () => {
    if (newCountry.trim() && !countries.includes(newCountry.trim())) {
      setCountries([...countries, newCountry.trim()]);
      setNewCountry('');
    }
  };

  const handleRemoveCountry = (countryToRemove: string) => {
    setCountries(countries.filter(c => c !== countryToRemove));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">会议设置</h1>
        <p className="text-slate-500">先完成会议信息与国家列表，再按引导进入点名</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">委员会名称</label>
              <Input 
                value={meetingInfo.committee}
                onChange={(e) => setMeetingInfo({...meetingInfo, committee: e.target.value})}
                placeholder="例如：联合国安全理事会"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">会议议题</label>
              <Input 
                value={meetingInfo.topic}
                onChange={(e) => setMeetingInfo({...meetingInfo, topic: e.target.value})}
                placeholder="例如：关于维护国际和平与安全的决议"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">记录人</label>
              <Input 
                value={meetingInfo.recorder}
                onChange={(e) => setMeetingInfo({...meetingInfo, recorder: e.target.value})}
                placeholder="请输入记录人姓名"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                国家列表
              </div>
              <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                共 {countries.length} 个
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input 
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCountry()}
                placeholder="输入国家名称..."
              />
              <Button onClick={handleAddCountry} variant="secondary">
                <Plus className="w-4 h-4 mr-1" /> 添加
              </Button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-[200px] overflow-y-auto">
              {countries.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  暂无国家，请添加
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {countries.map((country) => (
                    <div 
                      key={country} 
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-sm shadow-sm"
                    >
                      {country}
                      <button 
                        onClick={() => handleRemoveCountry(country)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={() => setCurrentPage('roll-call')}
          disabled={!canStart}
          className="w-full md:w-auto md:min-w-[220px]"
        >
          开始会议 (进入点名)
        </Button>
      </div>
      {!canStart && (
        <p className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-4">
          请至少填写委员会、议题，并添加 1 个国家后再开始会议。
        </p>
      )}
    </div>
  );
}
