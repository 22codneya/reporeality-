import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, () => {
  console.log('='.repeat(60));
  console.log(`🚀 RepoReality Server running at http://localhost:${config.port}`);
  console.log(`   Environment:             ${process.env['NODE_ENV'] || 'development'}`);
  console.log(`   CORS Client Origin:      ${config.clientOrigin}`);
  console.log(`   GitHub API Base:         ${config.githubApiBaseUrl}`);
  console.log(`   GitHub Token Configured: ${config.githubToken ? 'YES (Authenticated)' : 'NO (60 req/hr limit)'}`);
  console.log(`   Gemma AI Configured:     ${config.geminiApiKey ? `YES (${config.gemmaModel})` : 'NO (Deterministic static mode)'}`);
  console.log('='.repeat(60));
});

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('[Server] HTTP server closed gracefully.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received. Closing HTTP server...');
  server.close(() => {
    console.log('[Server] HTTP server closed gracefully.');
    process.exit(0);
  });
});

export default server;
