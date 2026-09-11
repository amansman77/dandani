# Problem 1-Pager: 정적 품질 게이트 구축

## Context

프런트엔드에는 Create React App이 제공하는 ESLint가 있지만 Worker, 타입, 문서 링크,
테스트, CI에는 강제 검사가 없다.

## Problem

로컬 빌드 성공만으로는 Worker의 오류나 깨진 문서 링크를 발견할 수 없고, 검사 실행 여부가
작업자 기억에 의존한다. 테스트 스크립트는 있지만 테스트 파일이 0개다.

## Goal

- 활성 프런트엔드와 Worker에 ESLint를 적용한다.
- 활성 Worker JavaScript에 `checkJs` 타입 검사를 적용한다.
- 핵심 URL/날짜 유틸리티에 성공·실패 경로 테스트를 추가한다.
- Markdown 로컬 링크와 Worker 번들을 포함한 단일 `npm run check`를 만든다.
- 동일한 검사를 GitHub Actions에서 강제한다.

## Non-Goals

- 프런트엔드 전체 TypeScript 전환
- 레거시 Worker 코드를 활성 품질 게이트에 포함
- 기존 의존성 취약점 일괄 수정
- 코드 포맷 전체 변경

## Constraints

- 현재 폴더 구조 정리 변경을 보존한다.
- 프런트엔드 `checkJs` 시범 실행에서 발견된 약 50개 오류를 억제하지 않는다.
- CI와 로컬에서 같은 루트 명령을 사용한다.

## Options

1. 프런트엔드까지 즉시 `checkJs`를 강제한다: 범위가 크고 타입 억제로 통과시킬 위험이 있다.
2. 오류가 작은 Worker부터 타입 검사를 강제하고 프런트엔드는 후속 전환한다: 즉시 유효한
   게이트를 만들면서 기존 오류를 숨기지 않는다.

**Decision:** 2번을 선택한다.

## Impact Note

제품 런타임 계약은 바뀌지 않는다. 개발 및 CI에서 lint, Worker 타입, 테스트, Markdown 링크,
프런트 빌드, Worker 번들 생성 중 하나라도 실패하면 통합 검사가 실패한다.
