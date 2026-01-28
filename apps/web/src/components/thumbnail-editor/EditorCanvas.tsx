'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import * as fabric from 'fabric';

interface EditorCanvasProps {
  initialImage?: string | null;
  onLayersChange?: (layers: any[]) => void;
  onSelectionChange?: (id: string | null) => void;
}

interface Layer {
  id: string;
  type: string;
  name?: string;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

const EditorCanvas = forwardRef<any, EditorCanvasProps>(
  ({ initialImage, onLayersChange, onSelectionChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const [scale, setScale] = useState(1);

    // Initialize Fabric.js canvas
    useEffect(() => {
      if (!canvasRef.current || fabricRef.current) return;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#1a1a1a',
        selection: true,
        preserveObjectStacking: true,
      });

      fabricRef.current = canvas;

      // Load initial image if provided
      if (initialImage) {
        fabric.FabricImage.fromURL(initialImage, { crossOrigin: 'anonymous' }).then((img) => {
          // Scale image to fit canvas
          const scaleX = CANVAS_WIDTH / (img.width || 1);
          const scaleY = CANVAS_HEIGHT / (img.height || 1);
          const imgScale = Math.max(scaleX, scaleY);

          img.set({
            scaleX: imgScale,
            scaleY: imgScale,
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            selectable: true,
          });

          canvas.add(img);
          canvas.sendObjectToBack(img);
          canvas.renderAll();
          saveHistory();
          updateLayers();
        }).catch(console.error);
      }

      // Event handlers
      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);
      canvas.on('selection:cleared', () => onSelectionChange?.(null));
      canvas.on('object:modified', () => {
        saveHistory();
        updateLayers();
      });
      canvas.on('object:added', () => {
        updateLayers();
      });
      canvas.on('object:removed', () => {
        updateLayers();
      });

      // Initial history save
      saveHistory();

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    }, []);

    // Handle container resize
    useEffect(() => {
      const updateScale = () => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const containerWidth = container.clientWidth - 32;
        const containerHeight = container.clientHeight - 32;

        const scaleX = containerWidth / CANVAS_WIDTH;
        const scaleY = containerHeight / CANVAS_HEIGHT;
        const newScale = Math.min(scaleX, scaleY, 1);

        setScale(newScale);
      };

      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }, []);

    const handleSelection = (e: any) => {
      const obj = e.selected?.[0];
      if (obj) {
        onSelectionChange?.((obj as any).id || null);
      }
    };

    const saveHistory = () => {
      if (!fabricRef.current) return;
      const json = JSON.stringify(fabricRef.current.toObject(['id']));

      // Remove future history if we're not at the end
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      }

      historyRef.current.push(json);
      historyIndexRef.current = historyRef.current.length - 1;

      // Limit history size
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }
    };

    const updateLayers = () => {
      if (!fabricRef.current) return;
      const objects = fabricRef.current.getObjects();
      const layers: Layer[] = objects.map((obj, index) => ({
        id: (obj as any).id || `layer-${index}`,
        type: obj.type || 'unknown',
        name: obj.type === 'i-text' ? (obj as fabric.IText).text?.slice(0, 20) : undefined,
      }));
      onLayersChange?.(layers);
    };

    const generateId = () => `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      addText: (text: string, options: any = {}) => {
        if (!fabricRef.current) return;

        const textObj = new fabric.IText(text, {
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          fontFamily: options.fontFamily || 'Impact',
          fontSize: options.fontSize || 72,
          fill: options.fill || '#FFFFFF',
          stroke: options.stroke || '#000000',
          strokeWidth: options.strokeWidth || 3,
          textAlign: 'center',
        });

        (textObj as any).id = generateId();
        fabricRef.current.add(textObj);
        fabricRef.current.setActiveObject(textObj);
        fabricRef.current.renderAll();
        saveHistory();
      },

      addRect: (options: any = {}) => {
        if (!fabricRef.current) return;

        const rect = new fabric.Rect({
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          width: 200,
          height: 150,
          fill: options.fill || '#FFFFFF',
          stroke: options.stroke || '#000000',
          strokeWidth: options.strokeWidth || 2,
          rx: 8,
          ry: 8,
        });

        (rect as any).id = generateId();
        fabricRef.current.add(rect);
        fabricRef.current.setActiveObject(rect);
        fabricRef.current.renderAll();
        saveHistory();
      },

      addCircle: (options: any = {}) => {
        if (!fabricRef.current) return;

        const circle = new fabric.Circle({
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          radius: 80,
          fill: options.fill || '#FFFFFF',
          stroke: options.stroke || '#000000',
          strokeWidth: options.strokeWidth || 2,
        });

        (circle as any).id = generateId();
        fabricRef.current.add(circle);
        fabricRef.current.setActiveObject(circle);
        fabricRef.current.renderAll();
        saveHistory();
      },

      addTriangle: (options: any = {}) => {
        if (!fabricRef.current) return;

        const triangle = new fabric.Triangle({
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          width: 150,
          height: 150,
          fill: options.fill || '#FFFFFF',
          stroke: options.stroke || '#000000',
          strokeWidth: options.strokeWidth || 2,
        });

        (triangle as any).id = generateId();
        fabricRef.current.add(triangle);
        fabricRef.current.setActiveObject(triangle);
        fabricRef.current.renderAll();
        saveHistory();
      },

      addImage: (dataUrl: string) => {
        if (!fabricRef.current) return;

        fabric.FabricImage.fromURL(dataUrl).then((img) => {
          // Scale image to reasonable size
          const maxSize = 400;
          const imgScale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1), 1);

          img.set({
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            scaleX: imgScale,
            scaleY: imgScale,
          });

          (img as any).id = generateId();
          fabricRef.current!.add(img);
          fabricRef.current!.setActiveObject(img);
          fabricRef.current!.renderAll();
          saveHistory();
        });
      },

      deleteSelected: () => {
        if (!fabricRef.current) return;
        const activeObjects = fabricRef.current.getActiveObjects();
        if (activeObjects.length > 0) {
          activeObjects.forEach((obj) => fabricRef.current!.remove(obj));
          fabricRef.current.discardActiveObject();
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      duplicateSelected: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (!activeObject) return;

        activeObject.clone().then((cloned: fabric.FabricObject) => {
          cloned.set({
            left: (cloned.left || 0) + 20,
            top: (cloned.top || 0) + 20,
          });
          (cloned as any).id = generateId();
          fabricRef.current!.add(cloned);
          fabricRef.current!.setActiveObject(cloned);
          fabricRef.current!.renderAll();
          saveHistory();
        });
      },

      bringForward: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          fabricRef.current.bringObjectForward(activeObject);
          fabricRef.current.renderAll();
          saveHistory();
          updateLayers();
        }
      },

      sendBackward: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          fabricRef.current.sendObjectBackwards(activeObject);
          fabricRef.current.renderAll();
          saveHistory();
          updateLayers();
        }
      },

      selectObject: (id: string) => {
        if (!fabricRef.current) return;
        const obj = fabricRef.current.getObjects().find((o) => (o as any).id === id);
        if (obj) {
          fabricRef.current.setActiveObject(obj);
          fabricRef.current.renderAll();
        }
      },

      setSelectedColor: (color: string) => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          activeObject.set('fill', color);
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      setSelectedFont: (fontFamily: string) => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject && activeObject.type === 'i-text') {
          (activeObject as fabric.IText).set('fontFamily', fontFamily);
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      setSelectedFontSize: (fontSize: number) => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject && activeObject.type === 'i-text') {
          (activeObject as fabric.IText).set('fontSize', fontSize);
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      undo: () => {
        if (!fabricRef.current || historyIndexRef.current <= 0) return;
        historyIndexRef.current--;
        const json = historyRef.current[historyIndexRef.current];
        fabricRef.current.loadFromJSON(JSON.parse(json)).then(() => {
          fabricRef.current!.renderAll();
          updateLayers();
        });
      },

      redo: () => {
        if (!fabricRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current++;
        const json = historyRef.current[historyIndexRef.current];
        fabricRef.current.loadFromJSON(JSON.parse(json)).then(() => {
          fabricRef.current!.renderAll();
          updateLayers();
        });
      },

      exportPNG: () => {
        if (!fabricRef.current) return null;
        return fabricRef.current.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1,
        });
      },
    }));

    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
          className="shadow-2xl rounded-lg overflow-hidden"
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    );
  }
);

EditorCanvas.displayName = 'EditorCanvas';

export default EditorCanvas;
