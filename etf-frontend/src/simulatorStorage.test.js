import { calculateMetrics } from "./simulatorStorage";

jest.mock("./apiClient", () => ({
  apiGet: jest.fn()
}));

describe("calculateMetrics return calculations", () => {
  test("computes annualized and money-weighted returns for a simple one-year holding", () => {
    const purchaseDate = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000));
    const state = {
      cash: 0,
      holdings: {
        VWCE: {
          shares: 1,
          costTotal: 100,
          addedAt: purchaseDate.toISOString()
        }
      },
      transactions: [
        {
          id: 1,
          type: "BUY",
          symbol: "VWCE",
          quantity: 1,
          price: 100,
          total: 100,
          fee: 0,
          timestamp: purchaseDate.toISOString()
        }
      ],
      transactionFeeRate: 0,
      depotFeeRate: 0
    };

    const metrics = calculateMetrics(state, { VWCE: 110 });
    const position = metrics.positions[0];

    expect(metrics.returns.initialCapital).toBeCloseTo(100, 6);
    expect(metrics.returns.totalReturnPct).toBeCloseTo(10, 1);
    expect(metrics.returns.annualizedReturnPct).toBeCloseTo(10, 1);
    expect(metrics.returns.moneyWeightedReturnPct).toBeCloseTo(10, 1);

    expect(position.annualizedReturnPct).toBeCloseTo(10, 1);
    expect(position.moneyWeightedReturnPct).toBeCloseTo(10, 1);
  });
});