import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import {
  X,
  Type,
  Image as ImageIcon,
  Trash2,
  Check,
  Move,
  Minus,
  Plus,
  Sparkles,
  Send,
  Loader2
} from 'lucide-react';
import styles from './ImageEditor.module.css';

interface ImageEditorProps {
  imageUrl: string;
  logoUrl?: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ 
  imageUrl, 
  logoUrl, 
  onSave, 
  onClose 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  // Snapshot of the active fabric object's editable props. We snapshot
  // rather than holding the fabric instance directly so React picks up
  // changes when we mutate the object via updateProperty.
  type SelectedSnapshot = { type?: string; fontSize?: number; fill?: string };
  const [selectedObject, setSelectedObject] = useState<SelectedSnapshot | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const handleAiSubmit = () => {
    if (!aiPromptText.trim()) return;
    setIsAiProcessing(true);
    // TODO: Connect to AI API
    setTimeout(() => {
      setIsAiProcessing(false);
      setShowAIPrompt(false);
      setAiPromptText('');
      alert('AI adjustment applied! (Placeholder)');
    }, 2000);
  };


  useEffect(() => {
    if (!canvasRef.current) return;
    let isCancelled = false;
    let backgroundImage: fabric.FabricImage | null = null;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 600,
      backgroundColor: '#ffffff'
    });
    fabricCanvasRef.current = canvas;

    const updateSelection = () => {
      const active = canvas.getActiveObject();
      if (!active) {
        setSelectedObject(null);
        return;
      }
      const snap: SelectedSnapshot = { type: active.type };
      if ('fontSize' in active) snap.fontSize = (active as fabric.IText).fontSize;
      if ('fill' in active) {
        const f = (active as fabric.IText).fill;
        if (typeof f === 'string') snap.fill = f;
      }
      setSelectedObject(snap);
    };
    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));

    // Resize the canvas + base image to fit the current canvasArea size.
    // Re-run whenever the container resizes (modal animation finish, window
    // resize, etc) so the poster always fills the available area.
    const fitToContainer = () => {
      if (isCancelled || !backgroundImage || !canvasRef.current) return;
      const container = canvasRef.current.closest(`.${styles.canvasArea}`) as HTMLElement | null;
      const cw = container?.clientWidth ?? Math.round(window.innerWidth * 0.6);
      const ch = container?.clientHeight ?? Math.round(window.innerHeight * 0.65);
      if (cw <= 0 || ch <= 0) return;

      const PAD_X = 48;   // CSS padding 1.5rem × 2
      const PAD_Y = 90;   // padding + canvasHint row beneath the canvas
      const usableW = Math.max(240, cw - PAD_X);
      const usableH = Math.max(240, ch - PAD_Y);

      const naturalW = backgroundImage.width || 1024;
      const naturalH = backgroundImage.height || 1024;
      const ratio = naturalW / naturalH;

      let w: number, h: number;
      if (usableW / ratio <= usableH) {
        w = usableW;
        h = w / ratio;
      } else {
        h = usableH;
        w = h * ratio;
      }

      canvas.setDimensions({ width: w, height: h });
      // Fabric v7 changed image origin default to center/center — pinning
      // both axes to left/top so left:0/top:0 anchors the corner.
      backgroundImage.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        scaleX: w / naturalW,
        scaleY: h / naturalH,
      });
      canvas.renderAll();
    };

    fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      if (isCancelled || !fabricCanvasRef.current) return;
      img.set({
        selectable: false,
        evented: false,
        hoverCursor: 'default',
      });
      canvas.add(img);
      canvas.sendObjectToBack(img);
      backgroundImage = img;
      fitToContainer();
    });

    // Watch the container — if its size changes after the modal animates in,
    // re-fit so we don't end up with a tiny poster in a big white canvas.
    const container = canvasRef.current.closest(`.${styles.canvasArea}`);
    const resizeObs = (container && typeof ResizeObserver !== 'undefined')
      ? new ResizeObserver(() => fitToContainer())
      : null;
    if (container && resizeObs) resizeObs.observe(container);

    return () => {
      isCancelled = true;
      resizeObs?.disconnect();
      fabricCanvasRef.current = null;
      canvas.dispose();
    };
  }, [imageUrl]);

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Double click to edit', {
      left: 100,
      top: 100,
      fontFamily: 'Inter, sans-serif',
      fontSize: 32,
      fill: '#000000'
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  };

  const addLogo = () => {
    if (!logoUrl || !fabricCanvasRef.current) return;
    fabric.FabricImage.fromURL(logoUrl, { crossOrigin: 'anonymous' }).then((img) => {
      img.scaleToWidth(120);
      img.set({ left: 100, top: 200 });
      fabricCanvasRef.current?.add(img);
      fabricCanvasRef.current?.setActiveObject(img);
    });
  };

  const updateProperty = (prop: string, value: string | number) => {
    const active = fabricCanvasRef.current?.getActiveObject();
    if (!active) return;
    active.set({ [prop]: value });
    fabricCanvasRef.current?.renderAll();
    const snap: SelectedSnapshot = { type: active.type };
    if ('fontSize' in active) snap.fontSize = (active as fabric.IText).fontSize;
    if ('fill' in active) {
      const f = (active as fabric.IText).fill;
      if (typeof f === 'string') snap.fill = f;
    }
    setSelectedObject(snap);
  };

  const deleteSelected = () => {
    const active = fabricCanvasRef.current?.getActiveObject();
    if (active) {
      fabricCanvasRef.current?.remove(active);
      fabricCanvasRef.current?.discardActiveObject();
      fabricCanvasRef.current?.renderAll();
      setSelectedObject(null);
    }
  };

  const handleSave = async () => {
    if (!fabricCanvasRef.current) return;
    setIsSaving(true);
    try {
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
      const dataUrl = fabricCanvasRef.current.toDataURL({ format: 'png', multiplier: 2 });
      onSave(dataUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.editorOverlay}>
      <div className={styles.editorContainer}>
        <div className={styles.editorHeader}>
          <div className={styles.headerLeft}>
            <h3 className={styles.editorTitle}>Poster Editor</h3>
            <p className={styles.editorSubtitle}>Top Toolbar Mode</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : <><Check size={18} /> Save & Download</>}
            </button>
          </div>
        </div>

        <div className={styles.editorMain}>
          <div className={styles.topToolbar}>
            <div className={styles.toolGroup}>
              <button className={styles.toolActionBtn} onClick={addText}><Type size={18} /> Add Text</button>
              <button className={styles.toolActionBtn} onClick={addLogo}><ImageIcon size={18} /> Add Logo</button>
            </div>

            <div className={styles.vDivider} />

            <div className={styles.contextControls}>
              {selectedObject?.type === 'i-text' ? (
                <div className={styles.controlRow}>
                  <div className={styles.controlItem}>
                    <label>Size</label>
                    <button onClick={() => updateProperty('fontSize', (selectedObject.fontSize || 32) - 4)}><Minus size={14} /></button>
                    <span className={styles.valueLabel}>{Math.round(selectedObject.fontSize ?? 32)}</span>
                    <button onClick={() => updateProperty('fontSize', (selectedObject.fontSize || 32) + 4)}><Plus size={14} /></button>
                  </div>
                  <div className={styles.controlItem}>
                    <label>Color</label>
                    <input type="color" value={selectedObject.fill} onChange={(e) => updateProperty('fill', e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className={styles.controlRow}>
                  <div className={styles.controlItem}>
                    <label>Brightness</label>
                    <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
                  </div>
                  <div className={styles.controlItem}>
                    <label>Contrast</label>
                    <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.vDivider} />
            <button className={styles.deleteBtn} onClick={deleteSelected} disabled={!selectedObject}><Trash2 size={18} /></button>
          </div>

          <div className={styles.canvasArea}>
            <div 
              className={styles.canvasShadow}
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%)`
              }}
            >
              <canvas ref={canvasRef} />
            </div>
            <div className={styles.canvasHint}><Move size={14} /> Drag elements to position • Double-click text to type</div>
            
            {showAIPrompt ? (
              <div className={styles.aiPromptBox}>
                <div className={styles.aiPromptHeader}>
                  <Sparkles size={16} className={styles.aiSparkleIcon} />
                  <span>How can AI help you?</span>
                  <button onClick={() => setShowAIPrompt(false)} className={styles.closeAiBtn}><X size={16} /></button>
                </div>
                <div className={styles.aiInputArea}>
                  <textarea 
                    autoFocus
                    placeholder="E.g., 'Make the brand name larger', 'Change all text to red', 'Center the logo'..."
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiSubmit();
                      }
                    }}
                  />
                  <button 
                    onClick={handleAiSubmit} 
                    className={styles.sendAiBtn}
                    disabled={!aiPromptText.trim() || isAiProcessing}
                  >
                    {isAiProcessing ? <Loader2 size={16} className={styles.spinIcon} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <button className={styles.askAIBtn} onClick={() => setShowAIPrompt(true)}>
                <Sparkles size={16} /> Any issue? Ask AI
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
