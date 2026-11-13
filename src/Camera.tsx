import { forwardRef, useEffect, useRef } from 'react';
import type { Telemetry } from './transport';

type Props = { active: boolean; telemetry: Telemetry | null };
const Camera = forwardRef<HTMLCanvasElement, Props>(function Camera({ active, telemetry }, forwardedRef) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const state = useRef({ active, telemetry }); state.current = { active, telemetry };
  useEffect(() => {
    const image = new Image(); image.src = '/simulation-landscape.jpg';
    let frame = 0;
    const draw = () => {
      const el = canvas.current; const ctx = el?.getContext('2d');
      if (!el || !ctx) return;
      const { active: on, telemetry: t } = state.current;
      ctx.fillStyle = '#10251c'; ctx.fillRect(0, 0, el.width, el.height);
      if (image.complete && image.naturalWidth) {
        const scale = Math.max(el.width / image.width, el.height / image.height) * 1.05;
        const w = image.width * scale, h = image.height * scale;
        const drift = on && t?.flight === 'flying' ? Math.sin(Date.now() / 3500) * 8 : 0;
        ctx.drawImage(image, (el.width - w) / 2 + drift, (el.height - h) / 2, w, h);
      }
      ctx.fillStyle = on ? 'rgba(2, 18, 12, .19)' : 'rgba(2, 12, 8, .65)'; ctx.fillRect(0, 0, el.width, el.height);
      frame = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas width={1280} height={720} ref={node => { canvas.current = node; if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }} aria-label="Paysage de caméra simulée" />;
});
export default Camera;
