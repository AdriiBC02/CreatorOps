'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Lightbulb, GripVertical, Trash2, ExternalLink, Search, X, Copy, Download, Sparkles, Check, Filter, ChevronDown, LayoutGrid, List, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { SkeletonKanban } from '@/components/ui/skeleton';
import { FloatingShapes, GlowingBadge } from '@/components/ui/decorative';
import { cn } from '@/lib/utils';
import { onIdeasUpdate } from '@/lib/events';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type CollisionDetection,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
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
  sortOrder?: number;
}

interface Channel {
  id: string;
  title: string;
}

const statusColumns = [
  { id: 'new', titleKey: 'columns.new', color: 'from-gray-400 to-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900/20' },
  { id: 'researching', titleKey: 'columns.researching', color: 'from-blue-400 to-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'approved', titleKey: 'columns.approved', color: 'from-green-400 to-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'in_production', titleKey: 'columns.in_production', color: 'from-purple-400 to-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
];

const priorityConfig: Record<number, { labelKey: string; color: string; dot: string }> = {
  0: { labelKey: 'priority.low', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
  1: { labelKey: 'priority.medium', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400', dot: 'bg-blue-400' },
  2: { labelKey: 'priority.high', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400', dot: 'bg-amber-400' },
  3: { labelKey: 'priority.urgent', color: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400', dot: 'bg-red-400' },
};

// Draggable Idea Card Component
function DraggableIdeaCard({
  idea,
  onEdit,
  onDelete,
  onDuplicate,
  onCopy,
  t,
}: {
  idea: Idea;
  onEdit: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onDuplicate: (idea: Idea) => void;
  onCopy: (text: string) => void;
  t: (key: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id, data: { idea, type: 'idea' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[idea.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group p-4 rounded-xl border bg-card shadow-sm transition-all duration-200',
        isDragging
          ? 'opacity-50 shadow-xl ring-2 ring-primary scale-[1.02]'
          : 'hover:shadow-md hover:border-primary/20'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-1 -ml-1 cursor-grab active:cursor-grabbing touch-none rounded-md hover:bg-muted transition-colors"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className="font-semibold text-sm line-clamp-2 cursor-pointer hover:text-primary transition-colors"
              onClick={() => onEdit(idea)}
              title={idea.title}
            >
              {idea.title}
            </h4>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onCopy(idea.title)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                title={t('actions.copyTitle')}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDuplicate(idea)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                title={t('actions.duplicate')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(idea.id)}
                className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                title={t('actions.delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {idea.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2" title={idea.description}>
              {idea.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
              priority.color
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
              {t(priority.labelKey)}
            </span>
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
              {idea.contentType === 'short' ? t('contentType.short') : t('contentType.video')}
            </span>
          </div>

          {idea.inspirationUrls && idea.inspirationUrls.length > 0 && (
            <a
              href={idea.inspirationUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {t('actions.reference')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({
  column,
  ideas,
  onEdit,
  onDelete,
  onDuplicate,
  onCopy,
  t,
}: {
  column: typeof statusColumns[0];
  ideas: Idea[];
  onEdit: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onDuplicate: (idea: Idea) => void;
  onCopy: (text: string) => void;
  t: (key: string) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', status: column.id },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('w-1 h-6 rounded-full bg-gradient-to-b', column.color)} />
        <h3 className="font-semibold text-sm">{t(column.titleKey)}</h3>
        <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {ideas.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-3 p-3 rounded-xl transition-all duration-200 min-h-[300px]',
          column.bgColor,
          isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
      >
        <SortableContext items={ideas.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {ideas.map((idea) => (
            <DraggableIdeaCard
              key={idea.id}
              idea={idea}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onCopy={onCopy}
              t={t}
            />
          ))}
        </SortableContext>

        {ideas.length === 0 && (
          <div className={cn(
            'flex flex-col items-center justify-center py-12 text-muted-foreground rounded-xl border-2 border-dashed',
            isOver ? 'border-primary bg-primary/5' : 'border-muted'
          )}>
            <Lightbulb className={cn('w-8 h-8 mb-2', isOver && 'text-primary')} />
            <p className="text-sm font-medium">{isOver ? t('empty.dropHere') : t('empty.noIdeas')}</p>
            <p className="text-xs mt-1">{t('empty.dragHere')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IdeasPage() {
  const { t } = useTranslation('ideas');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<number | 'all'>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ideas-view-mode') as 'kanban' | 'list') || 'kanban';
    }
    return 'kanban';
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Vim-like navigation
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'long_form',
    priority: 1,
    status: 'new',
    inspirationUrl: '',
  });

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ title: string; description: string; reason: string }>>([]);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Custom collision detection
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    if (pointerCollisions.length > 0) {
      // Check if we're hovering over an idea
      const ideaCollision = pointerCollisions.find(
        collision => ideas.some(idea => idea.id === collision.id)
      );

      // If hovering over an idea, prioritize it (for reordering within column)
      if (ideaCollision) {
        return [ideaCollision];
      }

      // Otherwise, check for column collision (for moving between columns)
      const columnCollision = pointerCollisions.find(
        collision => statusColumns.some(col => col.id === collision.id)
      );
      if (columnCollision) {
        return [columnCollision];
      }

      return pointerCollisions;
    }

    // Fallback to rect intersection
    return rectIntersection(args);
  };

  useEffect(() => {
    fetchChannel();
  }, []);

  useEffect(() => {
    if (channel) {
      fetchIdeas();
    }
  }, [channel]);

  useEffect(() => {
    const unsubscribe = onIdeasUpdate(() => {
      if (channel) {
        fetchIdeas();
      }
    });
    return unsubscribe;
  }, [channel]);

  const hasUnsavedChanges = showModal && formData.title.trim() !== '';

  // Moved here so it's available in the keyboard event handler
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(search.toLowerCase()) ||
      idea.description?.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || idea.priority === priorityFilter;
    const matchesContentType = contentTypeFilter === 'all' || idea.contentType === contentTypeFilter;
    return matchesSearch && matchesPriority && matchesContentType;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputActive = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // N for new idea
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !showModal && !isInputActive) {
        e.preventDefault();
        openAddModal();
      }

      // Escape to close modal
      if (e.key === 'Escape' && showModal) {
        if (hasUnsavedChanges) {
          if (confirm(t('confirm.unsavedChanges'))) {
            setShowModal(false);
            resetForm();
          }
        } else {
          setShowModal(false);
          resetForm();
        }
      }

      // Vim-like navigation (only in list view, when no modal is open)
      if (viewMode === 'list' && !showModal && !showAiSuggestions && !isInputActive) {
        // j - move down
        if (e.key === 'j') {
          e.preventDefault();
          setFocusedIndex(prev =>
            prev < filteredIdeas.length - 1 ? prev + 1 : prev
          );
        }
        // k - move up
        if (e.key === 'k') {
          e.preventDefault();
          setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
        }
        // Enter - open focused idea
        if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredIdeas.length) {
          e.preventDefault();
          openEditModal(filteredIdeas[focusedIndex]);
        }
        // Space - toggle selection of focused idea
        if (e.key === ' ' && focusedIndex >= 0 && focusedIndex < filteredIdeas.length) {
          e.preventDefault();
          toggleSelectIdea(filteredIdeas[focusedIndex].id);
        }
        // g then g - go to top (first idea)
        if (e.key === 'g') {
          // This is simplified - full vim would need key sequence detection
          setFocusedIndex(0);
        }
        // G - go to bottom (last idea)
        if (e.key === 'G') {
          e.preventDefault();
          setFocusedIndex(filteredIdeas.length - 1);
        }
        // x - delete focused idea
        if (e.key === 'x' && focusedIndex >= 0 && focusedIndex < filteredIdeas.length) {
          e.preventDefault();
          deleteIdea(filteredIdeas[focusedIndex].id);
        }
        // Escape - clear focus
        if (e.key === 'Escape') {
          setFocusedIndex(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, hasUnsavedChanges, viewMode, showAiSuggestions, focusedIndex, filteredIdeas, t]);

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

  // Persist view mode preference and clear selection when switching views
  useEffect(() => {
    localStorage.setItem('ideas-view-mode', viewMode);
    // Clear selection when switching away from list view
    if (viewMode !== 'list') {
      setSelectedIds(new Set());
    }
  }, [viewMode]);

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

  const saveIdeasOrder = async (reorderedIdeas: Idea[]) => {
    if (!channel) return;

    try {
      await fetch('http://localhost:4000/ideas/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId: channel.id,
          ideaIds: reorderedIdeas.map((idea) => idea.id),
        }),
      });
    } catch (err) {
      console.error('Failed to save ideas order:', err);
    }
  };

  const deleteIdea = async (ideaId: string) => {
    if (!confirm(t('confirm.deleteIdea'))) return;

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

  // Bulk Selection Functions
  const toggleSelectIdea = (ideaId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(ideaId)) {
      newSelected.delete(ideaId);
    } else {
      newSelected.add(ideaId);
    }
    setSelectedIds(newSelected);
  };

  const selectAllIdeas = () => {
    if (selectedIds.size === filteredIdeas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIdeas.map(i => i.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkActions(false);
  };

  const bulkChangeStatus = async (newStatus: string) => {
    if (selectedIds.size === 0) return;

    try {
      const updatePromises = Array.from(selectedIds).map(ideaId =>
        fetch(`http://localhost:4000/ideas/${ideaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus }),
        })
      );

      await Promise.all(updatePromises);

      setIdeas(ideas.map(idea =>
        selectedIds.has(idea.id) ? { ...idea, status: newStatus } : idea
      ));
      clearSelection();
    } catch (err) {
      console.error('Failed to bulk update status:', err);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('confirm.bulkDelete', { count: selectedIds.size }))) return;

    try {
      const deletePromises = Array.from(selectedIds).map(ideaId =>
        fetch(`http://localhost:4000/ideas/${ideaId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      );

      await Promise.all(deletePromises);

      setIdeas(ideas.filter(idea => !selectedIds.has(idea.id)));
      clearSelection();
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    }
  };

  // AI Functions
  const generateAiSuggestions = async (customPrompt?: string) => {
    if (!channel) return;

    try {
      setAiLoading(true);
      if (!showAiSuggestions) setShowAiSuggestions(true);

      const res = await fetch('http://localhost:4000/ai/generate/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId: channel.id,
          count: 5,
          basedOn: 'performance',
          customPrompt: customPrompt || aiPrompt || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiSuggestions(data.data.ideas);
      }
    } catch (err) {
      console.error('Failed to generate AI suggestions:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const openAiSuggestionsModal = () => {
    setAiPrompt('');
    setAiSuggestions([]);
    setShowAiSuggestions(true);
  };

  const generateAiDescription = async () => {
    if (!formData.title) return;

    try {
      setGeneratingDescription(true);

      const res = await fetch('http://localhost:4000/ai/generate/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          length: 'short',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormData({ ...formData, description: data.data.description });
      }
    } catch (err) {
      console.error('Failed to generate description:', err);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const useAiSuggestion = (suggestion: { title: string; description: string }) => {
    setFormData({
      ...formData,
      title: suggestion.title,
      description: suggestion.description,
    });
    setShowAiSuggestions(false);
    setShowModal(true);
  };

  const exportToCSV = () => {
    const headers = [t('idea.title'), t('idea.description'), t('idea.status'), t('idea.priority'), t('idea.contentType'), 'Created At'];
    const rows = ideas.map((idea) => [
      idea.title,
      idea.description || '',
      t(`status.${idea.status}`),
      t(priorityConfig[idea.priority].labelKey),
      idea.contentType === 'short' ? t('contentType.short') : t('contentType.long_form'),
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

  const exportToJSON = () => {
    const exportData = ideas.map((idea) => ({
      title: idea.title,
      description: idea.description,
      status: idea.status,
      priority: idea.priority,
      contentType: idea.contentType,
      inspirationUrls: idea.inspirationUrls,
      createdAt: idea.createdAt,
    }));

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ideas.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdea = ideas.find((i) => i.id === active.id);
    if (!activeIdea) return;

    const overId = over.id as string;

    // Check if dropping on another idea (for reordering or moving to that idea's column)
    const overIdea = ideas.find((i) => i.id === overId);
    if (overIdea) {
      // Only update status if moving to a different column
      if (overIdea.status !== activeIdea.status) {
        setIdeas((prev) =>
          prev.map((idea) =>
            idea.id === activeIdea.id ? { ...idea, status: overIdea.status } : idea
          )
        );
      }
      // If same column, don't do anything in dragOver - reordering happens in dragEnd
      return;
    }

    // Check if dropping on a column directly (empty area)
    const targetColumn = statusColumns.find((col) => col.id === overId);
    if (targetColumn && targetColumn.id !== activeIdea.status) {
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === activeIdea.id ? { ...idea, status: targetColumn.id } : idea
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdea = ideas.find((i) => i.id === active.id);
    if (!activeIdea) return;

    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = statusColumns.find((col) => col.id === overId);
    if (targetColumn) {
      if (targetColumn.id !== activeIdea.status) {
        // Status already updated in handleDragOver, just sync with backend
        updateIdeaStatus(activeIdea.id, targetColumn.id);
        // Also save the order after status change
        saveIdeasOrder(ideas.map(idea =>
          idea.id === activeIdea.id ? { ...idea, status: targetColumn.id } : idea
        ));
      }
      return;
    }

    // Check if dropped on another idea
    const overIdea = ideas.find((i) => i.id === overId);
    if (overIdea) {
      // Reordering within the same column
      if (overIdea.status === activeIdea.status && active.id !== over.id) {
        const oldIndex = ideas.findIndex((i) => i.id === active.id);
        const newIndex = ideas.findIndex((i) => i.id === over.id);
        const reorderedIdeas = arrayMove(ideas, oldIndex, newIndex);
        setIdeas(reorderedIdeas);
        saveIdeasOrder(reorderedIdeas);
      } else if (overIdea.status !== activeIdea.status) {
        // Status already updated in handleDragOver, just sync with backend
        updateIdeaStatus(activeIdea.id, overIdea.status);
        // Also save the order after status change
        saveIdeasOrder(ideas.map(idea =>
          idea.id === activeIdea.id ? { ...idea, status: overIdea.status } : idea
        ));
      }
    }
  };

  const getIdeasByStatus = (status: string) =>
    filteredIdeas.filter((idea) => idea.status === status);

  const activeIdea = activeId ? ideas.find((i) => i.id === activeId) : null;

  const hasActiveFilters = priorityFilter !== 'all' || contentTypeFilter !== 'all' || search !== '';

  const clearAllFilters = () => {
    setSearch('');
    setPriorityFilter('all');
    setContentTypeFilter('all');
  };

  if (loading && !channel) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('header.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('header.subtitle')}</p>
          </div>
        </div>
        <SkeletonKanban columns={4} cardsPerColumn={3} />
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Background decoration */}
      <FloatingShapes className="fixed" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{t('header.title')}</h1>
            <GlowingBadge color="purple">
              <Lightbulb className="w-3 h-3 mr-1" />
              {ideas.length}
            </GlowingBadge>
          </div>
          <p className="text-muted-foreground">
            {t('header.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex rounded-xl border bg-muted/50 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                viewMode === 'kanban'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={t('view.kanban')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                viewMode === 'list'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={t('view.list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {/* Export dropdown */}
          <div className="relative group">
            <button
              className="btn-glass px-4 py-2 rounded-xl flex items-center gap-2"
              title={t('actions.export')}
            >
              <Download className="w-4 h-4" />
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-10">
              <div className="glass-card rounded-xl py-1 min-w-[140px] shadow-xl border">
                <button
                  onClick={exportToCSV}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  {t('actions.exportCSV')}
                </button>
                <button
                  onClick={exportToJSON}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  {t('actions.exportJSON')}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={openAiSuggestionsModal}
            className="btn px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
            title={t('actions.suggestAI')}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{t('actions.suggestAI')}</span>
          </button>
          <button
            onClick={openAddModal}
            className="btn-primary px-4 py-2 rounded-xl"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">{t('actions.newIdea')}</span>
          </button>
        </div>
      </div>

      {/* Copied notification */}
      {copied && (
        <div className="fixed top-4 right-4 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-lg z-50 animate-slide-in-right">
          <Check className="w-4 h-4" />
          {t('copied')}
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('filters.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-11 pr-10 w-full"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn-secondary px-4 py-2 flex items-center gap-2',
              showFilters && 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <Filter className="w-4 h-4" />
            {t('filters.filters')}
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-muted/30 border animate-fade-in">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('priority.label')}</label>
              <select
                value={priorityFilter === 'all' ? 'all' : priorityFilter.toString()}
                onChange={(e) => setPriorityFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="input py-1.5 px-3 min-w-[120px]"
              >
                <option value="all">{t('filters.all')}</option>
                <option value="0">{t('priority.low')}</option>
                <option value="1">{t('priority.medium')}</option>
                <option value="2">{t('priority.high')}</option>
                <option value="3">{t('priority.urgent')}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.type')}</label>
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value)}
                className="input py-1.5 px-3 min-w-[120px]"
              >
                <option value="all">{t('filters.all')}</option>
                <option value="long_form">{t('contentType.video')}</option>
                <option value="short">{t('contentType.short')}</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('filters.clearAll')}
              </button>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredIdeas.length === 1 ? t('filters.found', { count: filteredIdeas.length }) : t('filters.found_plural', { count: filteredIdeas.length })}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar - Sticky at top */}
      {selectedIds.size > 0 && viewMode === 'list' && (
        <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-lg border-b animate-fade-in">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="font-medium">{t('bulk.selected', { count: selectedIds.size })}</span>
            </div>

            <div className="w-px h-6 bg-border hidden sm:block" />

            {/* Move to status dropdown */}
            <div className="relative group">
              <button className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
                {t('bulk.moveTo')}
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 pt-1 hidden group-hover:block z-50">
                <div className="glass-card rounded-xl py-2 min-w-[160px] shadow-xl border">
                  {statusColumns.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => bulkChangeStatus(col.id)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                    >
                      <div className={cn('w-2 h-2 rounded-full bg-gradient-to-b', col.color)} />
                      {t(col.titleKey)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={bulkDelete}
              className="btn-ghost px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t('bulk.delete')}
            </button>

            <div className="w-px h-6 bg-border hidden sm:block" />

            <button
              onClick={clearSelection}
              className="btn-ghost px-4 py-2 text-sm"
            >
              {t('bulk.deselectAll')}
            </button>
          </div>
        </div>
      )}

      {/* View: Kanban or List */}
      {viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statusColumns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                ideas={getIdeasByStatus(column.id)}
                onEdit={openEditModal}
                onDelete={deleteIdea}
                onDuplicate={duplicateIdea}
                onCopy={copyToClipboard}
                t={t}
              />
            ))}
          </div>

          <DragOverlay>
            {activeIdea ? (
              <div className="p-4 rounded-xl border bg-card shadow-2xl w-72 rotate-3">
                <h4 className="font-semibold text-sm truncate">{activeIdea.title}</h4>
                <div className="flex items-center gap-2 mt-3">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                    priorityConfig[activeIdea.priority].color
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', priorityConfig[activeIdea.priority].dot)} />
                    {t(priorityConfig[activeIdea.priority].labelKey)}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-14 px-3 py-3">
                  <button
                    onClick={selectAllIdeas}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={selectedIds.size === filteredIdeas.length ? t('bulk.deselectAll') : t('bulk.selectAll')}
                  >
                    {selectedIds.size === filteredIdeas.length && filteredIdeas.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : selectedIds.size > 0 ? (
                      <div className="w-5 h-5 border-2 border-primary rounded flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary rounded-sm" />
                      </div>
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th className="text-left px-3 py-3 text-sm font-semibold">{t('idea.title')}</th>
                <th className="text-left px-3 py-3 text-sm font-semibold hidden md:table-cell w-28">{t('idea.status')}</th>
                <th className="text-left px-3 py-3 text-sm font-semibold hidden sm:table-cell w-24">{t('idea.priority')}</th>
                <th className="text-left px-3 py-3 text-sm font-semibold hidden lg:table-cell w-28">{t('idea.contentType')}</th>
                <th className="text-left px-3 py-3 text-sm font-semibold hidden lg:table-cell w-24">{t('list.created')}</th>
                <th className="text-right px-3 py-3 text-sm font-semibold w-28">{t('list.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredIdeas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{t('empty.noIdeas')}</p>
                  </td>
                </tr>
              ) : (
                filteredIdeas.map((idea, index) => {
                  const priority = priorityConfig[idea.priority];
                  const statusColumn = statusColumns.find(c => c.id === idea.status);
                  const isSelected = selectedIds.has(idea.id);
                  const isFocused = focusedIndex === index;
                  return (
                    <tr
                      key={idea.id}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
                        isSelected && "bg-primary/5",
                        isFocused && "ring-2 ring-inset ring-primary bg-primary/10"
                      )}
                      onClick={() => openEditModal(idea)}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelectIdea(idea.id)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-1 h-8 rounded-full bg-gradient-to-b flex-shrink-0', statusColumn?.color || 'from-gray-400 to-gray-500')} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{idea.title}</p>
                            {idea.description && (
                              <p className="text-sm text-muted-foreground truncate">{idea.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="text-sm truncate block">{t(`status.${idea.status}`)}</span>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                          priority.color
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
                          {t(priority.labelKey)}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground truncate block">
                          {idea.contentType === 'short' ? t('contentType.short') : t('contentType.video')}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(idea.title); }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title={t('actions.copyTitle')}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); duplicateIdea(idea); }}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title={t('actions.duplicate')}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteIdea(idea.id); }}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            title={t('actions.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Keyboard navigation hint */}
          {filteredIdeas.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">j</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">k</kbd>
              <span className="mr-2">{t('keyboard.hint')}</span>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Idea Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="glass-modal vibrancy rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{editingIdea ? t('idea.edit') : t('idea.new')}</h3>
              <button
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (confirm(t('confirm.unsavedChanges'))) {
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
                <label className="block text-sm font-medium mb-2">{t('idea.title')} *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder={t('idea.titlePlaceholder')}
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">{t('idea.description')}</label>
                  <button
                    type="button"
                    onClick={generateAiDescription}
                    disabled={generatingDescription || !formData.title}
                    className="flex items-center gap-1.5 text-xs font-medium text-purple-500 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles className={cn('w-3.5 h-3.5', generatingDescription && 'animate-spin')} />
                    {generatingDescription ? t('ai.generatingDescription') : t('ai.generateDescription')}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="input resize-none"
                  placeholder={t('idea.descriptionPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('idea.contentType')}</label>
                  <select
                    value={formData.contentType}
                    onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                    className="input"
                  >
                    <option value="long_form">{t('contentType.long_form')}</option>
                    <option value="short">{t('contentType.short')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('idea.priority')}</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="input"
                  >
                    <option value={0}>{t('priority.low')}</option>
                    <option value={1}>{t('priority.medium')}</option>
                    <option value={2}>{t('priority.high')}</option>
                    <option value={3}>{t('priority.urgent')}</option>
                  </select>
                </div>
              </div>

              {editingIdea && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('idea.status')}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="new">{t('status.new')}</option>
                    <option value="researching">{t('status.researching')}</option>
                    <option value="approved">{t('status.approved')}</option>
                    <option value="in_production">{t('status.in_production')}</option>
                    <option value="completed">{t('status.completed')}</option>
                    <option value="archived">{t('status.archived')}</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">{t('idea.inspirationUrl')}</label>
                <input
                  type="url"
                  value={formData.inspirationUrl}
                  onChange={(e) => setFormData({ ...formData, inspirationUrl: e.target.value })}
                  className="input"
                  placeholder={t('idea.inspirationUrlPlaceholder')}
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
              <div>
                {editingIdea && (
                  <button
                    onClick={() => deleteIdea(editingIdea.id)}
                    className="btn-ghost px-4 py-2.5 text-destructive hover:bg-destructive/10"
                  >
                    {t('actions.delete')}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (confirm(t('confirm.unsavedCancel'))) {
                        setShowModal(false);
                        resetForm();
                      }
                    } else {
                      setShowModal(false);
                      resetForm();
                    }
                  }}
                  className="btn-ghost px-4 py-2.5"
                >
                  {t('actions.cancel')}
                </button>
                <button
                  onClick={handleSaveIdea}
                  disabled={saving || !formData.title}
                  className="btn-primary px-6 py-2.5"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : editingIdea ? (
                    t('actions.saveChanges')
                  ) : (
                    t('actions.addIdea')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions Modal */}
      {showAiSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="glass-modal vibrancy rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t('ai.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('ai.subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiSuggestions(false)}
                className="p-2 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Prompt Input */}
            <div className="mb-6 p-4 bg-muted/30 rounded-xl">
              <label className="block text-sm font-medium mb-2">
                {t('ai.prompt')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !aiLoading && generateAiSuggestions()}
                  placeholder={t('ai.promptPlaceholder')}
                  className="input"
                  disabled={aiLoading}
                />
                <button
                  onClick={() => generateAiSuggestions()}
                  disabled={aiLoading}
                  className="btn px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/40 disabled:opacity-50 whitespace-nowrap"
                >
                  {aiLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t('ai.generate')}
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('ai.leaveEmpty')}
              </p>
            </div>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 animate-pulse">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-muted-foreground">
                  {aiPrompt ? t('ai.generating', { topic: aiPrompt }) : t('ai.analyzingChannel')}
                </p>
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-4">
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="group p-4 border rounded-xl hover:border-purple-500/50 hover:shadow-md transition-all duration-200"
                  >
                    <h4 className="font-semibold mb-1">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                    <p className="text-xs text-purple-500 mb-4">{suggestion.reason}</p>
                    <button
                      onClick={() => useAiSuggestion(suggestion)}
                      className="btn-ghost text-sm text-primary hover:bg-primary/10"
                    >
                      {t('ai.useSuggestion')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">{t('ai.readyToGenerate')}</p>
                <p className="text-sm text-muted-foreground">{t('ai.enterTopic')}</p>
              </div>
            )}

            <div className="flex justify-end mt-6 pt-6 border-t">
              <button
                onClick={() => setShowAiSuggestions(false)}
                className="btn-ghost px-4 py-2.5"
              >
                {t('actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
