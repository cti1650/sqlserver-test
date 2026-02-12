const { execSql } = require('./exec-sql');

const MAX_ATTEMPTS = 30;
const INTERVAL_MS = 2000;

async function wait() {
  console.log('Waiting for SQL Server to be ready...');

  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    const result = execSql('SELECT 1', { silent: true });
    if (result.success) {
      console.log('SQL Server is ready!');
      process.exit(0);
    }
    console.log(`Attempt ${i}/${MAX_ATTEMPTS}: SQL Server not ready yet...`);
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  console.error('SQL Server failed to start.');
  process.exit(1);
}

wait();
