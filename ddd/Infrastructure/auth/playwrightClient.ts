import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { AppLogger } from '../../Application/ports/logger';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface AuthContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export class PlaywrightClient {
  constructor(
    private readonly cfg: {
      headless: boolean;
      locale: string;
      loginUrl: string;
      region: string;
      username: string;
      password: string;
      logger: AppLogger;
    },
  ) {}

  async login(): Promise<AuthContext> {
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const startedAt = Date.now();
    this.cfg.logger.info('playwright login start', {
      loginUrl: this.cfg.loginUrl,
      headless: this.cfg.headless,
      locale: this.cfg.locale,
    });

    try {
      const browser = await chromium.launch({ headless: this.cfg.headless });
      const context = await browser.newContext({
        locale: this.cfg.locale,
      });
      const page = await context.newPage();

      await page.goto(this.cfg.loginUrl, { waitUntil: 'domcontentloaded' });
      this.cfg.logger.info('playwright login page opened', {
        url: page.url(),
      });

      // 登录页面常见是多 frame / 不同输入框类型，因而这里做多 selector + iframe 兜底。
      if (!this.cfg.username || !this.cfg.password) {
        this.cfg.logger.warn('playwright login skipped credential fill due to empty username/password');
      } else {
        const usernameSelectors = [
          '#personalAccountInputId input',
          'input[type="text"]',
          'input[type="email"]',
          'input[name*=user i]',
          'input[name*=account i]',
          'input[autocomplete="username"]',
          'input[placeholder*="账号"]',
          'input[placeholder*="用户名"]',
          'input[aria-label*="账号"]',
          'input[aria-label*="用户名"]',
        ];

        const passwordSelectors = [
          '#personalPasswordInputId input',
          'input[type="password"]',
          'input[autocomplete="current-password"]',
          'input[placeholder*="密码"]',
          'input[aria-label*="密码"]',
        ];

        const loginButtonSelectors = [
          "#btn_submit",
          'button:has-text("登录")',
          'button:has-text("Login")',
          'button[type="submit"]',
          'input[type="submit"]',
        ];

        const waitForAnySelectorAcrossFrames = async (
          selectorList: string[],
          timeoutMs: number,
          pollMs: number,
        ): Promise<{ found: boolean; foundSelector?: string; foundFrameUrl?: string; frameCount: number }> => {
          const endAt = Date.now() + timeoutMs;
          while (Date.now() < endAt) {
            const frames = page.frames();
            for (const sel of selectorList) {
              for (const f of frames) {
                try {
                  const c = await f.locator(sel).count();
                  if (c > 0) {
                    return { found: true, foundSelector: sel, foundFrameUrl: f.url(), frameCount: frames.length };
                  }
                } catch {
                  // ignore
                }
              }
            }
            await sleep(pollMs);
          }
          const frames = page.frames();
          return { found: false, frameCount: frames.length };
        };

        // 等待登录表单渲染出来（至少等到用户名或密码框出现其一），避免太早统计/填充。
        const formWait = await waitForAnySelectorAcrossFrames(
          [...usernameSelectors, ...passwordSelectors],
          20_000,
          300,
        );
        this.cfg.logger.info('playwright login form wait result', formWait);

        const frames = page.frames();
        this.cfg.logger.info('playwright login filling credentials', {
          hasUsername: true,
          hasPassword: true,
          iframeCount: frames.length,
        });

        const countInAllFrames = async (selector: string): Promise<number> => {
          let total = 0;
          for (const f of frames) {
            total += await f.locator(selector).count();
          }
          return total;
        };

        const usernameCounts: Record<string, number> = {};
        for (const sel of usernameSelectors) {
          usernameCounts[sel] = await countInAllFrames(sel);
        }

        const passwordCounts: Record<string, number> = {};
        for (const sel of passwordSelectors) {
          passwordCounts[sel] = await countInAllFrames(sel);
        }

        this.cfg.logger.info('playwright login credential locator counts', {
          iframeCount: frames.length,
          usernameCounts,
          passwordCounts,
        });

        const fillFirstMatch = async (
          selectorList: string[],
          value: string,
        ): Promise<{ filled: boolean; usedSelector?: string; usedFrameUrl?: string }> => {
          for (const sel of selectorList) {
            for (const f of frames) {
              const loc = f.locator(sel).first();
              const c = await f.locator(sel).count();
              if (c <= 0) {
                continue;
              }
              try {
                await loc.fill(value);
                return { filled: true, usedSelector: sel, usedFrameUrl: f.url() };
              } catch {
                // ignore and continue
              }
            }
          }
          return { filled: false };
        };

        const userRes = await fillFirstMatch(usernameSelectors, this.cfg.username);
        // 有些页面是“输入账号后才渲染密码框”，因此密码填充前再等一下/再查一次
        if (!userRes.filled) {
          this.cfg.logger.warn('playwright login username not filled, will still try password after short wait');
        }
        await sleep(500);
        const passWait = await waitForAnySelectorAcrossFrames(passwordSelectors, 10_000, 300);
        this.cfg.logger.info('playwright login password wait result', passWait);
        const passRes = await fillFirstMatch(passwordSelectors, this.cfg.password);

        this.cfg.logger.info('playwright login credential fill result', {
          hasUsername: Boolean(userRes.filled),
          usernameUsedSelector: userRes.usedSelector,
          usernameUsedFrameUrl: userRes.usedFrameUrl,
          hasPassword: Boolean(passRes.filled),
          passwordUsedSelector: passRes.usedSelector,
          passwordUsedFrameUrl: passRes.usedFrameUrl,
        });

        const clickFirstMatch = async (
          selectorList: string[],
        ): Promise<{ clicked: boolean; usedSelector?: string; usedFrameUrl?: string }> => {
          for (const sel of selectorList) {
            for (const f of frames) {
              const loc = f.locator(sel).first();
              const c = await f.locator(sel).count();
              if (c <= 0) {
                continue;
              }
              try {
                await loc.click();
                return { clicked: true, usedSelector: sel, usedFrameUrl: f.url() };
              } catch {
                // ignore and continue
              }
            }
          }
          return { clicked: false };
        };

        const btnRes = await clickFirstMatch(loginButtonSelectors);
        this.cfg.logger.info('playwright login click result', btnRes);

        if (!userRes.filled || !passRes.filled || !btnRes.clicked) {
          try {
            const screenshotDir = path.join(process.cwd(), 'logs', 'page-diff-crawler');
            await fs.mkdir(screenshotDir, { recursive: true });
            const screenshotPath = path.join(
              screenshotDir,
              `playwright-login-not-ready-${Date.now()}.png`,
            );
            await page.screenshot({ path: screenshotPath, fullPage: true });
            this.cfg.logger.warn('playwright login not ready, screenshot saved', { screenshotPath });
          } catch (e) {
            this.cfg.logger.warn('playwright login screenshot failed', {
              message: e instanceof Error ? e.message : String(e),
            });
          }
        }
      }

      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);

      const cookies = await context.cookies().catch(() => []);
      const hasCftk = cookies.some((c) => c.name === 'cftk');
      this.cfg.logger.info('playwright login post-check', {
        url: page.url(),
        durationMs: Date.now() - startedAt,
        hasCftk,
      });

      this.cfg.logger.info('playwright login ready', {
        url: page.url(),
        durationMs: Date.now() - startedAt,
      });
      return { browser, context, page };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.cfg.logger.error('playwright login failed', { message, stack });
      throw err;
    }
  }
}

