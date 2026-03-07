import React, { useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Plus, Trash2, Users, X } from 'lucide-react';

export function MeetingCreatePage() {
  const { createNewMeeting, setCurrentPage } = useMeeting();
  const [committee, setCommittee] = useState('');
  const [topic, setTopic] = useState('');
  const [recorder, setRecorder] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [batchCountryInput, setBatchCountryInput] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const sampleCountries = [
    '中华人民共和国',
    '美利坚合众国',
    '大不列颠及北爱尔兰联合王国',
    '法兰西共和国',
    '俄罗斯联邦',
    '阿尔及利亚民主人民共和国',
    '丹麦王国',
    '希腊共和国',
    '圭亚那合作共和国',
    '巴基斯坦伊斯兰共和国',
    '巴拿马共和国',
    '大韩民国',
    '塞拉利昂共和国',
    '斯洛文尼亚共和国',
    '索马里联邦共和国',
  ];

  const canCreate = committee.trim().length > 0 && topic.trim().length > 0 && countries.length > 0;

  const handleAddCountry = () => {
    const value = countryInput.trim();
    if (!value || countries.includes(value)) return;
    setCountries([...countries, value]);
    setCountryInput('');
  };

  const handleRemoveCountry = (country: string) => {
    setCountries(countries.filter((item) => item !== country));
  };

  const handleUseTemplate = () => {
    setCountries(sampleCountries);
  };

  const handleBatchImportCountries = () => {
    const parsed = batchCountryInput
      .split(/[\n,，;；、]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (parsed.length === 0) return;

    const merged = Array.from(new Set([...countries, ...parsed]));
    setCountries(merged);
    setBatchCountryInput('');
    setIsBatchModalOpen(false);
  };

  const handleCreate = () => {
    if (!canCreate) return;
    createNewMeeting({
      committee: committee.trim(),
      topic: topic.trim(),
      recorder: recorder.trim(),
    }, countries);
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-950 stage-entrance">
      <div className="absolute inset-0 bg-[radial-gradient(42rem_22rem_at_50%_22%,rgba(210,83,101,0.18),transparent_68%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(24rem_14rem_at_78%_16%,rgba(159,67,77,0.22),transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/72" />

      <div className="relative h-full max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-12 flex flex-col gap-6">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">新建会议</h1>
          <p className="text-slate-300">请先完整填写会议信息与国家列表，创建后将进入会议封面页。</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          <div className="space-y-4">
            <div className="text-white/90 text-sm tracking-widest uppercase">会议信息</div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">委员会名称</label>
              <Input
                value={committee}
                onChange={(e) => setCommittee(e.target.value)}
                placeholder="例如：联合国安全理事会"
                className="bg-white/88 border-white/35 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">会议议题</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例如：关于维护国际和平与安全的决议"
                className="bg-white/88 border-white/35 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">记录人（可选）</label>
              <Input
                value={recorder}
                onChange={(e) => setRecorder(e.target.value)}
                placeholder="请输入记录人姓名"
                className="bg-white/88 border-white/35 rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Users className="w-4 h-4" />
                <h2 className="text-sm font-semibold">国家列表</h2>
              </div>
              <span className="inline-flex items-center rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-xs font-semibold text-white">{countries.length} 个</span>
            </div>

            <div className="flex gap-2">
              <Input
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCountry()}
                placeholder="输入国家名称..."
                className="bg-white/88 border-white/35 rounded-2xl"
              />
              <Button variant="secondary" onClick={handleAddCountry}>
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUseTemplate}
                className="bg-brand-600 hover:bg-brand-700 text-white border border-brand-500"
              >
                使用安理会15国模板
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsBatchModalOpen(true)}
                className="bg-white/20 hover:bg-white/30 border border-white/35 text-white"
              >
                批量导入
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setCountries([])}
                className="bg-red-600/90 hover:bg-red-600 text-white border border-red-500/60"
              >
                清空
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-2xl border border-white/10 bg-black/15 p-3">
              {countries.length === 0 ? (
                <p className="text-sm text-slate-300 text-center py-6">请至少添加 1 个国家</p>
              ) : (
                <div className="space-y-2">
                  {countries.map((country) => (
                    <div key={country} className="bg-white/90 border border-white/30 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-sm text-slate-800">{country}</span>
                      <button
                        onClick={() => handleRemoveCountry(country)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="删除国家"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button
            variant="danger"
            onClick={() => setCurrentPage('entry')}
            className="bg-white/15 hover:bg-white/25 border border-white/30 text-white"
          >
            <X className="w-4 h-4 mr-1.5" />
            取消并返回
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>创建并进入封面</Button>
        </div>
      </div>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="批量导入国家"
        className="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            支持每行一个国家，或使用逗号/顿号分隔。导入时会自动去重并合并到当前列表。
          </p>
          <textarea
            value={batchCountryInput}
            onChange={(e) => setBatchCountryInput(e.target.value)}
            placeholder="示例：\n中华人民共和国\n美利坚合众国\n法兰西共和国"
            className="w-full min-h-52 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-300/60 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBatchModalOpen(false)}>取消</Button>
            <Button onClick={handleBatchImportCountries} disabled={!batchCountryInput.trim()}>导入到国家列表</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
