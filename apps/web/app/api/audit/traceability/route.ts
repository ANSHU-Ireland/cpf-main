import { callPlatform, platformErrorResponse } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface EvidenceCollectionRecord {
  readonly requirementIds: readonly string[];
}

interface EvidenceCollectionPage {
  readonly items: readonly EvidenceCollectionRecord[];
}

interface PlatformTraceabilityRow {
  readonly requirementId: string;
  readonly requirementTitle: string;
  readonly controls: readonly string[];
  readonly surfaces: readonly string[];
  readonly endpoints: readonly string[];
  readonly evidence: readonly string[];
  readonly status: string;
  readonly coverage: string;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const collectionResult = await callPlatform<EvidenceCollectionPage>({
      request,
      path: '/audit/evidence-collections',
      method: 'GET',
    });
    const requirementIds = [
      ...new Set(collectionResult.data.items.flatMap((item) => item.requirementIds)),
    ];
    const rows = await Promise.all(
      requirementIds.map(async (requirementId) => {
        const result = await callPlatform<PlatformTraceabilityRow>({
          request,
          path: `/audit/traceability/${encodeURIComponent(requirementId)}`,
          method: 'GET',
          correlationId: collectionResult.correlationId,
        });
        return {
          requirementId: result.data.requirementId,
          description: result.data.requirementTitle,
          controls: result.data.controls,
          surfaces: result.data.surfaces,
          endpoints: result.data.endpoints,
          evidence: result.data.evidence,
          status: result.data.status,
          coverage: result.data.coverage,
        };
      }),
    );
    return Response.json(
      { items: rows, total: rows.length },
      { headers: { 'x-correlation-id': collectionResult.correlationId } },
    );
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
