import type { AxiosInstance } from 'axios';

export interface MenuInfoTarget {
  urlPath: string;
  regions: string[];
}

export class MenuInfoClient {
  constructor(
    private readonly deps: {
      http: AxiosInstance;
      sign: string;
      language: string;
    },
  ) {}

  async fetchTargets(): Promise<MenuInfoTarget[]> {
    const res = await this.deps.http.get(
      '/api/calculator/rest/cbc/portalcalculatornodeservice/v4/api/menuInfo',
      {
        params: {
          sign: this.deps.sign,
          language: this.deps.language,
        },
      },
    );

    const data: any = res.data as any;
    const menuInfos: any[] = data?.menuInfos ?? [];
    const targets: MenuInfoTarget[] = [];

    for (const parent of menuInfos) {
      const subCategoryLists: any[] = parent?.subCategoryLists ?? [];
      for (const sub of subCategoryLists) {
        const hasCalculator = !!sub?.hasCalculator;
        const hideCalculator = !!sub?.hideCalculator;
        if (!hasCalculator || hideCalculator) {
          continue;
        }

        const urlPath = String(sub?.urlPath || '').trim();
        if (!urlPath) {
          continue;
        }

        const regionList: any[] = sub?.regionOnline?.regionList ?? [];
        const regions = regionList.map((r) => String(r)).filter(Boolean);
        if (regions.length === 0) {
          continue;
        }

        targets.push({ urlPath, regions });
      }
    }

    return targets;
  }
}

