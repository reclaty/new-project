import { useCallback, useEffect, useRef, useState } from 'react';
import type { Axes } from './transport';

type Props = { label: string; disabled: boolean; onChange: (axes: Axes) => void; left?: boolean };
export default function Joystick({ label, disabled, onChange, left }: Props) {
  const [position, setPosition] = useState<Axes>({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const callback = useRef(onChange); callback.current = onChange;
  const reset = useCallback(() => { pointer.current = null; setPosition({ x: 0, y: 0 }); callback.current({ x: 0, y: 0 }); }, []);
  useEffect(() => { if (disabled) reset(); }, [disabled, reset]);
  useEffect(() => { const onVisibility = () => { if (document.hidden) reset(); }; window.addEventListener('blur', reset); document.addEventListener('visibilitychange', onVisibility); return () => { window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', onVisibility); reset(); }; }, [reset]);
  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = rect.width * 0.34;
    let x = (event.clientX - (rect.left + rect.width / 2)) / radius;
    let y = (event.clientY - (rect.top + rect.height / 2)) / radius;
    const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    setPosition({ x, y }); callback.current({ x, y });
  };
  return <div className={'stick-wrap ' + (disabled ? 'disabled' : '')}>
    <div className="stick-title"><span>{left ? '01' : '02'} / {label}</span><span className="stick-ready">{disabled ? 'VERROUILLÉ' : 'ACTIF'}</span></div>
    <div className="stick" role="application" aria-label={`Joystick ${label}${disabled ? ', désactivé' : ''}`} aria-disabled={disabled}
      onPointerDown={e => { if (disabled || pointer.current !== null) return; e.preventDefault(); pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e); }}
      onPointerMove={e => { if (pointer.current === e.pointerId) update(e); }}
      onPointerUp={e => { if (pointer.current === e.pointerId) reset(); }}
      onPointerCancel={e => { if (pointer.current === e.pointerId) reset(); }}
      onLostPointerCapture={() => { if (pointer.current !== null) reset(); }}>
      <div className="stick-ring"/><div className="stick-line horizontal"/><div className="stick-line vertical"/>
      <span className="stick-dir top">▲</span><span className="stick-dir bottom">▼</span><span className="stick-dir left">◀</span><span className="stick-dir right">▶</span>
      <div className="stick-knob" style={{ left: `${50 + position.x * 34}%`, top: `${50 + position.y * 34}%` }}><div className="knob-inner"><span/><span/><span/></div></div>
    </div>
    <div className="stick-caption">{left ? 'ALTITUDE / ROTATION' : 'DIRECTION / INCLINAISON'}</div>
  </div>;
}
