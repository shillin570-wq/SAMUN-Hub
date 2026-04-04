import React, { useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Plus, Trash2, Users, X } from 'lucide-react';

export function MeetingCreatePage() {
  const { createNewMeeting, setCurrentPage } = useMeeting();
  const { t, displayCountry } = useLanguage();
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
    '巴林',
    '丹麦王国',
    '希腊共和国',
    '哥伦比亚',
    '刚果民主共和国',
    '巴基斯坦伊斯兰共和国',
    '巴拿马共和国',
    '利比里亚',
    '拉脱维亚',
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
    createNewMeeting(
      {
        committee: committee.trim(),
        topic: topic.trim(),
        recorder: recorder.trim(),
      },
      countries
    );
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-950 stage-entrance">
      <div className="absolute inset-0 bg-[radial-gradient(42rem_22rem_at_50%_22%,rgba(210,83,101,0.18),transparent_68%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(24rem_14rem_at_78%_16%,rgba(159,67,77,0.22),transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/72" />

      <div className="relative h-full max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-12 flex flex-col gap-6">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">{t('create.title')}</h1>
          <p className="text-slate-300">{t('create.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          <div className="space-y-4">
            <div className="text-white/90 text-sm tracking-widest uppercase">{t('create.sectionInfo')}</div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">{t('modal.settings.committee')}</label>
              <Input
                value={committee}
                onChange={(e) => setCommittee(e.target.value)}
                placeholder={t('modal.settings.phCommittee')}
                className="bg-white/88 border-white/35 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">{t('modal.settings.topic')}</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('modal.settings.phTopic')}
                className="bg-white/88 border-white/35 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">{t('create.recorderOpt')}</label>
              <Input
                value={recorder}
                onChange={(e) => setRecorder(e.target.value)}
                placeholder={t('modal.settings.phRecorder')}
                className="bg-white/88 border-white/35 rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Users className="w-4 h-4" />
                <h2 className="text-sm font-semibold">{t('create.countryList')}</h2>
              </div>
              <span className="inline-flex items-center rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-xs font-semibold text-white">
                {t('common.countryCountBadge', { n: countries.length })}
              </span>
            </div>

            <div className="flex gap-2">
              <Input
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCountry()}
                placeholder={t('create.phCountry')}
                className="bg-white/88 border-white/35 rounded-2xl"
              />
              <Button variant="secondary" onClick={handleAddCountry}>
                <Plus className="w-4 h-4 mr-1" />
                {t('common.add')}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUseTemplate}
                className="bg-brand-600 hover:bg-brand-700 text-white border border-brand-500"
              >
                {t('create.templateUnsc')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsBatchModalOpen(true)}
                className="bg-white/20 hover:bg-white/30 border border-white/35 text-white"
              >
                {t('create.batchImport')}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setCountries([])}
                className="bg-red-600/90 hover:bg-red-600 text-white border border-red-500/60"
              >
                {t('create.clear')}
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-2xl border border-white/10 bg-black/15 p-3">
              {countries.length === 0 ? (
                <p className="text-sm text-slate-300 text-center py-6">{t('create.needOneCountry')}</p>
              ) : (
                <div className="space-y-2">
                  {countries.map((country) => (
                    <div key={country} className="bg-white/90 border border-white/30 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-sm text-slate-800">{displayCountry(country)}</span>
                      <button
                        onClick={() => handleRemoveCountry(country)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title={t('create.removeCountry')}
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
            {t('create.cancelBack')}
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {t('create.submit')}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={t('create.batchTitle')}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {t('create.batchHelp')}
          </p>
          <textarea
            value={batchCountryInput}
            onChange={(e) => setBatchCountryInput(e.target.value)}
            placeholder={t('create.batchPh')}
            className="w-full min-h-52 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-300/60 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBatchModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleBatchImportCountries} disabled={!batchCountryInput.trim()}>
              {t('create.batchImportBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
