# 체크리스트 데스크톱

할 일을 빠르게 관리하는 데스크톱 앱입니다. Next.js + Electron 기반으로 동작하며, 모든 데이터는 로컬 브라우저 스토리지에 저장됩니다.

## 기능

- **체크리스트** — 여러 항목을 순서대로 관리. 드래그로 순서 변경 가능
- **워크** — 단일 작업 항목. 탭 한 번으로 완료 처리
- **캘린더** — 날짜별 예정 항목 및 완료 기록 조회. 완료 시간 직접 편집 지원
- **다크모드** — 시스템 설정 연동, 수동 전환 가능
- **키보드 단축키** — `Ctrl+N` 체크리스트 생성, `Ctrl+Shift+N` 워크 생성

## 기술 스택

| 영역 | 라이브러리 |
|------|-----------|
| UI 프레임워크 | Next.js 16, React 19 |
| 데스크톱 런타임 | Electron 33 |
| 스타일 | Tailwind CSS v4 |
| 상태 관리 | TanStack React Query v5 |
| 드래그 앤 드롭 | @dnd-kit |
| 스토리지 | localStorage (브라우저 내장) |

## 개발 환경 실행

```bash
npm install

# Next.js 개발 서버 (http://localhost:3141)
npm run dev

# Electron + Next.js 동시 실행
npm run dev          # 터미널 1: Next.js 서버
npm run electron:dev # 터미널 2: Electron 창
```

## 빌드 (Windows 설치파일)

```bash
npm run dist
```

`dist/` 폴더에 `.exe` 설치파일과 포터블 실행파일이 생성됩니다.

## 프로젝트 구조

```
app/                # Next.js 페이지 (App Router)
  page.tsx          # 홈 — 체크리스트 목록
  calendar/         # 캘린더 뷰
  list/[id]/        # 체크리스트 상세
components/         # 재사용 UI 컴포넌트
electron/           # Electron 메인 프로세스
lib/
  hooks/            # React Query 훅
  storage/          # localStorage CRUD
types/              # 전역 TypeScript 타입
scripts/            # 빌드 전처리 스크립트
```

## 데이터 저장 방식

서버 없이 브라우저 `localStorage`에 직접 저장합니다.  
Electron 앱을 재설치해도 데이터는 유지됩니다 (앱 데이터 폴더 기준).
