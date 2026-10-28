import { expect, test } from '@playwright/test';

async function mockHealth(page) {
  await page.route('**/api/health', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'healthy',
      service: 'Construction Intelligence Platform',
      ai_available: true,
      version: '1.0.0',
    }),
  }));
}

test('chat sends a question and renders the validated response as text', async ({ page }) => {
  await mockHealth(page);
  await page.route('**/api/chat', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      answer: 'Cure concrete as specified by the project engineer.',
      follow_up_suggestions: [],
      confidence: 0.7,
      data_points: [],
    }),
  }));

  await page.goto('/chat');
  await page.locator('#chat-input').fill('How should I cure concrete?');
  await page.locator('#send-chat-btn').click();

  await expect(page.getByText('Cure concrete as specified by the project engineer.')).toBeVisible();
});

test('chat displays an AI-unavailable error without a fabricated answer', async ({ page }) => {
  await mockHealth(page);
  await page.route('**/api/chat', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({
      detail: 'AI features are unavailable until GROQ_API_KEY is configured.',
      code: 'ai_unavailable',
    }),
  }));

  await page.goto('/chat');
  await page.locator('#chat-input').fill('Give me a construction estimate');
  await page.locator('#send-chat-btn').click();

  await expect(page.getByText('AI features are unavailable until GROQ_API_KEY is configured.')).toBeVisible();
});

test('safety inspection uploads an image and displays review warnings', async ({ page }) => {
  await mockHealth(page);
  await page.route('**/api/safety-inspection', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      overall_safety_score: 72,
      compliance_status: 'Review required',
      violations: [],
      ppe_compliance: { helmet: true, safety_vest: true, gloves: false, safety_boots: true },
      immediate_actions_required: [],
      recommendations: ['Review glove use'],
      estimated_penalty_inr: 0,
      next_inspection_date: 'Within 7 days',
      risk_level: 'medium',
      confidence_score: 63,
      uncertainty_notes: ['Some workers are partly obscured'],
      professional_review_required: true,
      professional_review_warning: 'AI-assisted screening is not a compliance certification; a qualified safety professional must verify findings on site.',
    }),
  }));

  await page.goto('/safety-inspection');
  await page.locator('#image-upload-input').setInputFiles({
    name: 'site.png',
    mimeType: 'image/png',
    buffer: Buffer.from('browser workflow image'),
  });
  await page.locator('#inspect-safety-btn').click();

  await expect(page.getByText('Professional Review Required')).toBeVisible();
  await expect(page.getByText('Some workers are partly obscured')).toBeVisible();
});

test('cost estimate displays indicative source and assumptions', async ({ page }) => {
  await mockHealth(page);
  await page.route('**/api/cost-estimation', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      project_name: 'Sample project',
      project_type: 'Residential',
      total_estimated_cost_inr: 3000000,
      cost_breakdown: [{
        label: 'Concrete',
        unit: 'm3',
        quantity: 10,
        unit_rate_inr: 300000,
        amount_inr: 3000000,
      }],
      cost_per_sqft_inr: 2000,
      timeline_months: 8,
      risks: [],
      recommendations: [],
      assumptions: ['Indicative rates; confirm with local suppliers'],
      estimate_source: 'AI-generated indicative estimate; no live rate feed',
      confidence_score: 50,
    }),
  }));

  await page.goto('/cost-estimation');
  await page.locator('#estimate-cost-btn').click();

  await expect(page.getByText('Estimate assumptions')).toBeVisible();
  await expect(page.getByText('AI-generated indicative estimate; no live rate feed')).toBeVisible();
  await expect(page.getByText('Indicative rates; confirm with local suppliers')).toBeVisible();
  await expect(page.getByText('₹30,00,000').first()).toBeVisible();
});

test('empty data is not presented as a successful assessment', async ({ page }) => {
  await mockHealth(page);
  await page.route('**/api/cost-estimation', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      project_name: 'Sample project',
      project_type: 'Residential',
      total_estimated_cost_inr: 0,
      cost_breakdown: [],
      cost_per_sqft_inr: 0,
      timeline_months: 1,
      risks: [],
      recommendations: [],
      assumptions: ['No data available'],
      estimate_source: 'AI-generated indicative estimate; no live rate feed',
      confidence_score: 0,
    }),
  }));

  await page.goto('/cost-estimation');
  await page.locator('#estimate-cost-btn').click();

  await expect(page.getByText('Estimation Inconclusive — Empty Breakdown')).toBeVisible();
  await expect(page.getByText('Empty data is not presented as a successful assessment.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Try Again/i })).toBeVisible();
});

test('displays retry action on failure and retries successfully', async ({ page }) => {
  await mockHealth(page);
  let attempts = 0;
  await page.route('**/api/cost-estimation', route => {
    attempts++;
    if (attempts === 1) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Temporary calculation service failure.' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project_name: 'Sample project',
        project_type: 'Residential',
        total_estimated_cost_inr: 2500000,
        cost_breakdown: [{
          label: 'Brickwork',
          unit: 'sq.m',
          quantity: 200,
          unit_rate_inr: 12500,
          amount_inr: 2500000,
        }],
        cost_per_sqft_inr: 1800,
        timeline_months: 6,
        risks: [],
        recommendations: [],
        assumptions: ['Standard rates'],
        estimate_source: 'AI-generated indicative estimate; no live rate feed',
        confidence_score: 75,
      }),
    });
  });

  await page.goto('/cost-estimation');
  await page.locator('#estimate-cost-btn').click();

  await expect(page.getByRole('alert').getByText('Temporary calculation service failure.')).toBeVisible();
  const retryBtn = page.getByRole('button', { name: /Retry Action/i });
  await expect(retryBtn).toBeVisible();

  await retryBtn.click();
  await expect(page.getByText('Brickwork')).toBeVisible();
  await expect(page.getByText('₹25,00,000').first()).toBeVisible();
});

test('mobile navigation drawer can be opened and closed', async ({ page }) => {
  await mockHealth(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  const menuBtn = page.getByRole('button', { name: 'Open navigation menu' });
  await expect(menuBtn).toBeVisible();

  await menuBtn.click();
  const closeBtn = page.getByRole('button', { name: 'Close navigation menu' });
  await expect(closeBtn).toBeVisible();

  await closeBtn.click();
  await expect(closeBtn).not.toBeVisible();
});