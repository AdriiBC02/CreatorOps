'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Lightbulb, GripVertical, Trash2, ExternalLink, Search, X, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Idea {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  priority: number;
  status: string;
  inspirationUrls: string[] | null;
  createdAt: string;
}

interface Channel {
  id: string;
  title: string;
}

const statusColumns = [
  { id: 'new', title: 'New Ideas', color: 'border-gray-400' },
  { id: 'researching', title: 'Researching', color: 'border-blue-400' },
  { id: 'approved', title: 'Approved', color: 'border-green-400' },
  { id: 'in_production', title: 'In Production', color: 'border-purple-400' },
];

const priorityColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  1: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  2: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
  3: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
};

const priorityLabels: Record<number, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Urgent',
};

// Draggable Idea Card Component
function DraggableIdeaCard({
  idea,
  onEdit,
  onDelete,
  onDuplicate,
  onCopy,
}: {
  idea: Idea;
  onEdit: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onDuplicate: (idea: Idea) => void;
  onCopy: (text: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id, data: { idea } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-4 rounded-lg border bg-card hover:shadow-md transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-primary'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h4
              className="font-medium line-clamp-2 cursor-pointer hover:text-primary"
              onClick={() => onEdit(idea)}
              title={idea.title}
            >
              {idea.title}
            </h4>
            {idea.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2" title={idea.description}>
                {idea.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopy(idea.title)}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Copy title"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDuplicate(idea)}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Duplicate"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(idea.id)}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityColors[idea.priority])}>
          {priorityLabels[idea.priority]}
        </span>
        <span className="px-2 py-0.5 rounded text-xs bg-muted">
          {idea.contentType === 'short' ? 'Short' : 'Video'}
        </span>
      </div>

      {idea.inspirationUrls && idea.inspirationUrls.length > 0 && (
        <div className="mt-2">
          <a
            href={idea.inspirationUrls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Reference
          </a>
        </div>
      )}
    </div>
  );
}

export default function IdeasPage() {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'long_form',
    priority: 1,
    status: 'new',
    inspirationUrl: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchChannel();
  }, []);

  useEffect(() => {
    if (channel) {
      fetchIdeas();
    }
  }, [channel]);

  // Check for unsaved changes
  const hasUnsavedChanges = showModal && formData.title.trim() !== '';

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !showModal) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          openAddModal();
        }
      }
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

  const fetchIdeas = async () => {
    if (!channel) return;

    try {
      setLoading(true);
      const res = await fetch(`http://localhost:4000/ideas?channelId=${channel.id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setIdeas(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      contentType: 'long_form',
      priority: 1,
      status: 'new',
      inspirationUrl: '',
    });
    setEditingIdea(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (idea: Idea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description || '',
      contentType: idea.contentType,
      priority: idea.priority,
      status: idea.status,
      inspirationUrl: idea.inspirationUrls?.[0] || '',
    });
    setShowModal(true);
  };

  const handleSaveIdea = async () => {
    if (!channel || !formData.title) return;

    try {
      setSaving(true);

      const payload = {
        channelId: channel.id,
        title: formData.title,
        description: formData.description || null,
        contentType: formData.contentType,
        priority: formData.priority,
        status: formData.status,
        inspirationUrls: formData.inspirationUrl ? [formData.inspirationUrl] : null,
      };

      if (editingIdea) {
        const res = await fetch(`http://localhost:4000/ideas/${editingIdea.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          setIdeas(ideas.map((idea) => (idea.id === editingIdea.id ? data.data : idea)));
        }
      } else {
        const res = await fetch('http://localhost:4000/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          setIdeas([...ideas, data.data]);
        }
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save idea:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateIdeaStatus = async (ideaId: string, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:4000/ideas/${ideaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        setIdeas(ideas.map((idea) => (idea.id === ideaId ? { ...idea, status: newStatus } : idea)));
      }
    } catch (err) {
      console.error('Failed to update idea:', err);
    }
  };

  const deleteIdea = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return;

    try {
      const res = await fetch(`http://localhost:4000/ideas/${ideaId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setIdeas(ideas.filter((idea) => idea.id !== ideaId));
        if (editingIdea?.id === ideaId) {
          setShowModal(false);
          resetForm();
        }
      }
    } catch (err) {
      console.error('Failed to delete idea:', err);
    }
  };

  const duplicateIdea = async (idea: Idea) => {
    if (!channel) return;

    try {
      const res = await fetch('http://localhost:4000/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId: channel.id,
          title: `${idea.title} (copy)`,
          description: idea.description,
          contentType: idea.contentType,
          priority: idea.priority,
          status: 'new',
          inspirationUrls: idea.inspirationUrls,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIdeas([...ideas, data.data]);
      }
    } catch (err) {
      console.error('Failed to duplicate idea:', err);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Description', 'Status', 'Priority', 'Content Type', 'Created At'];
    const rows = ideas.map((idea) => [
      idea.title,
      idea.description || '',
      idea.status,
      priorityLabels[idea.priority],
      idea.contentType,
      new Date(idea.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ideas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdea = ideas.find((i) => i.id === active.id);
    if (!activeIdea) return;

    // Check if dropped on a column
    const targetStatus = statusColumns.find((col) => col.id === over.id)?.id;

    // Or check if dropped on another idea
    const targetIdea = ideas.find((i) => i.id === over.id);
    const targetStatusFromIdea = targetIdea?.status;

    const newStatus = targetStatus || targetStatusFromIdea;

    if (newStatus && newStatus !== activeIdea.status) {
      updateIdeaStatus(activeIdea.id, newStatus);
    }
  };

  const filteredIdeas = ideas.filter(
    (idea) =>
      idea.title.toLowerCase().includes(search.toLowerCase()) ||
      idea.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getIdeasByStatus = (status: string) =>
    filteredIdeas.filter((idea) => idea.status === status).sort((a, b) => b.priority - a.priority);

  const activeIdea = activeId ? ideas.find((i) => i.id === activeId) : null;

  if (loading && !channel) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Ideas</h1>
          <p className="text-muted-foreground mt-1">
            Organize and track your video ideas · <span className="text-xs">Press N for new idea</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            New Idea
          </button>
        </div>
      </div>

      {/* Copied notification */}
      {copied && (
        <div className="fixed top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-50">
          Copied to clipboard!
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search ideas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Kanban Board with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusColumns.map((column) => {
            const columnIdeas = getIdeasByStatus(column.id);
            return (
              <div key={column.id} className="space-y-3">
                <div className={cn('flex items-center gap-2 pb-2 border-b-2', column.color)}>
                  <h3 className="font-semibold">{column.title}</h3>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {columnIdeas.length}
                  </span>
                </div>

                <div
                  className="space-y-3 min-h-[200px] p-2 rounded-lg bg-muted/30"
                  id={column.id}
                >
                  {columnIdeas.map((idea) => (
                    <DraggableIdeaCard
                      key={idea.id}
                      idea={idea}
                      onEdit={openEditModal}
                      onDelete={deleteIdea}
                      onDuplicate={duplicateIdea}
                      onCopy={copyToClipboard}
                    />
                  ))}

                  {columnIdeas.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Lightbulb className="w-8 h-8 mb-2" />
                      <p className="text-sm">Drop ideas here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeIdea ? (
            <div className="p-4 rounded-lg border bg-card shadow-xl opacity-90 w-64">
              <h4 className="font-medium truncate">{activeIdea.title}</h4>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityColors[activeIdea.priority])}>
                  {priorityLabels[activeIdea.priority]}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add/Edit Idea Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingIdea ? 'Edit Idea' : 'New Content Idea'}</h3>
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
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Video idea title..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Describe your idea..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Content Type</label>
                  <select
                    value={formData.contentType}
                    onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="long_form">Long Form Video</option>
                    <option value="short">Short</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={0}>Low</option>
                    <option value={1}>Medium</option>
                    <option value={2}>High</option>
                    <option value={3}>Urgent</option>
                  </select>
                </div>
              </div>

              {editingIdea && (
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="new">New</option>
                    <option value="researching">Researching</option>
                    <option value="approved">Approved</option>
                    <option value="in_production">In Production</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Inspiration URL</label>
                <input
                  type="url"
                  value={formData.inspirationUrl}
                  onChange={(e) => setFormData({ ...formData, inspirationUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-6">
              <div>
                {editingIdea && (
                  <button
                    onClick={() => deleteIdea(editingIdea.id)}
                    className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    Delete
                  </button>
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
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIdea}
                  disabled={saving || !formData.title}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingIdea ? 'Save Changes' : 'Add Idea'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
