const test = require('node:test');
const assert = require('node:assert/strict');

const premiumService = require('./premium.service');

const NOW = new Date('2026-06-10T00:00:00.000Z');

test('isPremiumActive requires premium role with a future expiry date', () => {
  assert.equal(
    premiumService.isPremiumActive(
      {
        role: 'premium',
        premiumExpiresAt: new Date('2026-06-11T00:00:00.000Z'),
      },
      NOW,
    ),
    true,
  );

  assert.equal(
    premiumService.isPremiumActive({ role: 'premium', premiumExpiresAt: null }, NOW),
    false,
  );
  assert.equal(
    premiumService.isPremiumActive(
      {
        role: 'premium',
        premiumExpiresAt: new Date('2026-06-09T23:59:59.000Z'),
      },
      NOW,
    ),
    false,
  );
  assert.equal(
    premiumService.isPremiumActive(
      {
        role: 'admin',
        premiumExpiresAt: new Date('2026-06-11T00:00:00.000Z'),
      },
      NOW,
    ),
    false,
  );
});

test('normalizePremiumSnapshot downgrades expired premium users for API output', () => {
  const snapshot = premiumService.normalizePremiumSnapshot(
    {
      role: 'premium',
      premiumPlan: 'monthly',
      premiumExpiresAt: new Date('2026-06-09T00:00:00.000Z'),
    },
    NOW,
  );

  assert.equal(snapshot.role, 'user');
  assert.equal(snapshot.premiumPlan, null);
  assert.equal(snapshot.premiumExpiresAt, null);
  assert.equal(snapshot.isPremium, false);
});

test('buildAdminPremiumUpdate defaults premium expiry and rejects past dates', () => {
  const update = premiumService.buildAdminPremiumUpdate(
    {
      role: 'premium',
    },
    NOW,
  );

  assert.equal(update.role, 'premium');
  assert.equal(update.premiumPlan, 'monthly');
  assert.equal(update.premiumExpiresAt.toISOString(), '2026-07-10T00:00:00.000Z');

  assert.throws(
    () =>
      premiumService.buildAdminPremiumUpdate(
        {
          role: 'premium',
          premiumExpiresAt: '2026-06-09T00:00:00.000Z',
        },
        NOW,
      ),
    /future/,
  );
});

test('buildAdminPremiumUpdate clears premium fields for non-premium roles', () => {
  const update = premiumService.buildAdminPremiumUpdate(
    {
      role: 'user',
      premiumPlan: 'monthly',
      premiumExpiresAt: new Date('2026-06-11T00:00:00.000Z'),
    },
    NOW,
  );

  assert.equal(update.role, 'user');
  assert.equal(update.premiumPlan, null);
  assert.equal(update.premiumExpiresAt, null);
});

test('buildAdminPremiumUpdate can preserve missing premium fields during admin updates', () => {
  const update = premiumService.buildAdminPremiumUpdate(
    {
      role: 'premium',
      username: 'existing-premium',
    },
    NOW,
    { defaultMissingPremiumFields: false },
  );

  assert.equal(update.role, 'premium');
  assert.equal(update.username, 'existing-premium');
  assert.equal(Object.prototype.hasOwnProperty.call(update, 'premiumPlan'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(update, 'premiumExpiresAt'), false);
});
