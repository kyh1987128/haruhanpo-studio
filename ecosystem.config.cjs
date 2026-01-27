module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        // 환경 변수는 .dev.vars 파일에서 자동으로 로드됩니다
        // wrangler pages dev가 .dev.vars를 자동으로 읽습니다
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
