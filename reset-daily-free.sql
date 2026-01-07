-- 일일 무료 횟수 리셋 (테스트용)
UPDATE users 
SET daily_free_used = 0,
    last_reset_date = CURRENT_DATE
WHERE id = 'ad386565-b51b-4f03-a799-6a4774adb35c';

SELECT id, email, free_credits, paid_credits, daily_free_used, daily_free_limit, last_reset_date
FROM users
WHERE id = 'ad386565-b51b-4f03-a799-6a4774adb35c';
