const { getSummary } = require('./src/modules/dashboard/dashboard.service');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  console.log('Fetching dashboard summary stats...');
  try {
    const result = await getSummary(null);
    console.log('Dashboard Stats:', JSON.stringify({
      total_farmers: result.total_farmers,
      avg_score: result.avg_score,
      districts_count: result.districts_count,
      critical_count: result.critical_count
    }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Stats fetch failed:', err);
    process.exit(1);
  }
}

test();
