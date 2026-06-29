import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const skuId = searchParams.get('skuId')

    const where: any = {
      actualQuantity: {
        not: null,
      },
    }
    if (skuId) where.skuId = parseInt(skuId)

    const forecasts = await prisma.salesForecast.findMany({
      where,
      include: {
        sku: true,
      },
      orderBy: {
        forecastMonth: 'desc',
      },
    })

    // Calculate accuracy metrics
    const accuracyData = forecasts.map((forecast) => {
      if (!forecast.actualQuantity) return null

      const error = Math.abs(forecast.forecastedQuantity - forecast.actualQuantity)
      const percentageError = forecast.actualQuantity > 0
        ? (error / forecast.actualQuantity) * 100
        : 0
      const accuracy = 100 - percentageError

      return {
        forecast,
        error,
        percentageError: percentageError.toFixed(2),
        accuracy: accuracy.toFixed(2),
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null)

    // Calculate average accuracy
    const avgAccuracy = accuracyData.length > 0
      ? accuracyData.reduce((sum, item) => sum + parseFloat(item.accuracy), 0) / accuracyData.length
      : 0

    // Calculate MAPE (Mean Absolute Percentage Error)
    const mape = accuracyData.length > 0
      ? accuracyData.reduce((sum, item) => sum + parseFloat(item.percentageError), 0) / accuracyData.length
      : 0

    return NextResponse.json({
      accuracyData,
      averageAccuracy: avgAccuracy.toFixed(2),
      totalForecasts: accuracyData.length,
      mape: mape.toFixed(2),
    })
  } catch (error) {
    console.error('Forecast accuracy GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

