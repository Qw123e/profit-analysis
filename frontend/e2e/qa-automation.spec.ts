import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

const BASE = "/bi_poc";
const API_BASE = "http://localhost:8000/api";

// ============================================
// 1. 모든 대시보드 순회 - 에러 없이 렌더링 확인
// ============================================

test.describe("QA: 전체 대시보드 순회 테스트", () => {
  let dashboardKeys: string[] = [];

  test.beforeAll(async () => {
    const res = await fetch(`${API_BASE}/v1/dashboards`);
    const data = await res.json();
    dashboardKeys = data.items.map((d: { key: string }) => d.key);
  });

  test("모든 대시보드가 에러 없이 렌더링된다", async ({ page }) => {
    const results: { key: string; status: string; errors: string[] }[] = [];

    for (const key of dashboardKeys) {
      const errors: string[] = [];
      const warnings: string[] = [];

      page.on("console", (msg: ConsoleMessage) => {
        if (msg.type() === "error") errors.push(msg.text());
        if (msg.type() === "warning") warnings.push(msg.text());
      });

      page.on("pageerror", (err) => {
        errors.push(`[PAGE_ERROR] ${err.message}`);
      });

      await page.goto(`${BASE}/dashboards/${key}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(3000);

      // 404 페이지가 아닌지 확인
      const title = await page.title();
      const is404 = title.includes("404");

      // React 에러 경계(error boundary)가 표시되지 않는지 확인
      const hasErrorBoundary = await page.locator("text=Something went wrong").isVisible().catch(() => false);

      // 치명적 에러 필터링 (네트워크 에러 제외)
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("net::") &&
          !e.includes("Failed to fetch") &&
          !e.includes("ERR_") &&
          !e.includes("404") &&
          !e.includes("CORS")
      );

      results.push({
        key,
        status: is404 ? "404" : hasErrorBoundary ? "ERROR_BOUNDARY" : criticalErrors.length > 0 ? "CONSOLE_ERROR" : "OK",
        errors: criticalErrors,
      });

      // 각 페이지 후 이벤트 리스너 정리
      page.removeAllListeners("console");
      page.removeAllListeners("pageerror");
    }

    // 결과 출력
    console.log("\n=== QA 대시보드 순회 결과 ===");
    for (const r of results) {
      const icon = r.status === "OK" ? "✓" : "✘";
      console.log(`  ${icon} ${r.key}: ${r.status}`);
      if (r.errors.length > 0) {
        r.errors.forEach((e) => console.log(`      → ${e}`));
      }
    }
    console.log(`\n  총 ${results.length}개 대시보드, 실패: ${results.filter((r) => r.status !== "OK").length}개\n`);

    // 모든 대시보드가 OK여야 함
    const failures = results.filter((r) => r.status !== "OK");
    expect(failures, `실패한 대시보드: ${failures.map((f) => f.key).join(", ")}`).toHaveLength(0);
  });
});

// ============================================
// 2. 콘솔 에러/경고 자동 수집
// ============================================

test.describe("QA: 콘솔 에러/경고 수집", () => {
  test("health-function 대시보드의 모든 탭에서 콘솔 에러를 수집한다", async ({ page }) => {
    const allErrors: { tab: string; errors: string[] }[] = [];
    const tabs = ["종합", "채널분석", "기능별 분석", "제형별 분석", "산포도 분석"];

    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    for (const tabName of tabs) {
      const errors: string[] = [];

      page.on("console", (msg: ConsoleMessage) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const tab = page.getByRole("button", { name: tabName, exact: true });
      if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(2000);
      }

      const criticalErrors = errors.filter(
        (e) => !e.includes("net::") && !e.includes("ERR_") && !e.includes("favicon") && !e.includes("Failed to fetch")
      );

      allErrors.push({ tab: tabName, errors: criticalErrors });
      page.removeAllListeners("console");
    }

    // 결과 출력
    console.log("\n=== 탭별 콘솔 에러 수집 결과 ===");
    for (const r of allErrors) {
      console.log(`  ${r.errors.length === 0 ? "✓" : "✘"} ${r.tab}: ${r.errors.length}개 에러`);
      r.errors.forEach((e) => console.log(`      → ${e}`));
    }

    const totalErrors = allErrors.reduce((sum, r) => sum + r.errors.length, 0);
    expect(totalErrors, "치명적 콘솔 에러 발견").toBe(0);
  });
});

// ============================================
// 3. API 모킹 - 엣지 케이스 테스트
// ============================================

test.describe("QA: API 모킹 엣지 케이스", () => {
  test("빈 데이터 응답 시 크래시 없이 처리한다", async ({ page }) => {
    // 대시보드 목록 API를 빈 배열로 모킹
    await page.route("**/api/v1/dashboards", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    });

    await page.goto(`${BASE}/dashboards`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // 페이지가 크래시하지 않고 빈 상태 메시지를 보여주는지 확인
    const body = await page.textContent("body");
    expect(body).toBeTruthy();

    // React 에러 경계가 표시되지 않아야 함
    const hasError = await page.locator("text=Something went wrong").isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test("API 500 에러 시 크래시 없이 에러 상태를 보여준다", async ({ page }) => {
    // 스냅샷 API를 500 에러로 모킹
    await page.route("**/api/v1/dashboards/health-function/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal Server Error" }),
      });
    });

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // 페이지가 완전히 크래시(unhandled exception)하지 않아야 함
    const reactCrash = pageErrors.some(
      (e) => e.includes("Minified React error") || e.includes("Cannot read properties of undefined")
    );
    expect(reactCrash, `React 크래시 발생: ${pageErrors.join(", ")}`).toBe(false);
  });

  test("API 타임아웃 시 크래시 없이 처리한다", async ({ page }) => {
    // 스냅샷 API를 10초 지연 후 응답으로 모킹
    await page.route("**/api/v1/dashboards/health-function/stats**", (route) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
          });
          resolve(undefined);
        }, 10000);
      });
    });

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000);

    // 로딩 상태가 표시되는지 확인 (크래시 아닌 정상 처리)
    const body = await page.textContent("body");
    expect(body).toBeTruthy();

    const reactCrash = pageErrors.some(
      (e) => e.includes("Minified React error") || e.includes("Cannot read properties of undefined")
    );
    expect(reactCrash, "React 크래시 발생").toBe(false);
  });

  test("잘못된 JSON 응답 시 크래시 없이 처리한다", async ({ page }) => {
    await page.route("**/api/v1/dashboards/health-function/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{ invalid json !!!",
      });
    });

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // 완전한 페이지 크래시(white screen)가 아닌지 확인
    const bodyText = await page.textContent("body");
    expect(bodyText?.length).toBeGreaterThan(0);
  });
});
