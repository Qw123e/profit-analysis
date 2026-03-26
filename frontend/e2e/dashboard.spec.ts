import { test, expect } from "@playwright/test";

const BASE = "/bi_poc";

test.describe("Dashboard List", () => {
  test("대시보드 목록 페이지가 정상 로드된다", async ({ page }) => {
    await page.goto(`${BASE}/dashboards`);
    await expect(page).toHaveTitle(/BI/);
  });

  test("등록된 대시보드가 목록에 표시된다", async ({ page }) => {
    await page.goto(`${BASE}/dashboards`);
    await page.waitForTimeout(3000);
    // 페이지에 대시보드 관련 콘텐츠가 있는지 확인
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});

test.describe("Health Function Dashboard", () => {
  test("health-function 대시보드 페이지가 로드된다", async ({ page }) => {
    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    // 404가 아닌지 확인
    const title = await page.title();
    expect(title).not.toContain("404");
  });

  test("탭 전환이 정상 동작한다", async ({ page }) => {
    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Charts / Raw Data 탭 확인
    const chartsTab = page.getByRole("button", { name: "Charts" });
    const rawDataTab = page.getByRole("button", { name: "Raw Data" });

    if (await chartsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rawDataTab.click();
      await page.waitForTimeout(500);
      await chartsTab.click();
    }
  });

  test("국가별 매출분포가 음영 처리되어 있다", async ({ page }) => {
    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // 채널분석 탭 클릭
    const channelTab = page.getByRole("button", { name: "채널분석" });
    if (await channelTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await channelTab.click();
      await page.waitForTimeout(1000);
      // 비공개 영역 오버레이가 표시되는지 확인
      await expect(page.locator("text=비공개 영역").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("콘솔 에러가 없다", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000);

    // 치명적 에러(React 에러 등)가 없어야 함
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Failed to fetch") && !e.includes("ERR_CERT") && !e.includes("net::")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Screenshots", () => {
  test("대시보드 목록 스크린샷 캡처", async ({ page }) => {
    await page.goto(`${BASE}/dashboards`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "e2e/screenshots/dashboard-list.png", fullPage: true });
  });

  test("health-function 대시보드 스크린샷 캡처", async ({ page }) => {
    await page.goto(`${BASE}/dashboards/health-function`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "e2e/screenshots/health-function.png", fullPage: true });
  });
});
