import { ImageUp, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '../../../shared/ui';
import { adminArtUrl } from '../services/cardmakerApi';
import { ART_H, ART_W, boxOf, boxPercent, initialView, MAX_ZOOM, pan, zoomTo, type Box } from '../services/cropMath';
import { useCardMaker, type PendingArt } from '../store/cardMakerStore';

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** Cada seta move 15% da caixa. */
const NUDGE = 0.15;

/**
 * Aba Arte: escolhe a imagem, recorta na proporção da carta (arrastar, zoom, setas) ou usa a
 * imagem inteira sobre o fundo desfocado. Vai para o servidor no próximo "Salvar".
 */
export function ArtCropper() {
  const { pendingArt, record, setPendingArt, updatePendingArt, setPreviewArt, removeArt, busy } = useCardMaker();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function choose(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError('Envie uma imagem PNG, JPEG ou WebP de até 8 MB. SVG e GIF não são aceitos.');
    if (file.size > MAX_BYTES) return setError('A imagem passa de 8 MB.');
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      setPendingArt({
        file,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        view: initialView(img.naturalWidth, img.naturalHeight),
        whole: false,
      });
    } catch {
      URL.revokeObjectURL(url);
      setError('Não consegui abrir essa imagem.');
    }
  }

  // O preview da carta mostra o recorte desenhado aqui (o servidor faz o mesmo ao receber).
  useEffect(() => {
    if (!pendingArt) return;
    let alive = true;
    const t = setTimeout(() => {
      void renderPreview(pendingArt).then((url) => (alive ? setPreviewArt(url) : URL.revokeObjectURL(url)));
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [pendingArt, setPreviewArt]);

  const current = record?.artVersion ? adminArtUrl(record.id, record.artVersion) : null;

  return (
    <div className="cmk-fields cmk-art">
      <input
        ref={fileRef}
        type="file"
        accept={TYPES.join(',')}
        hidden
        aria-label="Arquivo da arte"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {pendingArt ? (
        <CropArea art={pendingArt} onChange={updatePendingArt} />
      ) : (
        <button
          type="button"
          className="cmk-drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void choose(e.dataTransfer.files[0]);
          }}
        >
          {current ? <img src={current} alt="Arte atual da carta" /> : <ImageUp size={40} aria-hidden />}
          <span>{current ? 'Trocar imagem' : 'Escolher imagem'}</span>
          <small>PNG, JPEG ou WebP, até 8 MB. Também dá para arrastar o arquivo aqui.</small>
        </button>
      )}
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      <div className="cmk-art-actions">
        {pendingArt && (
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <ImageUp size={16} aria-hidden /> Trocar imagem
          </Button>
        )}
        {(pendingArt || (current && record?.status === 'draft')) && (
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void removeArt()}>
            <Trash2 size={16} aria-hidden /> {pendingArt ? 'Descartar esta imagem' : 'Remover arte'}
          </Button>
        )}
      </div>
      <p className="field-hint">
        O servidor recorta em {ART_W} × {ART_H} e salva em WebP, sem dados do arquivo original. Sem arte, a carta não pode ser publicada.
        {pendingArt && ' A imagem nova vai junto no próximo “Salvar”.'}
      </p>
    </div>
  );
}

/** A imagem com a moldura do recorte por cima. */
function CropArea({ art, onChange }: { art: PendingArt; onChange(patch: Partial<Pick<PendingArt, 'view' | 'whole'>>): void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const box = boxOf(art.view, art.width, art.height);
  const pctBox = boxPercent(box, art.width, art.height);
  const scale = () => art.width / (imgRef.current?.clientWidth || art.width);
  const move = (dx: number, dy: number) => onChange({ view: pan(art.view, dx, dy, art.width, art.height) });

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const s = scale();
    move((e.clientX - drag.current.x) * s, (e.clientY - drag.current.y) * s);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const step = (dx: number, dy: number) => move(dx * box.width * NUDGE, dy * box.height * NUDGE);

  return (
    <>
      <p className="field-label">Imagem enviada{art.whole ? '' : ' · arraste a área para recortar'}</p>
      <div className={`cmk-crop ${art.whole ? 'whole' : ''}`}>
        <img ref={imgRef} src={art.url} alt="Imagem escolhida para a arte" draggable={false} />
        {!art.whole && (
          <div
            className="cmk-crop-box"
            role="slider"
            tabIndex={0}
            aria-label="Área do recorte (setas movem)"
            aria-valuetext={`${box.width} × ${box.height} a partir de ${box.left}, ${box.top}`}
            style={{ left: `${pctBox.left}%`, top: `${pctBox.top}%`, width: `${pctBox.width}%`, height: `${pctBox.height}%` }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(e) => {
              const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
              if (!k) return;
              e.preventDefault();
              step(k[0]!, k[1]!);
            }}
          >
            <span className="cmk-crop-size mono">
              {ART_W} × {ART_H}
            </span>
          </div>
        )}
      </div>
      {!art.whole && (
        <div className="cmk-crop-tools">
          <label className="cmk-zoom">
            Zoom
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={art.view.zoom}
              onChange={(e) => onChange({ view: zoomTo(art.view, Number(e.target.value), art.width, art.height) })}
            />
          </label>
          <div className="cmk-nudge" role="group" aria-label="Mover o recorte">
            <Button size="sm" aria-label="Mover para a esquerda" onClick={() => step(-1, 0)}>
              ←
            </Button>
            <Button size="sm" aria-label="Mover para cima" onClick={() => step(0, -1)}>
              ↑
            </Button>
            <Button size="sm" aria-label="Mover para baixo" onClick={() => step(0, 1)}>
              ↓
            </Button>
            <Button size="sm" aria-label="Mover para a direita" onClick={() => step(1, 0)}>
              →
            </Button>
          </div>
        </div>
      )}
      <label className="cmk-check">
        <input type="checkbox" checked={art.whole} onChange={(e) => onChange({ whole: e.target.checked })} />
        <span>
          <b>Imagem inteira (fundo desfocado)</b>
          <small>Para stickers e imagens largas: nada é cortado, as sobras viram um fundo desfocado.</small>
        </span>
      </label>
    </>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Desenha no navegador o que o servidor vai gerar: recorte (ou imagem inteira) sobre o fundo desfocado. */
async function renderPreview(art: PendingArt): Promise<string> {
  const img = await loadImage(art.url);
  const box: Box = art.whole ? { left: 0, top: 0, width: art.width, height: art.height } : boxOf(art.view, art.width, art.height);
  const canvas = document.createElement('canvas');
  canvas.width = ART_W;
  canvas.height = ART_H;
  const ctx = canvas.getContext('2d')!;
  const cover = Math.max(ART_W / box.width, ART_H / box.height);
  const inside = Math.min(ART_W / box.width, ART_H / box.height);
  const draw = (s: number) => {
    const w = box.width * s;
    const h = box.height * s;
    ctx.drawImage(img, box.left, box.top, box.width, box.height, (ART_W - w) / 2, (ART_H - h) / 2, w, h);
  };
  ctx.filter = 'blur(14px) brightness(0.6)';
  draw(cover);
  ctx.filter = 'none';
  draw(inside);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.84));
  return URL.createObjectURL(blob ?? new Blob());
}
