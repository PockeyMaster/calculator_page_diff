import axios, { type AxiosInstance } from 'axios';

export function buildAxiosClient(params?: { baseURL?: string; timeoutMs?: number }): AxiosInstance {
  return axios.create({
    baseURL: params?.baseURL,
    timeout: params?.timeoutMs ?? 30_000,
    headers: {
      'user-agent': 'page-diff-crawler/1.0',
      accept: 'application/json, text/plain, */*',
    },
  });
}

