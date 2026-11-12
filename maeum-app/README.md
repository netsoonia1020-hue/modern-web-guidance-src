# 마음결 (PWA)

스트레스 유형 테스트 + 오늘의 위로 카드 + 사주 풀이 + 종합 리포트를 제공하는 설치형 웹앱입니다.
빌드 과정 없이 순수 HTML/CSS/JS(ES 모듈)로 동작합니다.

## 로컬에서 실행
```sh
cd maeum-app
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```
(`file://`로 직접 열면 모듈과 서비스 워커가 동작하지 않습니다.)

## 배포
폴더 전체를 정적 호스팅(GitHub Pages, Netlify, Vercel, Cloudflare Pages)에 올리면 됩니다.
HTTPS에서만 앱 설치(PWA)가 가능합니다.

## 구조
| 파일 | 역할 |
|---|---|
| `index.html` | 앱 셸 |
| `styles.css` | 전체 스타일 (인쇄 시 PDF 저장용 스타일 포함) |
| `js/app.js` | 화면 라우팅과 렌더링, 저장(localStorage) |
| `js/saju.js` | 사주 팔자 계산 (절기 기준 연·월주, 진태양시 보정, 십성) |
| `js/data-stress.js` | 테스트 문항, 5가지 유형, 위로 문구 |
| `js/data-saju.js` | 일간 10종, 오행, 십성, 2026년 흐름 해설 |
| `sw.js` | 오프라인 캐시 (파일을 고치면 `VERSION`을 올리세요) |

## 아직 없는 것 (유료화 전 할 일)
- 결제 연동 (토스페이먼츠 등, 사업자 등록 필요)
- 음력 생일 입력, 대운·세운 상세 풀이
- 결과 이미지 저장 및 카카오톡 공유
