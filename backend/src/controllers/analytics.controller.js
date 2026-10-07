import * as analyticsService from '../services/analytics.service.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function getOverview(req, res) {
  const overview = await analyticsService.getAnalyticsOverview()
  return sendSuccess(res, {
    message: 'Analytics overview fetched successfully',
    data: overview,
  })
}
