import type { AxiosInstance } from 'axios';

export class ProductInfoClient {
  constructor(
    private readonly deps: {
      http: AxiosInstance;
      sign: string;
      tag: string;
      tab: string;
    },
  ) {}

  async fetchProductInfo(params: { urlPath: string; region: string }): Promise<unknown> {
    const res = await this.deps.http.get(
      '/api/calculator/rest/cbc/portalcalculatornodeservice/v4/api/productInfo',
      {
        params: {
          urlPath: params.urlPath,
          tag: this.deps.tag,
          region: params.region,
          tab: this.deps.tab,
          sign: this.deps.sign,
        },
      },
    );
    return res.data as unknown;
  }
}

