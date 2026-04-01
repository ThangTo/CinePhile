/**
 * Premium subscription pricing configuration.
 * All prices are in coins.
 */
module.exports = {
  PLANS: {
    weekly: {
      coins: 30,
      days: 7,
      label: 'Tuần',
    },
    monthly: {
      coins: 100,
      days: 30,
      label: 'Tháng',
    },
    yearly: {
      coins: 1000,
      days: 365,
      label: 'Năm',
    },
  },

  COIN_PACKAGES: [
    { amount: 10,  bonus: 0,  label: '10 coin' },
    { amount: 50,  bonus: 5,  label: '55 coin' },
    { amount: 100, bonus: 15, label: '115 coin' },
    { amount: 200, bonus: 40, label: '240 coin' },
    { amount: 500, bonus: 150, label: '650 coin' },
  ],
};
