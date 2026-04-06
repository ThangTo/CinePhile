import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { questAdminAPI } from "services/admin.service";
import { BarSpinner } from "components/common/LoadingState";

const PERIOD_META = {
  daily: { label: "Daily", nextLabel: "ngay tiep theo", color: "text-sky-300" },
  weekly: { label: "Weekly", nextLabel: "tuan tiep theo", color: "text-amber-300" },
};

const METRIC_OPTIONS = [
  { value: "watch_seconds", label: "Xem phim theo phut", unit: "phut" },
  { value: "unique_movies", label: "Xem phim khac nhau", unit: "phim" },
  { value: "comment_count", label: "Binh luan", unit: "lan" },
  { value: "rating_count", label: "Danh gia", unit: "lan" },
  { value: "favorite_count", label: "Them yeu thich", unit: "lan" },
  { value: "watchlist_count", label: "Them watchlist", unit: "lan" },
];

const CATEGORY_OPTIONS = ["watch", "social", "engagement"];
const DEFAULT_TEMPLATE_FORM = {
  id: null,
  type: "daily",
  category: "watch",
  title: "",
  description: "",
  icon: "fa-solid fa-star",
  targetMetric: "watch_seconds",
  targetValue: 10,
  rewardCoins: 10,
};

const showToast = (message, type = "success") => {
  const id = `admin-quest-toast-${Date.now()}`;
  const el = document.createElement("div");
  el.id = id;
  el.className = `fixed top-4 right-4 z-[99999] px-5 py-3 rounded-xl text-sm font-medium shadow-xl ${
    type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
  }`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 250);
  }, 2600);
};

const sortTemplates = (templates = []) =>
  [...templates].sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title));

const formatTarget = (item) => {
  const metric = METRIC_OPTIONS.find((option) => option.value === item.targetMetric);
  const value = item.targetInputValue ?? item.targetValue;
  return metric ? `${value} ${metric.unit}` : String(value);
};

const SnapshotCard = ({ title, subtitle, snapshot }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <h4 className="text-white font-semibold">{title}</h4>
    <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    {!snapshot?.quests?.length ? (
      <div className="text-sm text-gray-500 mt-4">Chua co du lieu.</div>
    ) : (
      <div className="space-y-2 mt-4">
        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
          <span className="px-2 py-1 rounded-full bg-black/20 border border-white/5">
            {snapshot.periodKey}
          </span>
          <span className="px-2 py-1 rounded-full bg-black/20 border border-white/5">
            bonus +{snapshot.completionBonusCoins}
          </span>
          <span className="px-2 py-1 rounded-full bg-black/20 border border-white/5">
            {snapshot.selectionMode}
          </span>
        </div>
        {snapshot.quests.map((quest) => (
          <div
            key={`${snapshot.periodKey}-${quest.sourceQuestDefinitionId}`}
            className="rounded-xl border border-white/5 bg-black/20 px-3 py-2.5"
          >
            <p className="text-sm text-white font-medium">{quest.title}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatTarget(quest)} • +{quest.rewardCoins} coin
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
);

const TemplateModal = ({ open, initialValue, onClose, onSave }) => {
  const [form, setForm] = useState(DEFAULT_TEMPLATE_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...DEFAULT_TEMPLATE_FORM,
      ...initialValue,
      targetValue: initialValue?.targetInputValue ?? initialValue?.targetValue ?? 10,
    });
  }, [initialValue, open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: form.id,
        type: form.type,
        category: form.category,
        title: form.title,
        description: form.description,
        icon: form.icon,
        targetMetric: form.targetMetric,
        targetValue: Number(form.targetValue),
        rewardCoins: Number(form.rewardCoins),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161825] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">{form.id ? "Sua template" : "Them template"}</h3>
            <p className="text-xs text-gray-400 mt-1">Template chi anh huong cac ky tuong lai.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <FiX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.type}
              disabled={Boolean(form.id)}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white disabled:opacity-60"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white"
            >
              {CATEGORY_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white"
            placeholder="Tieu de quest"
            required
          />
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white resize-none"
            placeholder="Mo ta"
          />
          <div className="grid grid-cols-3 gap-4">
            <select
              value={form.targetMetric}
              onChange={(event) => setForm((current) => ({ ...current, targetMetric: event.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white"
            >
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={form.targetValue}
              onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white"
              placeholder="fa-solid fa-star"
            />
            <input
              type="number"
              min="10"
              step="10"
              value={form.rewardCoins}
              onChange={(event) => setForm((current) => ({ ...current, rewardCoins: event.target.value }))}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white"
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-gray-300">
              Huy
            </button>
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primaryColor text-black font-semibold disabled:opacity-50">
              {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
              {saving ? "Dang luu..." : "Luu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PeriodSection = ({
  type,
  draft,
  templates,
  currentSnapshot,
  nextPreview,
  nextPeriodKey,
  dirty,
  saving,
  onDraftChange,
  onSave,
  onEditTemplate,
  onArchiveTemplate,
}) => {
  const meta = PERIOD_META[type];
  const listKey = draft.selectionMode === "random" ? "randomPoolQuestIds" : "fixedQuestIds";
  const selectedIds = draft[listKey] || [];
  const selectedTemplates = selectedIds
    .map((id) => templates.find((template) => template.id === id))
    .filter(Boolean);

  const patchSelection = (nextIds, extra = {}) => onDraftChange(type, { [listKey]: nextIds, ...extra });

  const handleMove = (index, delta) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= selectedIds.length) return;
    const nextIds = [...selectedIds];
    [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
    patchSelection(nextIds);
  };

  const handleRemove = (id) => {
    const nextIds = selectedIds.filter((item) => item !== id);
    const extra =
      draft.selectionMode === "random"
        ? { randomCount: Math.min(Number(draft.randomCount || 0), Math.max(nextIds.length, 1)) }
        : {};
    patchSelection(nextIds, extra);
  };

  const handleAdd = (id) => {
    if (selectedIds.includes(id)) return;
    const nextIds = [...selectedIds, id];
    const extra =
      draft.selectionMode === "random" && Number(draft.randomCount || 0) <= 0
        ? { randomCount: 1 }
        : {};
    patchSelection(nextIds, extra);
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#11131d] p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${meta.color}`}>{meta.label}</h2>
          <p className="text-sm text-gray-400 mt-1">Moi thay doi se ap dung tu {meta.nextLabel}.</p>
        </div>
        <button
          onClick={() => onSave(type)}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primaryColor text-black font-semibold disabled:opacity-50"
        >
          {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
          {saving ? "Dang luu..." : dirty ? "Luu nhap" : "Da dong bo"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SnapshotCard
          title="Dang chay hien tai"
          subtitle="Snapshot nay khong bi doi khi admin sua draft."
          snapshot={currentSnapshot}
        />
        <SnapshotCard
          title="Preview ky sau"
          subtitle={`Period key: ${nextPeriodKey || "-"}`}
          snapshot={nextPreview}
        />
      </div>

      <div className="rounded-2xl border border-primaryColor/15 bg-primaryColor/[0.04] p-5 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onDraftChange(type, { selectionMode: "fixed" })}
            className={`px-4 py-2 rounded-xl border ${draft.selectionMode === "fixed" ? "bg-primaryColor text-black border-primaryColor" : "border-white/10 text-gray-300"}`}
          >
            Co dinh
          </button>
          <button
            onClick={() => onDraftChange(type, { selectionMode: "random" })}
            className={`px-4 py-2 rounded-xl border ${draft.selectionMode === "random" ? "bg-primaryColor text-black border-primaryColor" : "border-white/10 text-gray-300"}`}
          >
            Random
          </button>
          <button
            onClick={() => onEditTemplate(type, null)}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5"
          >
            <FiPlus />
            Them template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Selection mode</p>
            <p className="text-white font-semibold">{draft.selectionMode}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Completion bonus</p>
            <input
              type="number"
              min="0"
              step="10"
              value={draft.completionBonusCoins ?? 0}
              onChange={(event) => onDraftChange(type, { completionBonusCoins: Number(event.target.value || 0) })}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Trang thai draft</p>
            <p className={`font-semibold ${dirty ? "text-amber-300" : "text-emerald-300"}`}>
              {dirty ? "Co thay doi chua luu" : "Da dong bo"}
            </p>
          </div>
        </div>

        {draft.selectionMode === "random" && (
          <div className="w-full md:w-48">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Random count</p>
            <input
              type="number"
              min="1"
              value={draft.randomCount ?? 1}
              onChange={(event) => onDraftChange(type, { randomCount: Number(event.target.value || 0) })}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white"
            />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h4 className="text-white font-semibold">
              {draft.selectionMode === "random" ? "Pool random ky sau" : "Danh sach co dinh ky sau"}
            </h4>
            <p className="text-xs text-gray-400 mt-1">Sap xep thu tu va bo bot quest o day.</p>
            <div className="space-y-2 mt-4">
              {!selectedTemplates.length && (
                <div className="text-sm text-gray-500 border border-dashed border-white/10 rounded-xl p-4">
                  Chua chon quest nao.
                </div>
              )}
              {selectedTemplates.map((template, index) => (
                <div key={template.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-3">
                  <div className="w-8 h-8 rounded-lg bg-primaryColor/10 text-primaryColor text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium">{template.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTarget(template)} • +{template.rewardCoins} coin</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleMove(index, -1)} disabled={index === 0} className="p-2 rounded-lg text-gray-500 hover:text-white disabled:opacity-25">
                      <FiChevronUp />
                    </button>
                    <button onClick={() => handleMove(index, 1)} disabled={index === selectedTemplates.length - 1} className="p-2 rounded-lg text-gray-500 hover:text-white disabled:opacity-25">
                      <FiChevronDown />
                    </button>
                    <button onClick={() => handleRemove(template.id)} className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <FiX />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h4 className="text-white font-semibold">Template pool</h4>
            <p className="text-xs text-gray-400 mt-1">Them vao draft, sua template, hoac archive cho ky sau.</p>
            <div className="space-y-2 mt-4">
              {!templates.length && (
                <div className="text-sm text-gray-500 border border-dashed border-white/10 rounded-xl p-4">
                  Chua co template nao.
                </div>
              )}
              {templates.map((template) => (
                <div key={template.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
                    <i className={`fas ${template.icon || "fa-solid fa-star"} text-primaryColor`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium">{template.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTarget(template)} • +{template.rewardCoins} coin</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleAdd(template.id)}
                      disabled={selectedIds.includes(template.id)}
                      className="px-3 py-2 rounded-lg bg-primaryColor text-black text-xs font-semibold disabled:opacity-40"
                    >
                      {selectedIds.includes(template.id) ? "Da chon" : "Them"}
                    </button>
                    <button onClick={() => onEditTemplate(type, template)} className="p-2 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                      <FiEdit2 />
                    </button>
                    <button onClick={() => onArchiveTemplate(template)} className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const AdminQuestsTab = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingType, setSavingType] = useState(null);
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [templateModal, setTemplateModal] = useState({ open: false, type: "daily", template: null });

  const refreshData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await questAdminAPI.getConfig();
      setData(response);
      setDrafts(response?.draftConfig || {});
    } catch (error) {
      showToast(error?.message || "Khong the tai cau hinh quest", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const dirtyMap = useMemo(() => {
    const result = {};
    for (const type of Object.keys(PERIOD_META)) {
      result[type] =
        JSON.stringify(drafts?.[type] || {}) !== JSON.stringify(data?.draftConfig?.[type] || {});
    }
    return result;
  }, [data?.draftConfig, drafts]);

  const handleDraftChange = (type, patch) => {
    setDrafts((current) => ({
      ...current,
      [type]: {
        ...current[type],
        ...patch,
      },
    }));
  };

  const handleSaveConfig = async (type) => {
    setSavingType(type);
    try {
      await questAdminAPI.updateConfig(type, drafts[type]);
      await refreshData(true);
      showToast(`Da luu nhap ${type}`);
    } catch (error) {
      showToast(error?.message || "Khong the luu quest config", "error");
    } finally {
      setSavingType(null);
    }
  };

  const handleSaveTemplate = async (payload) => {
    try {
      await questAdminAPI.upsertTemplate(payload);
      setTemplateModal({ open: false, type: "daily", template: null });
      await refreshData(true);
      showToast(payload.id ? "Da cap nhat template" : "Da tao template");
    } catch (error) {
      showToast(error?.message || "Khong the luu template", "error");
      throw error;
    }
  };

  const handleArchiveTemplate = async (template) => {
    const confirmed = window.confirm(
      `Archive quest "${template.title}"? Viec nay chi anh huong draft ky sau.`,
    );
    if (!confirmed) return;
    try {
      await questAdminAPI.archiveTemplate(template.id);
      await refreshData(true);
      showToast("Da archive template");
    } catch (error) {
      showToast(error?.message || "Khong the archive template", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <BarSpinner />
        <p className="text-gray-400 text-sm animate-pulse">Dang tai quest admin...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Quan ly nhiem vu</h1>
          <p className="text-sm text-gray-400 mt-1">
            Quan ly pool quest, lineup ky sau va giu snapshot ky hien tai bat bien.
          </p>
        </div>
        <button
          onClick={() => refreshData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-50"
        >
          {refreshing ? <FiLoader className="animate-spin" /> : <FiRefreshCw />}
          {refreshing ? "Dang tai..." : "Tai lai"}
        </button>
      </div>

      {Object.keys(PERIOD_META).map((type) => (
        <PeriodSection
          key={type}
          type={type}
          draft={drafts[type] || { selectionMode: "fixed", fixedQuestIds: [], randomPoolQuestIds: [] }}
          templates={sortTemplates(data?.templates?.[type] || [])}
          currentSnapshot={data?.currentSnapshot?.[type]}
          nextPreview={data?.nextPreview?.[type]}
          nextPeriodKey={data?.nextPeriodKey?.[type]}
          dirty={Boolean(dirtyMap[type])}
          saving={savingType === type}
          onDraftChange={handleDraftChange}
          onSave={handleSaveConfig}
          onEditTemplate={(periodType, template) => setTemplateModal({ open: true, type: periodType, template })}
          onArchiveTemplate={handleArchiveTemplate}
        />
      ))}

      <TemplateModal
        open={templateModal.open}
        initialValue={templateModal.template || { ...DEFAULT_TEMPLATE_FORM, type: templateModal.type }}
        onClose={() => setTemplateModal({ open: false, type: "daily", template: null })}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};

export default AdminQuestsTab;
