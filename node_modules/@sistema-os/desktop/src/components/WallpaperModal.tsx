import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  X,
  Upload,
  Trash2,
  Check,
  Sparkles,
  Move,
  ZoomIn,
  RotateCcw,
} from 'lucide-react';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper: string | null;
  wallpaperOpacity: number;
  wallpaperPosX?: number;
  wallpaperPosY?: number;
  wallpaperScale?: number;
  onSaveWallpaper: (
    wallpaperUrl: string | null,
    opacity: number,
    posX: number,
    posY: number,
    scale: number
  ) => void;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper,
  wallpaperOpacity,
  wallpaperPosX = 50,
  wallpaperPosY = 50,
  wallpaperScale = 100,
  onSaveWallpaper,
}) => {
  const [preview, setPreview] = useState<string | null>(currentWallpaper);
  const [opacity, setOpacity] = useState<number>(wallpaperOpacity || 20);
  const [posX, setPosX] = useState<number>(wallpaperPosX);
  const [posY, setPosY] = useState<number>(wallpaperPosY);
  const [scale, setScale] = useState<number>(wallpaperScale);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPosX: number; startPosY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP, etc).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('A imagem é muito pesada. Escolha uma imagem de até 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreview(event.target.result as string);
        setPosX(50);
        setPosY(50);
        setScale(100);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!preview) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: posX,
      startPosY: posY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Sensibilidade do arraste em porcentagem
    const sensitivity = 0.25;
    const newX = Math.max(0, Math.min(100, dragStartRef.current.startPosX - deltaX * sensitivity));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.startPosY - deltaY * sensitivity));

    setPosX(Math.round(newX));
    setPosY(Math.round(newY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleResetPosition = () => {
    setPosX(50);
    setPosY(50);
    setScale(100);
  };

  const handleSave = () => {
    onSaveWallpaper(preview, opacity, posX, posY, scale);
    onClose();
  };

  const handleRemove = () => {
    setPreview(null);
    onSaveWallpaper(null, opacity, 50, 50, 100);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden font-sans text-xs flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-sky-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Plano de Fundo do Sistema</h3>
              <p className="text-[11px] text-sky-200">
                Escolha a imagem e posicione arrastando com o mouse
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-4 space-y-3 bg-slate-50">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-sky-700 hover:bg-sky-800 text-white py-2 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-xs"
            >
              <Upload className="w-4 h-4" />
              Escolher Imagem do Computador
            </button>

            {preview && (
              <>
                <button
                  type="button"
                  onClick={handleResetPosition}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-3 rounded-xl font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                  title="Centralizar posição e zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Centralizar
                </button>

                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-2 px-3 rounded-xl font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                  title="Remover imagem selecionada"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover
                </button>
              </>
            )}
          </div>

          {/* Área de Pré-visualização com Arraste (Drag & Pan) */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`bg-slate-900 rounded-xl border border-slate-300 h-52 overflow-hidden relative flex items-center justify-center select-none ${
              preview ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          >
            {preview ? (
              <div className="relative w-full h-full overflow-hidden">
                <div
                  className="w-full h-full transition-all pointer-events-none"
                  style={{
                    backgroundImage: `url(${preview})`,
                    backgroundSize: `${scale}%`,
                    backgroundPosition: `${posX}% ${posY}%`,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                <div
                  className="absolute inset-0 bg-white pointer-events-none"
                  style={{ opacity: 1 - opacity / 100 }}
                />

                <div className="absolute top-2 left-2 bg-slate-900/80 text-white px-2 py-1 rounded text-[10px] font-bold backdrop-blur-xs flex items-center gap-1.5 pointer-events-none">
                  <Move className="w-3 h-3 text-sky-400" />
                  Clique e arraste para posicionar (X: {posX}% | Y: {posY}%)
                </div>

                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white px-2 py-1 rounded text-[10px] font-bold backdrop-blur-xs pointer-events-none">
                  Zoom: {scale}% | Opacidade: {opacity}%
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 space-y-1 p-4 pointer-events-none">
                <ImageIcon className="w-8 h-8 mx-auto text-slate-400" />
                <p className="font-bold text-slate-300 text-xs">Nenhuma imagem selecionada</p>
                <p className="text-[10px] text-slate-400">
                  O sistema usará o plano de fundo padrão cinza claro.
                </p>
              </div>
            )}
          </div>

          {/* Controles de Fino Ajuste de Posicionamento e Zoom */}
          {preview && (
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
              {/* Opacidade */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Intensidade / Visibilidade:
                  </span>
                  <span className="font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {opacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100">
                {/* Posição Horizontal (X) */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                    <span>↔️ Pos. Horizontal:</span>
                    <span className="font-mono text-indigo-700">{posX}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-700"
                  />
                </div>

                {/* Posição Vertical (Y) */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                    <span>↕️ Pos. Vertical:</span>
                    <span className="font-mono text-indigo-700">{posY}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-700"
                  />
                </div>

                {/* Zoom / Escala */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-0.5">
                    <span className="flex items-center gap-0.5">
                      <ZoomIn className="w-3 h-3 text-emerald-600" />
                      Zoom / Tamanho:
                    </span>
                    <span className="font-mono text-emerald-700">{scale}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="250"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRemove}
            className="text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Restaurar Padrão
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Aplicar e Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

