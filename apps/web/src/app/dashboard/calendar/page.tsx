'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Video, Clock, Trash2, Edit2, X, ChevronDown, Copy, Download, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { onCalendarUpdate } from '@/lib/events';
import { FloatingShapes, GlowingBadge, PulsingDot } from '@/components/ui/decorative';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarItem {
  id: string;
  title: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: string;
  contentType: string;
  notes: string | null;
}

interface Channel {
  id: string;
  title: string;
}

const statusColors: Record<string, string> = {
  idea: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
  scripting: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-300',
  filming: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300',
  editing: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300',
  ready: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300',
  scheduled: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-300',
  published: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-300',
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years from 2020 to 2030
const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

export default function CalendarPage() {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    scheduledDate: '',
    scheduledTime: '',
    status: 'idea',
    contentType: 'long_form',
    notes: '',
  });

  useEffect(() => {
    fetchChannel();
  }, []);

  useEffect(() => {
    if (channel) {
      fetchCalendarItems();
    }
  }, [channel]);

  // Listen for AI-triggered calendar updates
  useEffect(() => {
    const unsubscribe = onCalendarUpdate(() => {
      if (channel) {
        fetchCalendarItems();
      }
    });
    return unsubscribe;
  }, [channel]);

  // Check for unsaved changes
  const hasUnsavedChanges = showModal && formData.title.trim() !== '';

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut to close modal with ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        if (hasUnsavedChanges) {
          if (confirm('You have unsaved changes. Are you sure you want to close?')) {
            setShowModal(false);
            resetForm();
          }
        } else {
          setShowModal(false);
          resetForm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, hasUnsavedChanges]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchChannel = async () => {
    try {
      const res = await fetch('http://localhost:4000/channels', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setChannel(data.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch channel:', err);
    }
  };

  const fetchCalendarItems = async () => {
    if (!channel) return;

    try {
      setLoading(true);
      const res = await fetch(`http://localhost:4000/calendar?channelId=${channel.id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        // Normalize dates to YYYY-MM-DD format
        const normalizedItems = data.data.map((item: CalendarItem) => ({
          ...item,
          scheduledDate: normalizeDate(item.scheduledDate),
        }));
        setItems(normalizedItems);
      }
    } catch (err) {
      console.error('Failed to fetch calendar items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Normalize any date format to YYYY-MM-DD
  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().split('T')[0];
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getItemsForDay = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return items.filter((item) => item.scheduledDate === dateStr);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToMonth = (month: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
    setShowDatePicker(false);
  };

  const goToYear = (year: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setShowDatePicker(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      scheduledDate: '',
      scheduledTime: '',
      status: 'idea',
      contentType: 'long_form',
      notes: '',
    });
    setEditingItem(null);
  };

  const openAddModal = (presetDate?: string) => {
    resetForm();
    if (presetDate) {
      setFormData(prev => ({ ...prev, scheduledDate: presetDate }));
    }
    setShowModal(true);
  };

  const openEditModal = (item: CalendarItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      scheduledDate: item.scheduledDate,
      scheduledTime: item.scheduledTime || '',
      status: item.status,
      contentType: item.contentType,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    if (!channel || !formData.title || !formData.scheduledDate) return;

    try {
      setSaving(true);

      const payload = {
        channelId: channel.id,
        title: formData.title,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime || null,
        status: formData.status,
        contentType: formData.contentType,
        notes: formData.notes || null,
      };

      if (editingItem) {
        // Update existing item
        const res = await fetch(`http://localhost:4000/calendar/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          setItems(items.map((item) =>
            item.id === editingItem.id
              ? { ...data.data, scheduledDate: normalizeDate(data.data.scheduledDate) }
              : item
          ));
        }
      } else {
        // Create new item
        const res = await fetch('http://localhost:4000/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          setItems([...items, { ...data.data, scheduledDate: normalizeDate(data.data.scheduledDate) }]);
        }
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save calendar item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`http://localhost:4000/calendar/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setItems(items.filter((item) => item.id !== itemId));
        if (editingItem?.id === itemId) {
          setShowModal(false);
          resetForm();
        }
      }
    } catch (err) {
      console.error('Failed to delete calendar item:', err);
    }
  };

  const handleDuplicateItem = async (item: CalendarItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!channel) return;

    try {
      const res = await fetch('http://localhost:4000/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId: channel.id,
          title: `${item.title} (copy)`,
          scheduledDate: item.scheduledDate,
          scheduledTime: item.scheduledTime,
          status: item.status,
          contentType: item.contentType,
          notes: item.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setItems([...items, { ...data.data, scheduledDate: normalizeDate(data.data.scheduledDate) }]);
      }
    } catch (err) {
      console.error('Failed to duplicate calendar item:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Date', 'Time', 'Status', 'Content Type', 'Notes'];
    const rows = items.map((item) => [
      item.title,
      item.scheduledDate,
      item.scheduledTime || '',
      item.status,
      item.contentType,
      item.notes || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const days = getDaysInMonth(currentDate);
  const monthName = months[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  if (loading && !channel) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Navigation skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>

        {/* Calendar skeleton */}
        <div className="border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 m-2" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-muted/30">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[120px] p-2 bg-card">
                <Skeleton className="h-7 w-7 rounded-full mb-2" />
                {i % 4 === 0 && <Skeleton className="h-6 w-full rounded" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Background decoration */}
      <FloatingShapes className="fixed" />

      {/* Header */}
      <div className="relative flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">Content Calendar</h1>
            <GlowingBadge color="purple">
              <Calendar className="w-3 h-3 mr-1" />
              {items.length} items
            </GlowingBadge>
          </div>
          <p className="text-muted-foreground">
            Plan and schedule your content
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            disabled={items.length === 0}
            className="flex items-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 hover:scale-105 transition-all disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => openAddModal()}
            className="group flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            Add Content
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="relative flex items-center justify-between p-4 bg-card border rounded-2xl animate-fade-in animation-delay-100">
        <button
          onClick={prevMonth}
          className="p-2.5 hover:bg-muted rounded-xl hover:scale-110 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 text-xl font-semibold hover:bg-muted px-6 py-2.5 rounded-xl transition-all hover:scale-105"
          >
            {monthName} {year}
            <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", showDatePicker && "rotate-180")} />
          </button>

          {/* Date Picker Dropdown */}
          {showDatePicker && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-card border rounded-2xl shadow-xl p-5 z-50 min-w-[320px] animate-fade-in">
              {/* Year selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Year</label>
                <div className="flex flex-wrap gap-2">
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => goToYear(y)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-lg transition-all hover:scale-105",
                        y === year
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "hover:bg-muted"
                      )}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Month</label>
                <div className="grid grid-cols-3 gap-2">
                  {months.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => goToMonth(idx)}
                      className={cn(
                        "px-3 py-2 text-sm rounded-lg transition-all hover:scale-105",
                        idx === currentDate.getMonth() && year === currentDate.getFullYear()
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "hover:bg-muted"
                      )}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Today button */}
              <button
                onClick={goToToday}
                className="w-full px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 border border-primary/20 rounded-xl transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Go to Today
              </button>
            </div>
          )}
        </div>

        <button
          onClick={nextMonth}
          className="p-2.5 hover:bg-muted rounded-xl hover:scale-110 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-2xl overflow-hidden shadow-sm animate-fade-in animation-delay-200">
        <div className="grid grid-cols-7 bg-gradient-to-r from-muted/80 via-muted/50 to-muted/80">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
            <div
              key={day}
              className={cn(
                'p-3 text-center font-semibold text-sm border-b',
                (i === 0 || i === 6) && 'text-muted-foreground'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayItems = day ? getItemsForDay(day) : [];
            const dateStr = day
              ? `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              : '';
            const isFirstCol = index % 7 === 0;
            const isWeekend = index % 7 === 0 || index % 7 === 6;
            const hasItems = dayItems.length > 0;

            return (
              <div
                key={index}
                className={cn(
                  'min-h-[120px] p-2 border-b border-r cursor-pointer transition-all duration-200',
                  isFirstCol && 'border-l-0',
                  day ? 'bg-card hover:bg-muted/50' : 'bg-muted/20 cursor-default',
                  isToday(day!) && 'bg-primary/5 ring-2 ring-inset ring-primary/20',
                  isWeekend && day && 'bg-muted/30',
                  hasItems && 'hover:shadow-inner'
                )}
                onClick={() => day && openAddModal(dateStr)}
              >
                {day && (
                  <>
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-8 h-8 text-sm rounded-full transition-all',
                        isToday(day)
                          ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 animate-pulse-slow'
                          : 'hover:bg-muted'
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1 stagger-children">
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                          }}
                          className={cn(
                            'px-2 py-1.5 rounded-lg text-xs border-l-3 group relative cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm',
                            statusColors[item.status] || statusColors.idea
                          )}
                          title={item.title}
                        >
                          <div className="flex items-center gap-1.5">
                            {item.contentType === 'short' ? (
                              <Clock className="w-3 h-3 flex-shrink-0" />
                            ) : (
                              <Video className="w-3 h-3 flex-shrink-0" />
                            )}
                            <span className="truncate font-medium">{item.title}</span>
                            <div className="hidden group-hover:flex ml-auto gap-0.5">
                              <button
                                onClick={(e) => handleDuplicateItem(item, e)}
                                className="p-1 hover:bg-black/10 rounded-md transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteItem(item.id, e)}
                                className="p-1 hover:bg-red-500/20 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-4 bg-card border rounded-2xl animate-fade-in animation-delay-300">
        <span className="text-sm font-medium text-muted-foreground mr-2">Status:</span>
        {Object.entries(statusColors).map(([status, color]) => (
          <div
            key={status}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-default"
          >
            <div className={cn('w-2.5 h-2.5 rounded-full', color.split(' ')[0])} />
            <span className="text-sm capitalize font-medium">{status}</span>
          </div>
        ))}
      </div>

      {/* Add/Edit Content Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">
                  {editingItem ? 'Edit Calendar Item' : 'Add Content to Calendar'}
                </h3>
              </div>
              <button
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                      setShowModal(false);
                      resetForm();
                    }
                  } else {
                    setShowModal(false);
                    resetForm();
                  }
                }}
                className="p-2 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="Video title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value="idea">Idea</option>
                    <option value="scripting">Scripting</option>
                    <option value="filming">Filming</option>
                    <option value="editing">Editing</option>
                    <option value="ready">Ready</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Content Type</label>
                  <select
                    value={formData.contentType}
                    onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value="long_form">Long Form Video</option>
                    <option value="short">Short</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-6 pt-4 border-t">
              <div className="flex gap-2">
                {editingItem && (
                  <>
                    <button
                      onClick={() => handleDeleteItem(editingItem.id)}
                      className="px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                    >
                      Delete
                    </button>
                    <button
                      onClick={(e) => {
                        handleDuplicateItem(editingItem, e);
                        setShowModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2.5 text-sm font-medium hover:bg-muted rounded-xl transition-all"
                    >
                      Duplicate
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                        setShowModal(false);
                        resetForm();
                      }
                    } else {
                      setShowModal(false);
                      resetForm();
                    }
                  }}
                  className="px-4 py-2.5 text-sm font-medium hover:bg-muted rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={saving || !formData.title || !formData.scheduledDate}
                  className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : editingItem ? 'Save Changes' : 'Add to Calendar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
