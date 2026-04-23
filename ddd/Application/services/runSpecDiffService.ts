import type { CalcSpecsProvider } from '../ports/calcSpecsProvider';
import type { PurchaseSpecsProvider } from '../ports/purchaseSpecsProvider';
import type { SpecDiffRunRepository } from '../ports/specDiffRunRepository';
import type { AppLogger } from '../ports/logger';
import type { CalcSpecFilter, PurchaseSpecFilter } from '../../Domain/comparison/filters';
import { SpecComparator } from '../../Domain/comparison/specComparator';

export type TriggerType = 'manual' | 'schedule';

export interface RunSpecDiffParams {
  service: string;
  triggerType: TriggerType;
}

export interface RunSpecDiffResult {
  runs: Array<{
    region: string;
    runId: string;
    summary: {
      onlyInCalc: number;
      onlyInPurchase: number;
      differ: number;
      match: number;
    };
  }>;
}

export class RunSpecDiffService {
  constructor(
    private readonly deps: {
      calcSpecsProvider: CalcSpecsProvider;
      purchaseSpecsProvider: PurchaseSpecsProvider;
      calcSpecFilter: (service: string) => CalcSpecFilter;
      purchaseSpecFilter: (service: string) => PurchaseSpecFilter;
      repository: SpecDiffRunRepository;
      comparator: SpecComparator;
      logger: AppLogger;
    },
  ) {}

  async runOnce(params: RunSpecDiffParams): Promise<RunSpecDiffResult> {
    const runAt = new Date();
    const service = params.service;
    const traceId = `${service}-${runAt.getTime()}`;
    const startedAt = Date.now();

    this.deps.logger.info('spec-diff run start', { traceId, service, triggerType: params.triggerType, runAt: runAt.toISOString() });

    try {
      const regions = await this.deps.calcSpecsProvider.fetchRegions({ service });
      this.deps.logger.info('spec-diff fetched regions', { traceId, service, regionCount: regions.length, regions });

      const purchaseSession = await this.deps.purchaseSpecsProvider.createSession({ service, requestedRegions: regions });
      const allowedRegions = purchaseSession.allowedRegions;
      this.deps.logger.info('spec-diff purchase allowed regions', {
        traceId,
        service,
        requestedRegionCount: regions.length,
        allowedRegionCount: allowedRegions.length,
        allowedRegions,
      });

      try {
        const runs: RunSpecDiffResult['runs'] = [];
        for (const region of allowedRegions) {
          const regionTraceId = `${traceId}-${region}`;
          this.deps.logger.info('spec-diff region start', { traceId: regionTraceId, service, region });

          this.deps.logger.info('spec-diff fetching calc specs', { traceId: regionTraceId, service, region });
          const rawCalcSpecs = await this.deps.calcSpecsProvider.fetchCalcSpecs({ service, region });
          this.deps.logger.info('spec-diff fetched calc specs', {
            traceId: regionTraceId,
            service,
            region,
            calcCount: rawCalcSpecs.size,
          });

          this.deps.logger.info('spec-diff fetching purchase specs', { traceId: regionTraceId, service, region });
          const rawPurchaseSpecs = await purchaseSession.fetchPurchaseSpecs({ service, region });
          this.deps.logger.info('spec-diff fetched purchase specs', {
            traceId: regionTraceId,
            service,
            region,
            purchaseCount: rawPurchaseSpecs.size,
          });

          const filteredCalcSpecs = this.deps.calcSpecFilter(service)(rawCalcSpecs);
          const filteredPurchaseSpecs = this.deps.purchaseSpecFilter(service)(rawPurchaseSpecs);
          this.deps.logger.info('spec-diff after filters', {
            traceId: regionTraceId,
            service,
            region,
            calcFilteredCount: filteredCalcSpecs.size,
            purchaseFilteredCount: filteredPurchaseSpecs.size,
          });

          this.deps.logger.info('spec-diff comparing specs', { traceId: regionTraceId, service, region });
          const diff = this.deps.comparator.compare(filteredCalcSpecs, filteredPurchaseSpecs);
          this.deps.logger.info('spec-diff diff result', {
            traceId: regionTraceId,
            service,
            region,
            summary: diff.summary,
          });

          const run: Record<string, unknown> = {
            runAt,
            triggerType: params.triggerType,
            service,
            region,
            summary: diff.summary,
            onlyInCalcKeys: diff.onlyInCalcKeys,
            onlyInPurchaseKeys: diff.onlyInPurchaseKeys,
            byKey: diff.byKey,
          };

          this.deps.logger.info('spec-diff saving run', { traceId: regionTraceId, service, region });
          const runId = await this.deps.repository.save(run);
          runs.push({ region, runId, summary: diff.summary });
          this.deps.logger.info('spec-diff run saved', {
            traceId: regionTraceId,
            service,
            region,
            runId,
            summary: diff.summary,
          });
        }

        const durationMs = Date.now() - startedAt;
        this.deps.logger.info('spec-diff run finished', { traceId, service, durationMs, runCount: runs.length });
        return { runs };
      } finally {
        await purchaseSession.close().catch(() => undefined);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.deps.logger.error('spec-diff run failed', {
        traceId,
        service,
        triggerType: params.triggerType,
        message,
        stack,
      });
      throw err;
    }
  }
}

