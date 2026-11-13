import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Aperture, ArrowDownToLine, ArrowUpFromLine, BatteryFull, Camera as CameraIcon, Check, ChevronDown, CircleHelp, Crosshair, Expand, Gauge, Info, Leaf, Maximize2, Radio, Settings2, Signal, Video, Wifi, X } from 'lucide-react';
import Camera from './Camera';
import Joystick from './Joystick';
import { neutralControls, SimulationTransport, UnavailableTransport, type Axes, type Controls, type DroneTransport, type Telemetry } from './transport';

type Mode = 'simulation' | 'real';
type Connection = 'disconnected' | 'connecting' | 'connected';
const format = (value: number | undefined, digits = 1) => value === undefined ? '—' : value.toFixed(digits);
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }

export default function App() {
  const [mode, setMode] = useState<Mode>('simulation');
  const [connection, setConnection] = useState<Connection>('disconnected');
  const [speed, setSpeed] = useState<1 | 2 | 3>(2);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [settings, setSettings] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState(() => new Date());
  const transport = useRef<DroneTransport>(new SimulationTransport());
  const controls = useRef<Controls>(neutralControls());
  const canvas = useRef<HTMLCanvasElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const connected = connection === 'connected';
  const available = mode === 'simulation' && connected;
  const flying = telemetry?.flight === 'flying';
  const say = (message: string) => setNotice(message);
  const stopRecording = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
  }, []);
  const resetControls = useCallback(() => { controls.current = neutralControls(); transport.current.setControls(controls.current); }, []);
  useEffect(() => {
    alive.current = true;
    const timer = window.setInterval(() => {
      if (transport.current instanceof SimulationTransport) transport.current.tick(0.1);
      setTelemetry(transport.current.getTelemetry());
    }, 100);
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
    const reset = () => resetControls();
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener('blur', reset); document.addEventListener('visibilitychange', visibility);
    return () => { alive.current = false; clearInterval(timer); clearInterval(clockTimer); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', visibility); stopRecording(); transport.current.disconnect(); };
  }, [resetControls, stopRecording]);
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    stopRecording(); resetControls(); transport.current.disconnect();
    transport.current = next === 'simulation' ? new SimulationTransport() : new UnavailableTransport();
    setMode(next); setConnection('disconnected'); setTelemetry(null); setNotice(next === 'real' ? 'Mode réel verrouillé : protocole non identifié.' : 'Mode simulation activé. Aucun drone ne sera contrôlé.');
  };
  const toggleConnection = async () => {
    if (connected) { stopRecording(); resetControls(); transport.current.disconnect(); setConnection('disconnected'); setTelemetry(null); say('Simulation déconnectée.'); return; }
    setConnection('connecting');
    try { await transport.current.connect(); transport.current.setSpeed(speed); setConnection('connected'); setTelemetry(transport.current.getTelemetry()); say('Simulation connectée. Prêt pour le vol virtuel.'); }
    catch (error) { setConnection('disconnected'); say(error instanceof Error ? error.message : 'Connexion impossible.'); }
  };
  const move = (side: 'left' | 'right', axes: Axes) => { controls.current = { ...controls.current, [side]: axes }; transport.current.setControls(controls.current); };
  const changeSpeed = (value: 1 | 2 | 3) => { setSpeed(value); transport.current.setSpeed(value); say(`Vitesse de simulation ${value} sélectionnée.`); };
  const photo = () => {
    if (!canvas.current) return;
    canvas.current.toBlob(blob => { if (blob) { download(blob, `gaia-simulation-${Date.now()}.png`); say('Photo simulée téléchargée.'); } else say('Impossible de créer la photo sur ce navigateur.'); }, 'image/png');
  };
  const video = () => {
    if (recording) { stopRecording(); return; }
    try {
      if (!canvas.current?.captureStream || typeof MediaRecorder === 'undefined') throw new Error('Enregistrement non pris en charge par ce navigateur.');
      const mediaStream = canvas.current.captureStream(30); stream.current = mediaStream;
      const preferred = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const instance = preferred ? new MediaRecorder(mediaStream, { mimeType: preferred }) : new MediaRecorder(mediaStream);
      const chunks: Blob[] = []; recorder.current = instance;
      instance.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      instance.onerror = () => { if (alive.current) say('Erreur pendant l’enregistrement.'); };
      instance.onstop = () => { mediaStream.getTracks().forEach(track => track.stop()); if (stream.current === mediaStream) stream.current = null; if (recorder.current === instance) recorder.current = null; if (alive.current) setRecording(false); if (chunks.length) { const type = instance.mimeType || 'video/webm'; download(new Blob(chunks, { type }), `gaia-simulation-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`); if (alive.current) say('Vidéo simulée téléchargée.'); } };
      instance.start(); setRecording(true); say('Enregistrement de la caméra simulée en cours.');
    } catch (error) { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; say(error instanceof Error ? error.message : 'Enregistrement indisponible.'); }
  };
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else throw new Error('Plein écran indisponible ici. Sur iPhone, ajoutez l’app à l’écran d’accueil.'); }
    catch (error) { say(error instanceof Error ? error.message : 'Plein écran indisponible.'); }
  };
  const flight = (action: 'takeOff' | 'land') => { resetControls(); transport.current[action](); setTelemetry(transport.current.getTelemetry()); say(action === 'takeOff' ? 'Décollage simulé.' : 'Atterrissage simulé.'); };
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Leaf size={21}/></div><div><div className="brand-name">GAÏA<span>®</span></div><div className="brand-sub">DRONE CONTROLLER</div></div></div>
      <div className="header-center"><span className="header-dot"/> FLIGHT CONTROL SYSTEM <span className="header-divider">/</span> <span>INTERFACE 01</span></div>
      <div className="header-actions"><div className="system-status"><span className="status-dot"/> SYSTÈME OPÉRATIONNEL</div><button className="icon-button header-setting" onClick={() => setSettings(true)} aria-label="Ouvrir les paramètres"><Settings2 size={19}/></button></div>
    </header>
    <main className="dashboard">
      <section className="intro"><div><div className="eyebrow"><span/> CENTRE DE CONTRÔLE <span className="eyebrow-sep">/</span> TABLEAU DE BORD</div><h1>Prêt à prendre de la hauteur<span>.</span></h1><p>Votre espace de pilotage, en toute simplicité.</p></div><div className="intro-right"><span>SESSION DE VOL</span><strong>{clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong><small>HEURE LOCALE</small></div></section>
      <div className="workspace">
        <section className="main-column">
          <div className="section-heading"><div><span className="section-index">01</span><h2>Vue de vol</h2><span className="heading-line"/></div><div className="feed-heading"><span className="live-dot"/> {available ? 'FLUX SIMULÉ ACTIF' : 'FLUX SIMULÉ EN ATTENTE'} <span className="heading-slash">/</span> FPV</div></div>
          <div className="camera-frame">
            <Camera ref={canvas} active={available} telemetry={telemetry}/>
            <div className="camera-shade"/>
            <div className="camera-top"><div className="camera-pill"><span className="live-dot"/> {mode === 'simulation' ? 'SIMULATION' : 'MODE RÉEL INDISPONIBLE'}</div><div className="camera-meta"><Signal size={15}/> {available ? 'SIGNAL SIMULÉ' : 'AUCUN SIGNAL'} <span/> <button onClick={fullscreen} aria-label="Plein écran"><Maximize2 size={16}/></button></div></div>
            <div className="hud-corner tl"/><div className="hud-corner tr"/><div className="hud-corner bl"/><div className="hud-corner br"/>
            <div className="hud-left"><span>ALT</span><strong>{format(telemetry?.altitude)}</strong><small>M</small><div className="hud-ticks">—<br/>—<br/>—<br/>—<br/>—</div></div>
            <div className="hud-right"><span>SPD</span><strong>{format(telemetry?.speed)}</strong><small>M/S</small><div className="hud-ticks">—<br/>—<br/>—<br/>—<br/>—</div></div>
            <div className="crosshair"><span/><i/><span/></div>
            {!available && <div className="feed-off"><Radio size={24}/><strong>{mode === 'real' ? 'Mode réel indisponible' : 'En attente de connexion'}</strong><span>{mode === 'real' ? 'Le protocole du drone reste à identifier.' : 'Connectez la simulation pour commencer.'}</span></div>}
            <div className="camera-bottom"><div><Crosshair size={14}/> CAMÉRA {mode === 'simulation' ? 'SIMULÉE' : 'INDISPONIBLE'} <span className="camera-bottom-sep">|</span> <span>FPV 01</span></div><div>{recording && <b className="recording">● REC</b>} <span className="camera-bottom-sep">+</span> {format(telemetry?.heading, 0)}°</div></div>
          </div>
          <div className="feed-footer"><span><span className="tiny-green">●</span> {available ? 'CAMÉRA VIRTUELLE CONNECTÉE' : 'CAMÉRA VIRTUELLE HORS LIGNE'}</span><span>GAÏA FLIGHT SYSTEM <b>✳</b></span></div>
          <div className="telemetry-grid"><div className="metric"><div className="metric-top"><span>ALTITUDE</span><ArrowUpFromLine size={16}/></div><div><strong>{format(telemetry?.altitude)}</strong><small> m</small></div><p>HAUTEUR SIMULÉE</p></div><div className="metric"><div className="metric-top"><span>DISTANCE</span><Activity size={16}/></div><div><strong>{format(telemetry?.distance)}</strong><small> m</small></div><p>DISTANCE PARCOURUE</p></div><div className="metric"><div className="metric-top"><span>VITESSE</span><Gauge size={16}/></div><div><strong>{format(telemetry?.speed)}</strong><small> m/s</small></div><p>VITESSE SIMULÉE</p></div><div className="metric"><div className="metric-top"><span>BATTERIE</span><BatteryFull size={17}/></div><div><strong>{format(telemetry?.battery, 0)}</strong><small> {telemetry ? '%' : ''}</small></div><p>{telemetry ? 'NIVEAU SIMULÉ' : 'NON DISPONIBLE'}</p></div></div>
        </section>
        <aside className="side-column"><div className="section-heading side-heading"><div><span className="section-index">02</span><h2>Commandes</h2></div><span className="side-heading-icon">✳</span></div>
          <div className="control-panel">
            <div className="panel-label"><span>STATUT DE CONNEXION</span><Wifi size={16}/></div>
            <div className="connection-row"><div className={'connection-icon ' + (connected ? 'on' : '')}><Wifi size={20}/></div><div className="connection-copy"><strong>{connected ? 'Simulation connectée' : mode === 'real' ? 'Drone non disponible' : 'Simulation déconnectée'}</strong><small>{connected ? 'Environnement virtuel actif' : mode === 'real' ? 'Protocole non identifié' : 'Aucun drone connecté'}</small></div><span className={'connection-light ' + (connected ? 'on' : '')}/></div>
            <button className="connect-button" onClick={toggleConnection} disabled={connection === 'connecting'}><span>{connected ? 'Déconnecter' : mode === 'real' ? 'Vérifier la disponibilité' : 'Connecter la simulation'}</span><span>↗</span></button>
            <div className="panel-divider"/>
            <div className="panel-label"><span>MODE DE PILOTAGE</span><span className="mode-indicator"><span/> {mode === 'simulation' ? 'SIMULATION' : 'RÉEL'}</span></div>
            <div className="mode-switch"><button className={mode === 'simulation' ? 'selected' : ''} onClick={() => switchMode('simulation')}><span className="mode-symbol">◉</span> Simulation</button><button className={mode === 'real' ? 'selected' : ''} onClick={() => switchMode('real')}><Radio size={14}/> Drone réel</button></div>
            <div className="mode-note"><Info size={15}/><span>{mode === 'simulation' ? 'Vous êtes en mode simulation. Aucun drone réel n’est contrôlé.' : 'Commandes réelles verrouillées jusqu’à validation du protocole.'}</span></div>
            <div className="panel-divider"/>
            <div className="panel-label"><span>VITESSE DE VOL</span><Gauge size={16}/></div><div className="speed-label"><strong>Réactivité</strong><span>NIVEAU 0{speed}</span></div>
            <div className="speed-switch">{([1,2,3] as const).map((v) => <button key={v} disabled={!available} onClick={() => changeSpeed(v)} className={speed === v ? 'selected' : ''}><span>{v === 1 ? 'Lente' : v === 2 ? 'Normale' : 'Rapide'}</span></button>)}</div>
            <div className="panel-divider"/>
            <div className="panel-label"><span>ACTIONS DE VOL</span><span className="muted">{available ? 'SIMULATION' : 'VERROUILLÉ'}</span></div>
            <div className="flight-actions"><button disabled={!available || !!flying} onClick={() => flight('takeOff')}><ArrowUpFromLine size={18}/><span>Décoller</span></button><button disabled={!available || !flying} onClick={() => flight('land')}><ArrowDownToLine size={18}/><span>Atterrir</span></button></div>
          </div>
        </aside>
      </div>
      <section className="bottom-section"><div className="section-heading"><div><span className="section-index">03</span><h2>Contrôle manuel</h2><span className="heading-line"/></div><span className="bottom-hint"><span/> {available ? 'COMMANDES DE SIMULATION ACTIVES' : 'COMMANDES EN ATTENTE'}</span></div>
        <div className="controls-area"><Joystick left label="GAUCHE" disabled={!available} onChange={axes => move('left', axes)}/><div className="center-controls"><div className="center-head"><span>CAPTURE</span><Aperture size={16}/></div><p>Immortalisez votre vol</p><div className="capture-actions"><button disabled={!available} onClick={photo} aria-label="Prendre une photo simulée"><CameraIcon size={21}/><span>PHOTO</span></button><button disabled={!available} onClick={video} className={recording ? 'is-recording' : ''} aria-label={recording ? 'Arrêter la vidéo simulée' : 'Enregistrer une vidéo simulée'}><Video size={21}/><span>{recording ? 'ARRÊTER' : 'VIDÉO'}</span></button></div><div className="capture-note"><span/> {recording ? 'ENREGISTREMENT EN COURS' : 'CAPTURE SIMULÉE UNIQUEMENT'}</div></div><Joystick label="DROITE" disabled={!available} onChange={axes => move('right', axes)}/></div>
      </section>
      <footer><span>© GAÏA <i/> CONÇU POUR EXPLORER</span><span>FLIGHT CONTROL SYSTEM <i/> V 1.0</span><button onClick={() => setSettings(true)}><CircleHelp size={14}/> AIDE & PARAMÈTRES <ChevronDown size={13}/></button></footer>
    </main>
    {notice && <div className="toast" role="status"><Info size={16}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Fermer"><X size={14}/></button></div>}
    {settings && <div className="modal-backdrop" onClick={() => setSettings(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={e => e.stopPropagation()}><div className="modal-top"><div><span className="eyebrow">GAÏA / CONFIGURATION</span><h2 id="settings-title">Paramètres & aide</h2></div><button className="icon-button" onClick={() => setSettings(false)} aria-label="Fermer les paramètres"><X size={20}/></button></div><div className="settings-block"><div className="settings-icon"><Expand size={19}/></div><div><strong>Affichage plein écran</strong><p>Sur iPhone, installez l’application sur l’écran d’accueil pour profiter d’un affichage autonome. Tournez votre téléphone en paysage pour piloter.</p><button className="outline-button" onClick={fullscreen}>Activer / quitter le plein écran ↗</button></div></div><div className="settings-block"><div className="settings-icon"><Wifi size={19}/></div><div><strong>Connexion au drone</strong><p>Le protocole et le flux vidéo ne sont pas identifiés. La connexion au Wi-Fi du drone ne suffit pas à activer le pilotage. Aucune commande réelle n’est envoyée.</p></div></div><div className="settings-block"><div className="settings-icon"><Check size={19}/></div><div><strong>Installer sur iPhone</strong><p>Dans Safari, ouvrez le menu Partager puis choisissez « Sur l’écran d’accueil ». Ouvrez l’app une première fois avec Internet avant de rejoindre le Wi-Fi du drone.</p></div></div><div className="modal-foot">GAÏA DRONE CONTROLLER <span>VERSION 1.0</span></div></section></div>}
  </div>;
}
