const {
  checkContractExpirations,
  checkAssetWarrantyExpirations,
  checkMaintenanceDue
} = require('../utils/notifications');
const logger = require('../utils/logger');

/**
 * Run scheduled notification checks
 * This should be called by a cron job or scheduler
 */
async function runScheduledChecks() {
  logger.info('Running scheduled notification checks...');
  
  try {
    await checkContractExpirations();
    await checkAssetWarrantyExpirations();
    await checkMaintenanceDue();
    
    logger.info('Scheduled notification checks completed');
  } catch (error) {
    logger.error('Error in scheduled notification checks:', error);
  }
}

// If running as standalone script
if (require.main === module) {
  runScheduledChecks()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Fatal error in scheduler:', error);
      process.exit(1);
    });
}

module.exports = { runScheduledChecks };

