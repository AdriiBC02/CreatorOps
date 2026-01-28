'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Download,
  Type,
  Square,
  Circle,
  Triangle,
  Image as ImageIcon,
  Trash2,
  Undo2,
  Redo2,
  MousePointer2,
  ChevronUp,
  ChevronDown,
  Copy,
  Layers,
  Minus,
  ArrowRight,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  Smile,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Palette,
  LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamic import for Fabric.js (client-only)
const EditorCanvas = dynamic(() => import('./EditorCanvas'), { ssr: false });

interface ThumbnailEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string | null;
  videoTitle?: string;
  onSave?: (dataUrl: string) => void;
}

type Tool = 'select' | 'text' | 'rect' | 'circle' | 'triangle' | 'image' | 'line' | 'arrow';

const FONTS = [
  { name: 'Impact', value: 'Impact' },
  { name: 'Arial Black', value: 'Arial Black' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Helvetica', value: 'Helvetica' },
  { name: 'Verdana', value: 'Verdana' },
  { name: 'Georgia', value: 'Georgia' },
  { name: 'Times New Roman', value: 'Times New Roman' },
  { name: 'Courier New', value: 'Courier New' },
  { name: 'Comic Sans MS', value: 'Comic Sans MS' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS' },
];

const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF6600', '#9900FF',
];

const BACKGROUND_COLORS = [
  '#1a1a1a', '#000000', '#FFFFFF', '#1e3a5f', '#2d5016',
  '#5c1a1a', '#3d1a5c', '#1a3d5c', '#5c3d1a', '#3d5c1a',
];

const POPULAR_EMOJIS = ['🔥', '👀', '😱', '🎮', '💯', '⭐', '🚀', '💪', '🎯', '❤️', '😂', '🤯'];

// Pre-made templates
const TEMPLATES = [
  {
    id: 'gaming',
    name: 'Gaming',
    preview: '🎮',
    objects: [
      { type: 'rect', left: 0, top: 0, width: 1280, height: 720, fill: '#1a1a2e' },
      { type: 'i-text', text: 'EPIC MOMENT', left: 640, top: 200, fontSize: 100, fontFamily: 'Impact', fill: '#FFD700', stroke: '#000', strokeWidth: 5 },
      { type: 'i-text', text: 'YOU WON\'T BELIEVE THIS!', left: 640, top: 500, fontSize: 50, fontFamily: 'Arial Black', fill: '#FFFFFF', stroke: '#FF0000', strokeWidth: 3 },
    ],
  },
  {
    id: 'vlog',
    name: 'Vlog',
    preview: '📷',
    objects: [
      { type: 'rect', left: 0, top: 0, width: 1280, height: 720, fill: '#f5f5f5' },
      { type: 'i-text', text: 'MY STORY', left: 640, top: 300, fontSize: 120, fontFamily: 'Georgia', fill: '#333333' },
      { type: 'i-text', text: 'Watch Now', left: 640, top: 500, fontSize: 40, fontFamily: 'Arial', fill: '#666666' },
    ],
  },
  {
    id: 'tutorial',
    name: 'Tutorial',
    preview: '📚',
    objects: [
      { type: 'rect', left: 0, top: 0, width: 1280, height: 720, fill: '#0f172a' },
      { type: 'rect', left: 50, top: 50, width: 400, height: 620, fill: '#1e293b', rx: 20, ry: 20 },
      { type: 'i-text', text: 'HOW TO', left: 640, top: 200, fontSize: 80, fontFamily: 'Arial Black', fill: '#38bdf8' },
      { type: 'i-text', text: 'Step by Step Guide', left: 640, top: 400, fontSize: 50, fontFamily: 'Arial', fill: '#FFFFFF' },
    ],
  },
  {
    id: 'reaction',
    name: 'Reaction',
    preview: '😲',
    objects: [
      { type: 'rect', left: 0, top: 0, width: 1280, height: 720, fill: '#dc2626' },
      { type: 'i-text', text: 'OMG!!!', left: 640, top: 300, fontSize: 150, fontFamily: 'Impact', fill: '#FFFF00', stroke: '#000', strokeWidth: 8 },
    ],
  },
];

export default function ThumbnailEditorModal({
  isOpen,
  onClose,
  initialImage,
  videoTitle,
  onSave,
}: ThumbnailEditorModalProps) {
  const { t } = useTranslation('thumbnail-editor');
  const canvasRef = useRef<any>(null);

  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(72);
  const [fontFamily, setFontFamily] = useState('Impact');
  const [hasStroke, setHasStroke] = useState(true);
  const [layers, setLayers] = useState<any[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);

    if (tool === 'text') {
      canvasRef.current?.addText('Text', {
        fontFamily,
        fontSize,
        fill: selectedColor,
        stroke: hasStroke ? strokeColor : undefined,
        strokeWidth: hasStroke ? 3 : 0,
      });
      setActiveTool('select');
    } else if (tool === 'rect') {
      canvasRef.current?.addRect({
        fill: selectedColor,
        stroke: strokeColor,
        strokeWidth: 2,
      });
      setActiveTool('select');
    } else if (tool === 'circle') {
      canvasRef.current?.addCircle({
        fill: selectedColor,
        stroke: strokeColor,
        strokeWidth: 2,
      });
      setActiveTool('select');
    } else if (tool === 'triangle') {
      canvasRef.current?.addTriangle({
        fill: selectedColor,
        stroke: strokeColor,
        strokeWidth: 2,
      });
      setActiveTool('select');
    } else if (tool === 'line') {
      canvasRef.current?.addLine({
        stroke: selectedColor,
        strokeWidth: strokeWidth,
      });
      setActiveTool('select');
    } else if (tool === 'arrow') {
      canvasRef.current?.addArrow({
        stroke: selectedColor,
        strokeWidth: strokeWidth,
      });
      setActiveTool('select');
    }
  };

  const handleAddEmoji = (emoji: string) => {
    canvasRef.current?.addEmoji(emoji, { fontSize: 80 });
    setShowEmojis(false);
  };

  const handleLoadTemplate = (template: typeof TEMPLATES[0]) => {
    // Clear canvas and load template
    canvasRef.current?.clearCanvas();
    // Templates would need more complex handling - for now just add the elements
    template.objects.forEach((obj: any) => {
      if (obj.type === 'rect') {
        canvasRef.current?.addRect({
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth || 0,
        });
      } else if (obj.type === 'i-text') {
        canvasRef.current?.addText(obj.text, {
          fontFamily: obj.fontFamily,
          fontSize: obj.fontSize,
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth || 0,
        });
      }
    });
    setShowTemplates(false);
  };

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
    canvasRef.current?.setSelectedOpacity(value / 100);
  };

  const handleStrokeColorChange = (color: string) => {
    setStrokeColor(color);
    canvasRef.current?.setSelectedStroke(color);
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    canvasRef.current?.setSelectedStrokeWidth(width);
  };

  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color);
    canvasRef.current?.setBackgroundColor(color);
  };

  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          canvasRef.current?.addImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleExport = () => {
    const dataUrl = canvasRef.current?.exportPNG();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `thumbnail-${videoTitle || 'edited'}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleSave = () => {
    const dataUrl = canvasRef.current?.exportPNG();
    if (dataUrl && onSave) {
      onSave(dataUrl);
    }
    onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm(t('confirmClose'))) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();
  const handleDelete = () => canvasRef.current?.deleteSelected();
  const handleDuplicate = () => canvasRef.current?.duplicateSelected();
  const handleBringForward = () => canvasRef.current?.bringForward();
  const handleSendBackward = () => canvasRef.current?.sendBackward();

  const updateLayers = useCallback((newLayers: any[]) => {
    setLayers(newLayers);
    setHasChanges(true);
  }, []);

  const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedLayer(id);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          handleDelete();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-modal vibrancy rounded-2xl w-[95vw] max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-bold">{t('title')}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-16 border-r border-white/10 p-2 flex flex-col gap-1">
            <button
              onClick={() => setActiveTool('select')}
              className={cn(
                'p-3 rounded-lg transition-all',
                activeTool === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'
              )}
              title={t('tools.select')}
            >
              <MousePointer2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleToolClick('text')}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('tools.text')}
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleToolClick('rect')}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('tools.rectangle')}
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleToolClick('circle')}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('tools.circle')}
            >
              <Circle className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleToolClick('triangle')}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('tools.triangle')}
            >
              <Triangle className="w-5 h-5" />
            </button>
            <button
              onClick={handleUploadImage}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('tools.image')}
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <div className="w-full h-px bg-white/10 my-1" />

            <button
              onClick={() => handleToolClick('line')}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('tools.line')}
            >
              <Minus className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleToolClick('arrow')}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('tools.arrow')}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className={cn(
                  'p-3 rounded-lg transition-all',
                  showEmojis ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'
                )}
                title={t('tools.emoji')}
              >
                <Smile className="w-5 h-5" />
              </button>
              {showEmojis && (
                <div className="absolute left-full ml-2 top-0 glass-card rounded-xl p-2 z-50 grid grid-cols-4 gap-1 w-40">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddEmoji(emoji)}
                      className="p-2 text-xl hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full h-px bg-white/10 my-1" />

            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={cn(
                'p-3 rounded-lg transition-all',
                showTemplates ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'
              )}
              title={t('tools.templates')}
            >
              <LayoutTemplate className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <button
              onClick={handleUndo}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('actions.undo')}
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleRedo}
              className="p-3 rounded-lg hover:bg-white/10 transition-all"
              title={t('actions.redo')}
            >
              <Redo2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-3 rounded-lg hover:bg-white/10 text-red-400 transition-all"
              title={t('layers.delete')}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center bg-black/20 overflow-hidden p-4">
            <EditorCanvas
              ref={canvasRef}
              initialImage={initialImage}
              onLayersChange={updateLayers}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          {/* Right Panel - Layers */}
          <div className="w-56 border-l border-white/10 flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="font-medium">{t('layers.title')}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {layers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('layers.empty')}
                </p>
              ) : (
                <div className="space-y-1">
                  {[...layers].reverse().map((layer, index) => (
                    <div
                      key={layer.id}
                      onClick={() => canvasRef.current?.selectObject(layer.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 transition-colors',
                        selectedLayer === layer.id
                          ? 'bg-primary/20 border border-primary/50'
                          : 'hover:bg-white/10'
                      )}
                    >
                      {layer.type === 'text' && <Type className="w-4 h-4" />}
                      {layer.type === 'rect' && <Square className="w-4 h-4" />}
                      {layer.type === 'circle' && <Circle className="w-4 h-4" />}
                      {layer.type === 'triangle' && <Triangle className="w-4 h-4" />}
                      {layer.type === 'image' && <ImageIcon className="w-4 h-4" />}
                      <span className="truncate flex-1">
                        {layer.name || `${layer.type} ${layers.length - index}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Layer Actions */}
            {selectedLayer && (
              <div className="p-2 border-t border-white/10 space-y-2">
                {/* Layer ordering */}
                <div className="flex gap-1">
                  <button
                    onClick={handleBringForward}
                    className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                    title={t('layers.moveUp')}
                  >
                    <ChevronUp className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={handleSendBackward}
                    className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                    title={t('layers.moveDown')}
                  >
                    <ChevronDown className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                    title={t('layers.duplicate')}
                  >
                    <Copy className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 p-2 rounded-lg hover:bg-white/10 text-red-400 transition-all"
                    title={t('layers.delete')}
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </div>

                {/* Alignment tools */}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-muted-foreground mb-2">{t('align.title')}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => canvasRef.current?.alignLeft()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('align.left')}
                    >
                      <AlignLeft className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => canvasRef.current?.alignCenter()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('align.centerH')}
                    >
                      <AlignHorizontalJustifyCenter className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => canvasRef.current?.alignRight()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('align.right')}
                    >
                      <AlignRight className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => canvasRef.current?.alignTop()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('align.top')}
                    >
                      <AlignStartVertical className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => canvasRef.current?.alignMiddle()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('align.centerV')}
                    >
                      <AlignVerticalJustifyCenter className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => canvasRef.current?.alignBottom()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('align.bottom')}
                    >
                      <AlignEndVertical className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>

                {/* Transform tools */}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-muted-foreground mb-2">{t('transform.title')}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => canvasRef.current?.flipHorizontal()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('transform.flipH')}
                    >
                      <FlipHorizontal className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => canvasRef.current?.flipVertical()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('transform.flipV')}
                    >
                      <FlipVertical className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => canvasRef.current?.lockSelected()}
                      className="flex-1 p-2 rounded-lg hover:bg-white/10 transition-all"
                      title={t('transform.lock')}
                    >
                      <Lock className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>

                {/* Opacity slider */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{t('properties.opacity')}</p>
                    <span className="text-xs">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacity}
                    onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Templates Panel */}
          {showTemplates && (
            <div className="w-56 border-l border-white/10 flex flex-col">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  <span className="font-medium">{t('templates.title')}</span>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="p-1 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleLoadTemplate(template)}
                    className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="text-2xl mb-1">{template.preview}</div>
                    <div className="text-sm font-medium">{template.name}</div>
                  </button>
                ))}
              </div>

              {/* Background color */}
              <div className="p-3 border-t border-white/10">
                <p className="text-xs text-muted-foreground mb-2">{t('templates.background')}</p>
                <div className="grid grid-cols-5 gap-1">
                  {BACKGROUND_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleBackgroundColorChange(color)}
                      className={cn(
                        'w-8 h-8 rounded border-2 transition-all',
                        backgroundColor === color ? 'border-primary scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center gap-4">
          {/* Colors */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('text.color')}:</span>
            <div className="flex gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    canvasRef.current?.setSelectedColor(color);
                  }}
                  className={cn(
                    'w-6 h-6 rounded border-2 transition-all',
                    selectedColor === color ? 'border-primary scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-white/20" />

          {/* Font */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('text.font')}:</span>
            <select
              value={fontFamily}
              onChange={(e) => {
                setFontFamily(e.target.value);
                canvasRef.current?.setSelectedFont(e.target.value);
              }}
              className="px-2 py-1 rounded bg-white/10 border-0 text-sm"
            >
              {FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('text.size')}:</span>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => {
                const size = parseInt(e.target.value) || 72;
                setFontSize(size);
                canvasRef.current?.setSelectedFontSize(size);
              }}
              className="w-16 px-2 py-1 rounded bg-white/10 border-0 text-sm"
              min={12}
              max={200}
            />
          </div>

          {/* Stroke Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasStroke}
              onChange={(e) => setHasStroke(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">{t('text.stroke')}</span>
          </label>

          {hasStroke && (
            <>
              <div className="w-px h-6 bg-white/20" />

              {/* Stroke Color */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('text.strokeColor')}:</span>
                <div className="flex gap-1">
                  {COLORS.slice(0, 5).map((color) => (
                    <button
                      key={`stroke-${color}`}
                      onClick={() => handleStrokeColorChange(color)}
                      className={cn(
                        'w-5 h-5 rounded border-2 transition-all',
                        strokeColor === color ? 'border-primary scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke Width */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('text.strokeWidth')}:</span>
                <input
                  type="number"
                  value={strokeWidth}
                  onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value) || 1)}
                  className="w-12 px-2 py-1 rounded bg-white/10 border-0 text-sm"
                  min={1}
                  max={20}
                />
              </div>
            </>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('actions.download')}
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t('actions.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
