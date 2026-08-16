import 'server-only';

import type { AiSystemView, Collection } from './types';

export interface PlatformAiSystem {
  readonly id: string;
  readonly systemCode: string;
  readonly name: string;
  readonly providerLegalName: string;
  readonly intendedPurpose: string;
  readonly version: string;
  readonly lifecycleStatus: string;
  readonly ownerUserId: string;
  readonly updatedAt: string;
}

function governanceStatus(status: string): AiSystemView['status'] {
  if (status === 'active' || status === 'retired') return 'complete';
  if (status === 'suspended') return 'attention';
  if (status === 'validation' || status === 'pilot') return 'ready';
  return 'draft';
}

export function aiSystem(item: PlatformAiSystem): AiSystemView {
  return {
    id: item.id,
    name: item.name,
    purpose: item.intendedPurpose,
    classification: 'Not classified',
    status: governanceStatus(item.lifecycleStatus),
    owner: item.ownerUserId,
    updatedAt: item.updatedAt,
  };
}

export function aiSystems(data: {
  readonly items: readonly PlatformAiSystem[];
  readonly total: number;
}): Collection<AiSystemView> {
  return { items: data.items.map(aiSystem), total: data.total };
}
