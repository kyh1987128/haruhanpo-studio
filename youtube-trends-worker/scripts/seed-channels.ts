/**
 * 시드 채널 데이터 초기 로딩 스크립트
 * 
 * 사용법:
 *   1. .dev.vars 파일에 SUPABASE_URL, SUPABASE_SERVICE_KEY 설정
 *   2. npx tsx scripts/seed-channels.ts
 * 
 * 이 스크립트는 글로벌 상위 유튜브 채널을 tracked_channels 테이블에 삽입합니다.
 * source='seed'로 표시되며, 이후 크론이 자동으로 상세 정보를 업데이트합니다.
 * 
 * 데이터 소스:
 *   - 하드코딩된 글로벌 TOP 채널 (구독자 기준)
 *   - 한국 주요 채널
 *   - 주요 국가별 대형 채널
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// .dev.vars 파일에서 환경변수 로드
function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../.dev.vars')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .dev.vars 파일이 없습니다. 다음 형식으로 생성하세요:')
    console.error('SUPABASE_URL=https://xxx.supabase.co')
    console.error('SUPABASE_SERVICE_KEY=eyJhbGci...')
    process.exit(1)
  }
  
  const content = fs.readFileSync(envPath, 'utf-8')
  const vars: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      vars[match[1].trim()] = match[2].trim()
    }
  }
  return vars
}

// 글로벌 TOP 채널 시드 데이터
const SEED_CHANNELS = [
  // === 글로벌 TOP (구독자 기준) ===
  { channel_id: 'UCq-Fj5jknLsUf-MWSy4_brA', channel_name: 'T-Series', channel_country: 'IN' },
  { channel_id: 'UCpEhnqL0y41EpW2TvWAHD7Q', channel_name: 'MrBeast', channel_country: 'US' },
  { channel_id: 'UCbCmjCuTUZos6Inko4u57UQ', channel_name: 'Cocomelon', channel_country: 'US' },
  { channel_id: 'UCVHFbqXqoYvEWM1Ddxl0QDg', channel_name: 'SET India', channel_country: 'IN' },
  { channel_id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw', channel_name: 'PewDiePie', channel_country: 'SE' },
  { channel_id: 'UCJ5v_MCY6GNUBTO8-D3XoAg', channel_name: 'WWE', channel_country: 'US' },
  { channel_id: 'UCFFbwnve3yF62-tVXkTyHqg', channel_name: 'Like Nastya', channel_country: 'US' },
  { channel_id: 'UChGJGhZ9SOOHvBB0Y4DOO_w', channel_name: 'MrBeast Gaming', channel_country: 'US' },
  { channel_id: 'UCbWOGbJDAwpUnRrjMIGB3gA', channel_name: 'Stokes Twins', channel_country: 'US' },
  { channel_id: 'UCvlE5gTbOvjiolFlEm-c_Ow', channel_name: 'Vlad and Niki', channel_country: 'US' },
  
  // === 한국 주요 채널 ===
  { channel_id: 'UCIG5P4ixCj-mRKiWaD6YZYg', channel_name: 'BANGTANTV (BTS)', channel_country: 'KR' },
  { channel_id: 'UCEf_Bc-KVd7onSeifS3py9g', channel_name: 'BLACKPINK', channel_country: 'KR' },
  { channel_id: 'UCA36UErBMnNmwqSaAF8fKrg', channel_name: 'HYBE LABELS', channel_country: 'KR' },
  { channel_id: 'UCJ1wQLsOBhpSfCDSl1Ps1cg', channel_name: 'JYP Entertainment', channel_country: 'KR' },
  { channel_id: 'UCQmS_nGt-5IEBfCJo33eaRg', channel_name: 'SMTOWN', channel_country: 'KR' },
  { channel_id: 'UCkinCGMisrQS5IHqLYBtL3g', channel_name: '침착맨', channel_country: 'KR' },
  { channel_id: 'UCR2yMyGNP6MqjAdaOLZt90w', channel_name: '이지금 IU', channel_country: 'KR' },
  { channel_id: 'UC3IZKseVpdzPSBo2Mk4c5cw', channel_name: '이승기 SEUNGGI', channel_country: 'KR' },
  { channel_id: 'UCsJ6RuBiTVWIe56_dESDPhg', channel_name: '백종원 PAIK JONG WON', channel_country: 'KR' },
  { channel_id: 'UCRONxR8f3XRcXm1gZn-qQMw', channel_name: '도티 Dott', channel_country: 'KR' },
  { channel_id: 'UCuGo0UbuEXiBb2FYAZWYNeg', channel_name: '쯔양 Tzuyang', channel_country: 'KR' },
  { channel_id: 'UCQ2O-iftmnlfrBuNsUUTofQ', channel_name: '빠니보틀 Pani Bottle', channel_country: 'KR' },
  { channel_id: 'UCBkyj16n2snkRg1BAzpovXQ', channel_name: '급식왕', channel_country: 'KR' },
  { channel_id: 'UChlgI3UHCOnwUGzWzbJ3H5A', channel_name: '워크맨 Workman', channel_country: 'KR' },
  { channel_id: 'UCBkyj16n2snkRg1BAzpovXQ', channel_name: '곽튜브 KWAKTUBE', channel_country: 'KR' },
  
  // === 일본 주요 채널 ===
  { channel_id: 'UCX6OQ3DkcsbYNE6H8uQQuVA', channel_name: 'MrBeast JP', channel_country: 'JP' },
  { channel_id: 'UCgMPP6RRjktV7krOfyUewqw', channel_name: 'はじめしゃちょー', channel_country: 'JP' },
  { channel_id: 'UCtUbO6rBht0daVIOGML3c8w', channel_name: 'HikakinTV', channel_country: 'JP' },
  { channel_id: 'UCJFZiqLMntJufDCHc6bQixg', channel_name: 'Fischer\'s', channel_country: 'JP' },
  
  // === 미국/영어권 주요 채널 ===
  { channel_id: 'UCY1kMZp36IQSyNx_9h4mpCg', channel_name: 'Mark Rober', channel_country: 'US' },
  { channel_id: 'UCHnyfMqiRRG1u-2MsSQLbXA', channel_name: 'Veritasium', channel_country: 'US' },
  { channel_id: 'UCsXVk37bltHxD1rDPwtNM8Q', channel_name: 'Kurzgesagt', channel_country: 'DE' },
  { channel_id: 'UCXuqSBlHAE6Xw-yeJA0Tunw', channel_name: 'Linus Tech Tips', channel_country: 'CA' },
  { channel_id: 'UC2C_jShtL725hvbm1arSV9w', channel_name: 'CGP Grey', channel_country: 'GB' },
  { channel_id: 'UCBcRF18a7Qf58cCRy5xuWwQ', channel_name: 'MKBHD', channel_country: 'US' },
  { channel_id: 'UC6nSFpj9HTCZ5t-N3Rm3-HA', channel_name: 'Vsauce', channel_country: 'US' },
  
  // === 인도/동남아 주요 채널 ===
  { channel_id: 'UCvC4D8onUfXzvjTOM-dBfEA', channel_name: 'CarryMinati', channel_country: 'IN' },
  { channel_id: 'UCk1SpWNzOs4MYmr0uICEntg', channel_name: 'Technical Guruji', channel_country: 'IN' },
  { channel_id: 'UCDDb5_cQZfElqOUMwX0e6CQ', channel_name: 'Atta Halilintar', channel_country: 'ID' },
  
  // === 브라질/스페인어권 ===
  { channel_id: 'UC4USoIAL9qcMtCaGgX6WKBA', channel_name: 'Felipe Neto', channel_country: 'BR' },
  { channel_id: 'UC_zxivooFdA0MHjePC0qVpw', channel_name: 'LOUD', channel_country: 'BR' },
  { channel_id: 'UCWX0FCbqTbHD2DP6-d0V-eQ', channel_name: 'Luisito Comunica', channel_country: 'MX' },
]

async function main() {
  const env = loadEnvFile()
  
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 .dev.vars에 없습니다.')
    process.exit(1)
  }
  
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
  
  console.log(`🌱 시드 채널 ${SEED_CHANNELS.length}개 삽입 시작...`)
  
  const { error, count } = await supabase
    .from('tracked_channels')
    .upsert(
      SEED_CHANNELS.map(ch => ({
        channel_id: ch.channel_id,
        channel_name: ch.channel_name,
        channel_country: ch.channel_country,
        source: 'seed',
        last_updated: new Date().toISOString()
      })),
      { onConflict: 'channel_id', ignoreDuplicates: true }
    )
  
  if (error) {
    console.error('❌ 시드 삽입 실패:', error)
  } else {
    console.log(`✅ 시드 채널 삽입 완료 (${SEED_CHANNELS.length}개)`)
  }
  
  // 확인
  const { data, error: checkError } = await supabase
    .from('tracked_channels')
    .select('channel_id, channel_name, source')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (data) {
    console.log('\n📋 최근 등록 채널:')
    data.forEach(ch => console.log(`  - ${ch.channel_name} (${ch.source})`))
  }
  
  const { count: totalCount } = await supabase
    .from('tracked_channels')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📊 tracked_channels 총 레코드: ${totalCount}개`)
}

main().catch(console.error)
