import { prisma } from './prisma'

/**
 * Calculate moving average from historical data
 * @param values - Array of historical values
 * @param periods - Number of periods to average
 * @returns Moving average
 */
export function calculateMovingAverage(values: number[], periods: number = 6): number {
  if (values.length === 0) return 0
  if (values.length < periods) {
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }
  const recentValues = values.slice(-periods)
  return recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length
}

/**
 * Detect trend in historical data
 * @param values - Array of historical values
 * @returns Trend direction: 'up', 'down', or 'stable'
 */
export function detectTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable'

  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))

  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100

  if (changePercent > 5) return 'up'
  if (changePercent < -5) return 'down'
  return 'stable'
}

/**
 * Generate forecast based on historical data
 * @param historicalData - Array of { month: Date, quantity: number }
 * @param months - Number of months to forecast
 * @returns Array of forecasts
 */
export function generateForecast(
  historicalData: Array<{ month: Date; quantity: number }>,
  months: number = 3
): Array<{ month: Date; forecastedQuantity: number }> {
  if (historicalData.length === 0) {
    return []
  }

  const quantities = historicalData.map((d) => d.quantity)
  const movingAvg = calculateMovingAverage(quantities, 6)
  const trend = detectTrend(quantities)

  // Apply trend adjustment
  let trendMultiplier = 1
  if (trend === 'up') trendMultiplier = 1.05
  if (trend === 'down') trendMultiplier = 0.95

  const forecasts = []
  const lastMonth = historicalData[historicalData.length - 1].month

  for (let i = 1; i <= months; i++) {
    const forecastMonth = new Date(lastMonth)
    forecastMonth.setMonth(forecastMonth.getMonth() + i)
    forecastMonth.setDate(1)

    // Apply trend with slight decay over time
    const adjustedForecast = movingAvg * trendMultiplier * Math.pow(0.98, i - 1)

    forecasts.push({
      month: forecastMonth,
      forecastedQuantity: Math.round(Math.max(0, adjustedForecast)),
    })
  }

  return forecasts
}

/**
 * Calculate forecast accuracy
 * @param forecasted - Forecasted quantity
 * @param actual - Actual quantity
 * @returns Accuracy percentage
 */
export function calculateForecastAccuracy(forecasted: number, actual: number): number {
  if (actual === 0) return forecasted === 0 ? 100 : 0

  const error = Math.abs(forecasted - actual)
  const percentageError = (error / actual) * 100
  return Math.max(0, 100 - percentageError)
}

