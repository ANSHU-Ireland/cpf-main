import { describe, expect, it } from 'vitest';
import { NORTHSTAR_DEMO_ACTOR, resolveDemoActor } from './demo-actor.js';

describe('resolveDemoActor', () => {
  it('returns no identity unless demo mode is explicit', () => {
    expect(resolveDemoActor({})).toBeNull();
    expect(resolveDemoActor({ CPF_DEMO_MODE: 'false' })).toBeNull();
  });

  it('returns only the deterministic synthetic identity in demo mode', () => {
    expect(resolveDemoActor({ CPF_DEMO_MODE: 'true' })).toEqual(NORTHSTAR_DEMO_ACTOR);
  });
});
