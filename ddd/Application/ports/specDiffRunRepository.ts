export interface SpecDiffRunRepository {
  save(run: Record<string, unknown>): Promise<string>;
}

