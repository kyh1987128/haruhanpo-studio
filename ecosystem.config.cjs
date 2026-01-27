module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        // Supabase 환경 변수
        SUPABASE_URL: 'https://qbzzltyaqitjdhfldmhd.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFienpsdHlhcWl0amRoZmxkbWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyNjAzNDcsImV4cCI6MjA1MjgzNjM0N30.Lc-Y0WkYgDK3sRJ-sERsFtPuBXAWcqgMzCCxaQXjQWo',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFienpsdHlhcWl0amRoZmxkbWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzI2MDM0NywiZXhwIjoyMDUyODM2MzQ3fQ.p8YcLLdwTUy-p6G-44bK2b9PNFz7Sx8Q9bTfPYNLv-w',
        // OpenAI API Key (Phase 2에서 사용 예정)
        OPENAI_API_KEY: 'sk-proj-placeholder-replace-with-real-key',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
