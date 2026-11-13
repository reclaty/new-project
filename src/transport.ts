export type Axes = { x: number; y: number };
export type Controls = { left: Axes; right: Axes };
export type FlightState = 'grounded' | 'flying';
export type Telemetry = { altitude: number; distance: number; speed: number; heading: number; battery: number; flight: FlightState };
/** Optional adapters: implement only after the actual media and capture protocols are verified. */
export interface DroneVideoSource {
  open(): Promise<MediaStream>;
  close(): void;
}
export interface DroneCapture {
  takePhoto(): Promise<Blob>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<Blob>;
}
export interface DroneTransport {
  readonly video?: DroneVideoSource;
  readonly capture?: DroneCapture;
  readonly kind: 'simulation' | 'real';
  connect(): Promise<void>;
  disconnect(): void;
  setControls(controls: Controls): void;
  setSpeed(speed: 1 | 2 | 3): void;
  takeOff(): void;
  land(): void;
  getTelemetry(): Telemetry | null;
}
export const neutralControls = (): Controls => ({ left: { x: 0, y: 0 }, right: { x: 0, y: 0 } });

/** Purely local model. Values are illustrative, not a model of the physical drone. */
export class SimulationTransport implements DroneTransport {
  readonly kind = 'simulation' as const;
  private connected = false;
  private controls = neutralControls();
  private level: 1 | 2 | 3 = 2;
  private telemetry: Telemetry = { altitude: 0, distance: 0, speed: 0, heading: 0, battery: 100, flight: 'grounded' };
  async connect() { this.connected = true; }
  disconnect() { this.connected = false; this.controls = neutralControls(); this.telemetry = { altitude: 0, distance: 0, speed: 0, heading: 0, battery: 100, flight: 'grounded' }; }
  setControls(controls: Controls) { this.controls = this.connected ? controls : neutralControls(); }
  setSpeed(speed: 1 | 2 | 3) { this.level = speed; }
  takeOff() { if (this.connected && this.telemetry.flight === 'grounded') this.telemetry = { ...this.telemetry, flight: 'flying', altitude: 1.2 }; }
  land() { if (this.connected) { this.controls = neutralControls(); this.telemetry = { ...this.telemetry, flight: 'grounded', altitude: 0, speed: 0 }; } }
  getTelemetry() { return this.connected ? { ...this.telemetry } : null; }
  tick(dt: number) {
    if (!this.connected || this.telemetry.flight !== 'flying') return;
    const { left, right } = this.controls;
    const speed = Math.hypot(right.x, right.y) * this.level * 1.4;
    this.telemetry = { ...this.telemetry, altitude: Math.max(0.2, this.telemetry.altitude - left.y * dt * this.level), distance: this.telemetry.distance + speed * dt, speed, heading: (this.telemetry.heading + left.x * dt * 45 + 360) % 360, battery: Math.max(0, this.telemetry.battery - dt * 0.015) };
  }
}
/** No discovery or network I/O until a verified protocol is implemented. */
export class UnavailableTransport implements DroneTransport {
  readonly kind = 'real' as const;
  async connect(): Promise<void> { throw new Error('Protocole du drone non identifié. Connexion réelle indisponible.'); }
  disconnect() {}
  setControls(_controls: Controls) {}
  setSpeed(_speed: 1 | 2 | 3) {}
  takeOff() { throw new Error('Commande non vérifiée.'); }
  land() { throw new Error('Commande non vérifiée.'); }
  getTelemetry() { return null; }
}
