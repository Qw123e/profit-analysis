import { test, expect } from "@playwright/test";

const BASE = "/bi_poc";
const API_BASE = "http://localhost:8000/api";

// ============================================
// 1. 페이지 로드 시간 측정
// ============================================

test.describe("Performance: 페이지 로드 시간", () => {
  let dashboardKeys: string[] = [];

  test.beforeAll(async () => {
    const res = await fetch(`${API_BASE}/v1/dashboards`);
    const data = await res.json();
    dashboardKeys = data.items.map((d: { key: string }) => d.key);
  });

  test("모든 대시보드 페이지 로드 시간을 측정한다", async ({ page }) => {
    const results: { key: string; loadTimeMs: number; domContentLoaded: number; firstPaint: number }[] = [];

    for (const key of dashboardKeys) {
      const startTime = Date.now();

      await page.goto(`${BASE}/dashboards/${key}`, { waitUntil: "domcontentloaded" });

      const domContentLoaded = Date.now() - startTime;

      // Navigation Timing API로 정밀 측정
      const perfMetrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType("paint");
        const firstPaint = paint.find((p) => p.name === "first-paint");
        return {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
          firstPaint: firstPaint ? Math.round(firstPaint.startTime) : 0,
          ttfb: Math.round(nav.responseStart - nav.requestStart),
        };
      });

      const loadTimeMs = Date.now() - startTime;

      results.push({
        key,
        loadTimeMs,
        domContentLoaded: perfMetrics.domContentLoaded,
        firstPaint: perfMetrics.firstPaint,
      });
    }

    // 결과 출력
    console.log("\n=== 페이지 로드 시간 측정 결과 ===");
    console.log("  ┌─────────────────────────┬──────────────┬───────────────────┬──────────────┐");
    console.log("  │ Dashboard               │ Total (ms)   │ DOMContentLoaded  │ First Paint  │");
    console.log("  ├─────────────────────────┼──────────────┼───────────────────┼──────────────┤");
    for (const r of results) {
      const key = r.key.padEnd(23);
      const total = String(r.loadTimeMs).padStart(10);
      const dcl = String(r.domContentLoaded).padStart(15);
      const fp = String(r.firstPaint).padStart(10);
      console.log(`  │ ${key} │ ${total}ms │ ${dcl}ms │ ${fp}ms │`);
    }
    console.log("  └─────────────────────────┴──────────────┴───────────────────┴──────────────┘");

    // 각 페이지가 5초 이내에 로드되어야 함
    for (const r of results) {
      expect(r.loadTimeMs, `${r.key} 로드 시간이 5초 초과`).toBeLessThan(5000);
    }
  });
});

// ============================================
// 2. Plotly 차트 렌더링 시간 측정
// ============================================

test.describe("Performance: 차트 렌더링 시간", () => {
  test("health-function 탭별 차트 렌더링 시간을 측정한다", async ({ page }) => {
    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const tabs = ["종합", "채널분석", "기능별 분석", "제형별 분석"];
    const results: { tab: string; renderTimeMs: number; chartCount: number }[] = [];

    for (const tabName of tabs) {
      const tab = page.getByRole("button", { name: tabName, exact: true });
      if (!(await tab.isVisible({ timeout: 3000 }).catch(() => false))) continue;

      const startTime = Date.now();
      await tab.click();

      // Plotly 차트(.js-plotly-plot)가 렌더링될 때까지 대기
      try {
        await page.waitForSelector(".js-plotly-plot", { timeout: 10000 });
      } catch {
        // 차트가 없는 탭일 수 있음
      }

      const renderTimeMs = Date.now() - startTime;

      // 렌더링된 차트 개수 확인
      const chartCount = await page.locator(".js-plotly-plot").count();

      results.push({ tab: tabName, renderTimeMs, chartCount });
    }

    // 결과 출력
    console.log("\n=== 차트 렌더링 시간 측정 결과 ===");
    console.log("  ┌─────────────────────┬────────────────┬──────────────┐");
    console.log("  │ Tab                 │ Render (ms)    │ Chart Count  │");
    console.log("  ├─────────────────────┼────────────────┼──────────────┤");
    for (const r of results) {
      const tab = r.tab.padEnd(19);
      const render = String(r.renderTimeMs).padStart(12);
      const count = String(r.chartCount).padStart(10);
      console.log(`  │ ${tab} │ ${render}ms │ ${count}  │`);
    }
    console.log("  └─────────────────────┴────────────────┴──────────────┘");

    // 각 탭의 차트가 10초 이내에 렌더링되어야 함
    for (const r of results) {
      expect(r.renderTimeMs, `${r.tab} 차트 렌더링 10초 초과`).toBeLessThan(10000);
    }
  });
});

// ============================================
// 3. Core Web Vitals 수집
// ============================================

test.describe("Performance: Core Web Vitals", () => {
  test("대시보드 목록 페이지의 Core Web Vitals를 측정한다", async ({ page }) => {
    await page.goto(`${BASE}/dashboards`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const vitals = await page.evaluate(() => {
      return new Promise<{
        lcp: number;
        fcp: number;
        cls: number;
        ttfb: number;
      }>((resolve) => {
        let lcp = 0;
        let cls = 0;

        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            lcp = Math.round(entries[entries.length - 1].startTime);
          }
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

        // CLS (Cumulative Layout Shift)
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });

        // FCP & TTFB from paint/navigation timing
        const paintEntries = performance.getEntriesByType("paint");
        const fcpEntry = paintEntries.find((e) => e.name === "first-contentful-paint");
        const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0;

        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const ttfb = Math.round(nav.responseStart - nav.requestStart);

        // 잠시 대기 후 결과 수집 (LCP/CLS 안정화)
        setTimeout(() => {
          lcpObserver.disconnect();
          clsObserver.disconnect();
          resolve({ lcp, fcp, cls: Math.round(cls * 1000) / 1000, ttfb });
        }, 1000);
      });
    });

    // 결과 출력
    console.log("\n=== Core Web Vitals (대시보드 목록) ===");
    console.log(`  FCP  (First Contentful Paint):  ${vitals.fcp}ms    ${vitals.fcp < 1800 ? "✓ Good" : vitals.fcp < 3000 ? "△ Needs Improvement" : "✘ Poor"}`);
    console.log(`  LCP  (Largest Contentful Paint): ${vitals.lcp}ms    ${vitals.lcp < 2500 ? "✓ Good" : vitals.lcp < 4000 ? "△ Needs Improvement" : "✘ Poor"}`);
    console.log(`  CLS  (Cumulative Layout Shift):  ${vitals.cls}      ${vitals.cls < 0.1 ? "✓ Good" : vitals.cls < 0.25 ? "△ Needs Improvement" : "✘ Poor"}`);
    console.log(`  TTFB (Time to First Byte):       ${vitals.ttfb}ms    ${vitals.ttfb < 800 ? "✓ Good" : "△ Needs Improvement"}`);

    // 기준: FCP < 3s, LCP < 4s, CLS < 0.25
    expect(vitals.fcp, "FCP가 3초 초과").toBeLessThan(3000);
    expect(vitals.lcp, "LCP가 4초 초과").toBeLessThan(4000);
    expect(vitals.cls, "CLS가 0.25 초과").toBeLessThan(0.25);
  });

  test("health-function 대시보드의 Core Web Vitals를 측정한다", async ({ page }) => {
    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const vitals = await page.evaluate(() => {
      return new Promise<{
        lcp: number;
        fcp: number;
        cls: number;
        ttfb: number;
        domNodes: number;
        jsHeapSize: number;
      }>((resolve) => {
        let lcp = 0;
        let cls = 0;

        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            lcp = Math.round(entries[entries.length - 1].startTime);
          }
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });

        const paintEntries = performance.getEntriesByType("paint");
        const fcpEntry = paintEntries.find((e) => e.name === "first-contentful-paint");
        const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0;

        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const ttfb = Math.round(nav.responseStart - nav.requestStart);

        // DOM 노드 수
        const domNodes = document.querySelectorAll("*").length;

        // JS Heap 사이즈 (Chrome only)
        const perf = performance as any;
        const jsHeapSize = perf.memory ? Math.round(perf.memory.usedJSHeapSize / 1024 / 1024) : 0;

        setTimeout(() => {
          lcpObserver.disconnect();
          clsObserver.disconnect();
          resolve({ lcp, fcp, cls: Math.round(cls * 1000) / 1000, ttfb, domNodes, jsHeapSize });
        }, 1000);
      });
    });

    // 결과 출력
    console.log("\n=== Core Web Vitals (health-function) ===");
    console.log(`  FCP  (First Contentful Paint):  ${vitals.fcp}ms    ${vitals.fcp < 1800 ? "✓ Good" : vitals.fcp < 3000 ? "△ Needs Improvement" : "✘ Poor"}`);
    console.log(`  LCP  (Largest Contentful Paint): ${vitals.lcp}ms    ${vitals.lcp < 2500 ? "✓ Good" : vitals.lcp < 4000 ? "△ Needs Improvement" : "✘ Poor"}`);
    console.log(`  CLS  (Cumulative Layout Shift):  ${vitals.cls}      ${vitals.cls < 0.1 ? "✓ Good" : vitals.cls < 0.25 ? "△ Needs Improvement" : "✘ Poor"}`);
    console.log(`  TTFB (Time to First Byte):       ${vitals.ttfb}ms    ${vitals.ttfb < 800 ? "✓ Good" : "△ Needs Improvement"}`);
    console.log(`  DOM Nodes:                        ${vitals.domNodes}`);
    console.log(`  JS Heap:                          ${vitals.jsHeapSize}MB`);

    expect(vitals.fcp, "FCP가 3초 초과").toBeLessThan(3000);
    expect(vitals.lcp, "LCP가 4초 초과").toBeLessThan(4000);
    expect(vitals.cls, "CLS가 0.25 초과").toBeLessThan(0.25);
  });
});

// ============================================
// 4. API 응답 시간 측정
// ============================================

test.describe("Performance: API 응답 시간", () => {
  test("주요 API 엔드포인트 응답 시간을 측정한다", async ({ page }) => {
    const apiCalls: { url: string; method: string; status: number; durationMs: number }[] = [];

    // 네트워크 요청 모니터링
    page.on("request", (req) => {
      if (req.url().includes("/api/")) {
        (req as any).__startTime = Date.now();
      }
    });

    page.on("response", (res) => {
      const req = res.request();
      if (req.url().includes("/api/") && (req as any).__startTime) {
        apiCalls.push({
          url: req.url().replace(/https?:\/\/[^/]+/, ""),
          method: req.method(),
          status: res.status(),
          durationMs: Date.now() - (req as any).__startTime,
        });
      }
    });

    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000);

    // 결과 출력
    console.log("\n=== API 응답 시간 측정 결과 ===");
    console.log("  ┌────────┬──────────────────────────────────────────────────────┬────────┬──────────────┐");
    console.log("  │ Method │ URL                                                  │ Status │ Duration     │");
    console.log("  ├────────┼──────────────────────────────────────────────────────┼────────┼──────────────┤");
    for (const call of apiCalls) {
      const method = call.method.padEnd(6);
      const url = call.url.length > 52 ? call.url.substring(0, 49) + "..." : call.url.padEnd(52);
      const status = String(call.status).padStart(6);
      const duration = String(call.durationMs).padStart(10);
      const indicator = call.durationMs < 2000 ? "✓" : call.durationMs < 5000 ? "△" : "✘";
      console.log(`  │ ${method} │ ${url} │ ${status} │ ${duration}ms ${indicator}│`);
    }
    console.log("  └────────┴──────────────────────────────────────────────────────┴────────┴──────────────┘");

    if (apiCalls.length > 0) {
      const avgMs = Math.round(apiCalls.reduce((sum, c) => sum + c.durationMs, 0) / apiCalls.length);
      const maxMs = Math.max(...apiCalls.map((c) => c.durationMs));
      console.log(`\n  평균: ${avgMs}ms / 최대: ${maxMs}ms / 총 ${apiCalls.length}건`);

      // 모든 API가 5초 이내에 응답해야 함
      for (const call of apiCalls) {
        expect(call.durationMs, `${call.url} 응답 시간이 5초 초과`).toBeLessThan(5000);
      }
    }
  });
});
