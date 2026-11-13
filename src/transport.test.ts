import { describe, expect, it } from 'vitest';
import { neutralControls, SimulationTransport, UnavailableTransport } from './transport';

describe('transport de simulation', () => {
  it('ne fournit pas de télémétrie avant connexion et ne décolle pas seul', async () => {
    const t = new SimulationTransport();
    t.takeOff(); expect(t.getTelemetry()).toBeNull();
    await t.connect(); expect(t.getTelemetry()?.flight).toBe('grounded');
  });
  it('simule les commandes uniquement en vol, puis arrête le mouvement au neutre', async () => {
    const t = new SimulationTransport(); await t.connect();
    t.setControls({ left: { x: 1, y: -1 }, right: { x: 0, y: -1 } });
    t.tick(1); expect(t.getTelemetry()?.altitude).toBe(0);
    t.takeOff(); t.tick(1);
    expect(t.getTelemetry()?.altitude).toBeGreaterThan(1.2);
    expect(t.getTelemetry()?.distance).toBeGreaterThan(0);
    expect(t.getTelemetry()?.heading).toBeGreaterThan(0);
    t.setControls(neutralControls()); const before = t.getTelemetry()!; t.tick(1);
    expect(t.getTelemetry()?.distance).toBe(before.distance);
    expect(t.getTelemetry()?.altitude).toBe(before.altitude);
    expect(t.getTelemetry()?.speed).toBe(0);
    t.land(); expect(t.getTelemetry()?.flight).toBe('grounded'); expect(t.getTelemetry()?.altitude).toBe(0);
    t.disconnect(); expect(t.getTelemetry()).toBeNull();
  });
  it('applique les trois vitesses et réinitialise à la déconnexion', async () => {
    const t = new SimulationTransport(); await t.connect(); t.takeOff();
    t.setControls({ ...neutralControls(), right: { x: 1, y: 0 } });
    t.setSpeed(1); t.tick(1); const slow = t.getTelemetry()!.speed;
    t.setSpeed(3); t.tick(1); expect(t.getTelemetry()!.speed).toBeGreaterThan(slow);
    t.disconnect(); await t.connect(); expect(t.getTelemetry()?.flight).toBe('grounded'); expect(t.getTelemetry()?.battery).toBe(100);
  });
});
describe('transport réel', () => {
  it('refuse la connexion et les actions sans protocole vérifié', async () => {
    const t = new UnavailableTransport();
    await expect(t.connect()).rejects.toThrow(/non identifié/);
    expect(() => t.takeOff()).toThrow(); expect(() => t.land()).toThrow();
    expect(t.getTelemetry()).toBeNull();
  });
});
