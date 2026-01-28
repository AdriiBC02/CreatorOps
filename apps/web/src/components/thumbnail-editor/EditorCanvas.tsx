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

      // Alignment tools
      alignCenter: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          activeObject.set({
            left: CANVAS_WIDTH / 2,
            originX: 'center',
          });
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      alignMiddle: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          activeObject.set({
            top: CANVAS_HEIGHT / 2,
            originY: 'center',
          });
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      alignLeft: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          const objWidth = (activeObject.width || 0) * (activeObject.scaleX || 1);
          activeObject.set({
            left: objWidth / 2,
            originX: 'center',
          });
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      alignRight: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          const objWidth = (activeObject.width || 0) * (activeObject.scaleX || 1);
          activeObject.set({
            left: CANVAS_WIDTH - objWidth / 2,
            originX: 'center',
          });
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      alignTop: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          const objHeight = (activeObject.height || 0) * (activeObject.scaleY || 1);
          activeObject.set({
            top: objHeight / 2,
            originY: 'center',
          });
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      alignBottom: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          const objHeight = (activeObject.height || 0) * (activeObject.scaleY || 1);
          activeObject.set({
            top: CANVAS_HEIGHT - objHeight / 2,
            originY: 'center',
          });
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      // Opacity control
      setSelectedOpacity: (opacity: number) => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          activeObject.set('opacity', opacity);
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      getSelectedOpacity: () => {
        if (!fabricRef.current) return 1;
        const activeObject = fabricRef.current.getActiveObject();
        return activeObject?.opacity ?? 1;
      },

      // Stroke color
      setSelectedStroke: (color: string) => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          activeObject.set('stroke', color);
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      setSelectedStrokeWidth: (width: number) => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          activeObject.set('strokeWidth', width);
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      // Arrow/Line tool
      addLine: (options: any = {}) => {
        if (!fabricRef.current) return;

        const line = new fabric.Line([
          CANVAS_WIDTH / 2 - 100,
          CANVAS_HEIGHT / 2,
          CANVAS_WIDTH / 2 + 100,
          CANVAS_HEIGHT / 2,
        ], {
          stroke: options.stroke || '#FFFFFF',
          strokeWidth: options.strokeWidth || 4,
          originX: 'center',
          originY: 'center',
        });

        (line as any).id = generateId();
        fabricRef.current.add(line);
        fabricRef.current.setActiveObject(line);
        fabricRef.current.renderAll();
        saveHistory();
      },

      addArrow: (options: any = {}) => {
        if (!fabricRef.current) return;

        // Create arrow as a group (line + triangle head)
        const lineLength = 200;
        const headSize = 20;

        const line = new fabric.Line([0, 0, lineLength - headSize, 0], {
          stroke: options.stroke || '#FFFFFF',
          strokeWidth: options.strokeWidth || 4,
        });

        const head = new fabric.Triangle({
          width: headSize,
          height: headSize,
          fill: options.stroke || '#FFFFFF',
          left: lineLength - headSize,
          top: -headSize / 2,
          angle: 90,
        });

        const group = new fabric.Group([line, head], {
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
        });

        (group as any).id = generateId();
        fabricRef.current.add(group);
        fabricRef.current.setActiveObject(group);
        fabricRef.current.renderAll();
        saveHistory();
      },

      // Emoji support
      addEmoji: (emoji: string, options: any = {}) => {
        if (!fabricRef.current) return;

        const textObj = new fabric.IText(emoji, {
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          fontSize: options.fontSize || 80,
        });

        (textObj as any).id = generateId();
        fabricRef.current.add(textObj);
        fabricRef.current.setActiveObject(textObj);
        fabricRef.current.renderAll();
        saveHistory();
      },

      // Clear canvas
      clearCanvas: () => {
        if (!fabricRef.current) return;
        fabricRef.current.clear();
        fabricRef.current.backgroundColor = '#1a1a1a';
        fabricRef.current.renderAll();
        saveHistory();
        updateLayers();
      },

      // Load template (JSON string)
      loadTemplate: (templateJson: string) => {
        if (!fabricRef.current) return;
        fabricRef.current.loadFromJSON(JSON.parse(templateJson)).then(() => {
          fabricRef.current!.renderAll();
          saveHistory();
          updateLayers();
        });
      },

      // Set background color
      setBackgroundColor: (color: string) => {
        if (!fabricRef.current) return;
        fabricRef.current.backgroundColor = color;
        fabricRef.current.renderAll();
        saveHistory();
      },

      // Flip selected object
      flipHorizontal: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          activeObject.set('flipX', !activeObject.flipX);
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      flipVertical: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          activeObject.set('flipY', !activeObject.flipY);
          fabricRef.current.renderAll();
          saveHistory();
        }
      },

      // Lock/unlock object
      lockSelected: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          const isLocked = activeObject.lockMovementX;
          activeObject.set({
            lockMovementX: !isLocked,
            lockMovementY: !isLocked,
            lockRotation: !isLocked,
            lockScalingX: !isLocked,
            lockScalingY: !isLocked,
          });
          fabricRef.current.renderAll();
        }
      },

      // Bring to front / send to back
      bringToFront: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          fabricRef.current.bringObjectToFront(activeObject);
          fabricRef.current.renderAll();
          saveHistory();
          updateLayers();
        }
      },

      sendToBack: () => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getActiveObject();
        if (activeObject) {
          fabricRef.current.sendObjectToBack(activeObject);
          fabricRef.current.renderAll();
          saveHistory();
          updateLayers();
        }
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
