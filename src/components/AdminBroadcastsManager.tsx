import React, { useState } from 'react';
import { useBuilding } from '../context/BuildingContext';
import { SocietyBroadcast, SocietyBroadcastCategory } from '../types';
import {
  Bell,
  HeartHandshake,
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Eye,
  Filter,
  X,
  Calendar,
  User,
  Check,
} from 'lucide-react';

interface QuickTemplate {
  category: SocietyBroadcastCategory;
  title: string;
  content: string;
  author: string;
  priority: 'normal' | 'important' | 'urgent';
}

const TEMPLATES: QuickTemplate[] = [
  {
    category: 'notice',
    title: 'Water Tank & Overhead Sump Deep Cleaning',
    content: 'All residents are notified that the society water tanks will be cleaned and chlorinated this Sunday between 9:00 AM and 1:00 PM. Water supply will be temporarily shut off during this interval. Please store adequate water.',
    author: 'Society Secretary',
    priority: 'important',
  },
  {
    category: 'notice',
    title: 'Sub-Meter Electricity & Maintenance Dues Due Date',
    content: 'Kindly note that this month’s electricity sub-meter and society maintenance dues must be cleared by the 25th. You can pay directly using the society UPI QR code on your resident portal.',
    author: 'Managing Committee',
    priority: 'normal',
  },
  {
    category: 'appeal',
    title: 'Keep Common Passages & Stairwells Free of Items',
    content: 'We earnestly appeal to all flat owners and tenants to keep floor corridors, lift landings, and staircases free from shoe racks, cycles, and cartons. This ensures fire emergency safety and easy movement.',
    author: 'Resident Welfare Committee',
    priority: 'normal',
  },
  {
    category: 'appeal',
    title: 'Conservation of Water & Common Area Lighting',
    content: 'Please ensure stairwell lights and common motor switches are switched off after use. Kindly notify the secretary immediately if any common tap or overhead pipe leakage is detected.',
    author: 'Managing Committee',
    priority: 'normal',
  },
  {
    category: 'announcement',
    title: 'Annual General Body Meeting (AGM) & High-Tea',
    content: 'The Annual General Body Meeting (AGM) for all flat owners is scheduled for Sunday at 6:30 PM in the Ground Floor Community Hall. Agenda includes solar rooftop installation, CCTV upgrades, and accounts review.',
    author: 'Society Secretary',
    priority: 'important',
  },
  {
    category: 'announcement',
    title: 'Festival Celebration & Community Gathering',
    content: 'All residents and families are warmly invited for our society festive celebration and high-tea this Saturday evening at 7:00 PM. Let us come together as a close-knit community!',
    author: 'Cultural Sub-Committee',
    priority: 'normal',
  },
];

export const AdminBroadcastsManager: React.FC = () => {
  const { broadcasts, addBroadcast, updateBroadcast, deleteBroadcast } = useBuilding();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | SocietyBroadcastCategory>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<SocietyBroadcast | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<{
    category: SocietyBroadcastCategory;
    title: string;
    content: string;
    date: string;
    priority: 'normal' | 'important' | 'urgent';
    author: string;
    isActive: boolean;
  }>({
    category: 'notice',
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'normal',
    author: 'Society Secretary',
    isActive: true,
  });

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleOpenCreate = (initialCategory?: SocietyBroadcastCategory) => {
    setEditingBroadcast(null);
    setFormError('');
    setFormData({
      category: initialCategory || (selectedCategoryFilter === 'all' ? 'notice' : selectedCategoryFilter),
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      priority: 'normal',
      author: 'Society Secretary',
      isActive: true,
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (item: SocietyBroadcast) => {
    setEditingBroadcast(item);
    setFormError('');
    setFormData({
      category: item.category,
      title: item.title,
      content: item.content,
      date: item.date || new Date().toISOString().split('T')[0],
      priority: item.priority || 'normal',
      author: item.author || 'Society Secretary',
      isActive: item.isActive,
    });
    setIsCreating(true);
  };

  const applyTemplate = (tmpl: QuickTemplate) => {
    setFormError('');
    setFormData({
      category: tmpl.category,
      title: tmpl.title,
      content: tmpl.content,
      date: new Date().toISOString().split('T')[0],
      priority: tmpl.priority,
      author: tmpl.author,
      isActive: true,
    });
    setIsCreating(true);
    setEditingBroadcast(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.title.trim()) {
      setFormError('Please provide a title for this entry.');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('Please enter the message content.');
      return;
    }

    if (editingBroadcast) {
      updateBroadcast(editingBroadcast.id, {
        category: formData.category,
        title: formData.title.trim(),
        content: formData.content.trim(),
        date: formData.date,
        priority: formData.priority,
        author: formData.author.trim() || 'Society Secretary',
        isActive: formData.isActive,
      });
      triggerToast(`Updated "${formData.title.trim()}" successfully!`);
    } else {
      addBroadcast({
        category: formData.category,
        title: formData.title.trim(),
        content: formData.content.trim(),
        date: formData.date,
        priority: formData.priority,
        author: formData.author.trim() || 'Society Secretary',
        isActive: formData.isActive,
      });
      triggerToast(`Published new ${formData.category} to all flat owner portals!`);
    }

    setIsCreating(false);
    setEditingBroadcast(null);
  };

  const handleDelete = (id: string) => {
    deleteBroadcast(id);
    setShowDeleteConfirmId(null);
    triggerToast('Post deleted successfully.');
  };

  const noticesList = broadcasts.filter((b) => b.category === 'notice');
  const appealsList = broadcasts.filter((b) => b.category === 'appeal');
  const announcementsList = broadcasts.filter((b) => b.category === 'announcement');

  const filteredList = broadcasts.filter((b) => {
    if (selectedCategoryFilter === 'all') return true;
    return b.category === selectedCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{successToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">
                <Megaphone className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold">Society Broadcasts & Notice Board</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Publish official <strong>Notices</strong>, community <strong>Appeals</strong>, and society <strong>Announcements</strong>. 
              Whatever you enter here is immediately broadcasted and displayed in the empty space of every individual flat owner's login!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenCreate()}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Post</span>
            </button>
          </div>
        </div>

        {/* Section Metrics */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'notice' ? 'all' : 'notice')}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCategoryFilter === 'notice'
                ? 'bg-blue-500/20 border-blue-400 text-white'
                : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold flex items-center gap-1.5 text-blue-400">
                <Bell className="w-3.5 h-3.5" /> Notice
              </span>
              <span className="text-xs font-mono font-bold bg-blue-500/30 px-1.5 py-0.5 rounded text-blue-200">
                {noticesList.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 hidden sm:block">
              Rules, audits & official directives
            </p>
          </button>

          <button
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'appeal' ? 'all' : 'appeal')}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCategoryFilter === 'appeal'
                ? 'bg-amber-500/20 border-amber-400 text-white'
                : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold flex items-center gap-1.5 text-amber-400">
                <HeartHandshake className="w-3.5 h-3.5" /> Appeal
              </span>
              <span className="text-xs font-mono font-bold bg-amber-500/30 px-1.5 py-0.5 rounded text-amber-200">
                {appealsList.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 hidden sm:block">
              Cooperation & cleanliness requests
            </p>
          </button>

          <button
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'announcement' ? 'all' : 'announcement')}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCategoryFilter === 'announcement'
                ? 'bg-emerald-500/20 border-emerald-400 text-white'
                : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold flex items-center gap-1.5 text-emerald-400">
                <Megaphone className="w-3.5 h-3.5" /> Announcement
              </span>
              <span className="text-xs font-mono font-bold bg-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-200">
                {announcementsList.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 hidden sm:block">
              Events, AGM meetings & news
            </p>
          </button>
        </div>
      </div>

      {/* Quick Pre-filled Template Chips */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Template Presets (Click to Load & Edit)
          </span>
          <span className="text-[10px] text-slate-400">1-click ready-to-use formats</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyTemplate(tmpl)}
              className="text-left text-[11px] px-2.5 py-1.5 bg-white hover:bg-indigo-50 hover:border-indigo-300 active:bg-indigo-100 text-slate-700 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  tmpl.category === 'notice'
                    ? 'bg-blue-500'
                    : tmpl.category === 'appeal'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="font-medium truncate max-w-[200px]">{tmpl.title}</span>
              <span className="text-[9px] uppercase font-bold text-slate-400">({tmpl.category})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Create / Edit Form Modal - Opens centered on screen so mobile users never lose their place */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          {/* Backdrop click to dismiss */}
          <div
            className="fixed inset-0"
            onClick={() => {
              setIsCreating(false);
              setEditingBroadcast(null);
            }}
          />

          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-auto overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col z-10">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  {editingBroadcast ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingBroadcast ? 'Edit Society Broadcast' : 'Publish New Notice / Appeal / Announcement'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingBroadcast ? `Updating "${editingBroadcast.title}"` : 'This message will be instantly displayed on all resident flat portals.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingBroadcast(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Validation Error Message */}
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category Section <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'notice' })}
                    className={`py-2.5 px-2 sm:px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                      formData.category === 'notice'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Notice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'appeal' })}
                    className={`py-2.5 px-2 sm:px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                      formData.category === 'appeal'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Appeal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'announcement' })}
                    className={`py-2.5 px-2 sm:px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                      formData.category === 'announcement'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Announcement</span>
                  </button>
                </div>
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Title / Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Water Tank Cleaning Schedule on Sunday"
                    required
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Broadcast Message / Content <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formData.content.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write the complete notice, appeal, or announcement message. Flat owners will read this in their portal..."
                  required
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 leading-relaxed font-normal"
                />
              </div>

              {/* Priority, Author, and Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value as 'normal' | 'important' | 'urgent' })
                    }
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 font-medium text-slate-900"
                  >
                    <option value="normal">Normal (Standard)</option>
                    <option value="important">Important (Highlighted)</option>
                    <option value="urgent">Urgent (Red Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Issued By / Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="e.g. Society Secretary / Committee"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 font-medium text-slate-900"
                  />
                </div>

                <div className="flex items-end">
                  <label className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="text-xs font-semibold text-slate-700">Display Status:</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold ${
                          formData.isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {formData.isActive ? 'Active (Live)' : 'Draft (Hidden)'}
                      </span>
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingBroadcast(null);
                  }}
                  className="py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingBroadcast ? 'Save & Update Post' : 'Publish to All Flats'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Tabs & Add Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Posts ({broadcasts.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('notice')}
            className={`py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedCategoryFilter === 'notice'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3 h-3 text-blue-500" />
            Notices ({noticesList.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('appeal')}
            className={`py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedCategoryFilter === 'appeal'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-3 h-3 text-amber-500" />
            Appeals ({appealsList.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('announcement')}
            className={`py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedCategoryFilter === 'announcement'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3 h-3 text-emerald-500" />
            Announcements ({announcementsList.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreate('notice')}
            className="text-xs px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add Notice
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreate('appeal')}
            className="text-xs px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add Appeal
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreate('announcement')}
            className="text-xs px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add Announcement
          </button>
        </div>
      </div>

      {/* Broadcasts List */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">No Broadcasts In This Section</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Click "+ Create New Post" or one of the quick presets above to publish your first notice, appeal, or announcement to all flat owners.
          </p>
          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Publish New Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item) => {
            const isNotice = item.category === 'notice';
            const isAppeal = item.category === 'appeal';
            const isAnnouncement = item.category === 'announcement';

            const themeBg = isNotice
              ? 'bg-blue-50/50 border-blue-200'
              : isAppeal
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-emerald-50/50 border-emerald-200';

            const badgeColor = isNotice
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : isAppeal
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-emerald-100 text-emerald-800 border-emerald-200';

            const icon = isNotice ? (
              <Bell className="w-3.5 h-3.5 text-blue-600" />
            ) : isAppeal ? (
              <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
            );

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative ${
                  item.priority === 'urgent'
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Badges & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeColor}`}
                      >
                        {icon}
                        {item.category}
                      </span>

                      {item.priority === 'urgent' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          Urgent
                        </span>
                      )}
                      {item.priority === 'important' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Important
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateBroadcast(item.id, { isActive: !item.isActive })
                        }
                        title={item.isActive ? 'Active on resident portal' : 'Draft / Hidden from residents'}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {item.isActive ? 'Live' : 'Hidden'}
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-900 mb-1.5 leading-snug">
                    {item.title}
                  </h4>

                  {/* Message Content */}
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {item.content}
                  </p>
                </div>

                {/* Footer Meta & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <div className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.date}</span>
                    </div>
                    {item.author && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3" />
                        <span className="truncate max-w-[130px]">{item.author}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit this post"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {showDeleteConfirmId === item.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 text-slate-500 text-[10px] hover:text-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirmId(item.id)}
                        title="Delete this post"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
