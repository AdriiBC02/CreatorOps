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

type Tool = 'select' | 'text' | 'rect' | 'circle' | 'triangle' | 'image';

const FONTS = [
  { name: 'Impact', value: 'Impact' },
  { name: 'Arial Black', value: 'Arial Black' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Helvetica', value: 'Helvetica' },
  { name: 'Verdana', value: 'Verdana' },
];

const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF6600', '#9900FF',
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
    }
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
              <div className="p-2 border-t border-white/10 flex gap-1">
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
            )}
          </div>
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
