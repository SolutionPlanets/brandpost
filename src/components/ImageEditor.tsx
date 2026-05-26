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
  RotateCcw,
  Palette,
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
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 600, height: 600 });
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

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 600,
      backgroundColor: '#ffffff'
    });

    fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img: any) => {
      if (isCancelled) return;

      const container = canvasRef.current?.closest(`.${styles.canvasArea}`);
      const maxW = (container?.clientWidth || window.innerWidth) * 0.85;
      const maxH = (container?.clientHeight || window.innerHeight) * 0.7;
      
      const ratio = img.width / img.height;
      let w, h;

      if (ratio > maxW / maxH) {
        w = maxW;
        h = w / ratio;
      } else {
        h = maxH;
        w = h * ratio;
      }

      setStageSize({ width: w, height: h });
      canvas.setDimensions({ width: w, height: h });
      
      img.set({
        left: 0,
        top: 0,
        scaleX: w / img.width,
        scaleY: h / img.height,
        selectable: false,
        evented: false,
        hoverCursor: 'default'
      });
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
    });

    const updateSelection = () => {
      const active = canvas.getActiveObject();
      setSelectedObject(active || null);
    };

    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));

    fabricCanvasRef.current = canvas;
    
    return () => {
      isCancelled = true;
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
    fabric.FabricImage.fromURL(logoUrl, { crossOrigin: 'anonymous' }).then((img: any) => {
      img.scaleToWidth(120);
      img.set({ left: 100, top: 200 });
      fabricCanvasRef.current?.add(img);
      fabricCanvasRef.current?.setActiveObject(img);
    });
  };

  const updateProperty = (prop: string, value: any) => {
    const active = fabricCanvasRef.current?.getActiveObject();
    if (active) {
      active.set(prop as any, value);
      fabricCanvasRef.current?.renderAll();
      setSelectedObject({ ...active.toObject(), type: active.type });
    }
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
                    <span className={styles.valueLabel}>{Math.round(selectedObject.fontSize)}</span>
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
