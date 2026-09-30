# backend-system-lab

## 대규모 트래픽 환경의 선착순 쿠폰 발급 시스템

이벤트 시작과 동시에 요청이 몰리는 상황에서 **정해진 수량의 쿠폰을 중복이나 초과 발급 없이 처리하는 시스템**을 만드는 백엔드 포트폴리오입니다.
NestJS와 PostgreSQL로 기본 발급 기능을 구현한 뒤, 동시 요청과 부하 테스트로 문제를 재현하고 설계를 개선하는 과정을 기록합니다.

성능 개선 전후의 처리량과 응답 시간뿐 아니라, 실제 발급 수량과 중복 발급 여부를 함께 확인하는 것을 목표로 합니다.
문제가 발생한 조건, 원인, 해결 방법을 선택한 이유, 검증 결과를 코드와 문서로 남기고자 합니다.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-FF4438?logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Amazon_SQS-FF4F8B?logo=amazonsqs&logoColor=white" alt="Amazon SQS">
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/AWS-232F3E?logo=amazonwebservices&logoColor=white" alt="AWS">
  <img src="https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=white" alt="Jest">
  <img src="https://img.shields.io/badge/k6-7D64FF?logo=k6&logoColor=white" alt="k6">
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?logo=githubactions&logoColor=white" alt="GitHub Actions">
</p>

> 배지에는 현재 사용 중인 기술과 향후 검토할 기술이 함께 포함되어 있습니다. 현재 구현 상태는 아래에 별도로 정리했습니다.

## 다루려는 문제

한정 수량의 쿠폰을 여러 사용자가 동시에 요청하는 이벤트를 가정합니다.
같은 사용자의 반복 요청이나 처리 도중의 실패도 검증 시나리오에 포함할 예정입니다.

| 상황 | 설계 및 검증 목표 |
| --- | --- |
| 남은 쿠폰보다 많은 요청이 동시에 도착 | 발급 수량이 준비된 수량을 넘지 않도록 보장 |
| 동일 사용자가 반복 요청 | 사용자별 중복 발급 방지 |
| 이벤트 시작 시 요청 집중 | 처리량, 응답 시간, 오류율을 측정하고 병목 파악 |
| 요청 처리 도중 실패 또는 재시도 | 발급 기록과 잔여 수량의 일관성 확인 |
| 여러 요청이 거의 동시에 도착 | 선착순을 판단하는 기준과 발급 확정 시점 정의 |

## 개발 및 검증 계획

1. **기본 기능 구현** — 쿠폰 생성·발급과 수량 제한, 사용자별 중복 발급 방지 규칙을 구현합니다.
2. **동시성 문제 재현** — 동시 요청 테스트로 초과 발급과 중복 발급 여부를 확인합니다.
3. **정합성 개선** — 재현된 문제를 바탕으로 제어 방식을 비교하고 선택 이유와 한계를 기록합니다.
4. **부하 테스트와 성능 개선** — 동일한 요청 조건에서 개선 전후 결과를 비교합니다. 캐싱과 비동기 처리는 측정된 병목에 따라 도입을 검토합니다.
5. **실패 상황 검증** — 재시도와 장애 상황에서도 발급 결과가 일관되게 유지되는지 확인합니다.

검증 결과에는 요청 수와 동시 요청 수, 실행 환경, 처리량, p95 응답 시간, 오류율,
실제 발급 수량과 중복 건수를 함께 기록할 예정입니다. 현재 부하 테스트 결과나 성능 수치는 없습니다.

## 현재 진행 상태

**초기 실행 환경 구성을 완료한 단계입니다.**

- NestJS / TypeScript 프로젝트 구성
- Docker Compose를 통한 로컬 PostgreSQL 실행 및 데이터 보존
- `@nestjs/config`와 TypeORM을 사용한 환경변수 기반 DB 연결
- Swagger 설정 및 Makefile을 통한 DB 실행·중지 관리
- 애플리케이션의 PostgreSQL 연결 확인

현재 사용 기술은 **NestJS, TypeScript, PostgreSQL, TypeORM, Docker / Docker Compose, @nestjs/config, Swagger**입니다.
쿠폰 엔티티와 API, 발급 로직은 아직 구현하지 않았습니다.
Redis, Queue, 분산락, 트랜잭션·락 처리도 향후 검토 범위이며 현재 코드에는 포함되어 있지 않습니다.

## 로컬 실행

Node.js 22.12 이상(22 LTS) 또는 24 LTS, npm, Docker Compose v2가 필요합니다.
Docker Desktop을 먼저 실행하세요. NestJS는 호스트에서, PostgreSQL은 컨테이너에서 실행합니다.

```bash
npm ci
cp .env.example .env  # 최초 설정 시에만 실행; 기존 .env가 있으면 유지
make start-db
npm run start:dev
```

- 애플리케이션: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs` (기존 설정 유지)
- API prefix: `/api` (현재 등록된 비즈니스 API가 없어 `/`와 `/api`의 404는 정상)
- 빌드: `npm run build`

## Makefile로 DB 관리

프로젝트 루트에서 실행합니다. `make` 또는 `make help`로 명령 목록을 볼 수 있습니다.
명령은 `make start-db`처럼 하이픈으로 연결해서 입력합니다.

| 명령 | 동작 |
| --- | --- |
| `make start-db` | PostgreSQL 실행, healthy 상태까지 대기 |
| `make stop-db` / `make kill-db` | DB 중지, 데이터 유지 |
| `make restart-db` | `.env`를 다시 읽어 컨테이너 재생성, 데이터 유지 |
| `make status-db` | 컨테이너 상태 확인 |
| `make logs-db` | 최근 로그 및 실시간 로그 확인, Ctrl+C로 종료 |
| `make reset-db CONFIRM=reset` | **기존 DB 데이터 삭제** 후 `.env` 값으로 새 DB 생성 |

`.env`의 **DB_PORT**를 바꿨다면 `make restart-db`를 실행하세요.
**DB_DATABASE / DB_USERNAME / DB_PASSWORD**는 PostgreSQL 볼륨을 처음 만들 때만 적용됩니다.
기존 개발 데이터를 삭제해도 된다면 `.env` 수정 후 `make reset-db CONFIRM=reset`을 실행하세요.
데이터를 보존해야 한다면 reset 대신 기존 DB에서 SQL로 DB 이름·사용자·비밀번호를 변경해야 합니다.
DB 연결 값을 변경한 뒤에는 NestJS도 종료하고 `npm run start:dev`로 다시 실행하세요.
Makefile은 PostgreSQL 컨테이너만 관리하며 NestJS 프로세스는 별도로 실행합니다.

## 환경변수와 DB 설정

`.env.example`을 기준으로 `.env`를 작성합니다. `.env`는 Git에서 제외됩니다.
NestJS의 `ConfigModule`과 Docker Compose가 같은 파일을 읽습니다.
셸에 같은 이름의 환경변수가 있으면 해당 값이 우선하므로 충돌 여부를 확인하세요.

| 변수 | 예제 값 | 설명 |
| --- | --- | --- |
| `NODE_ENV` | `development` | 실행 환경 |
| `DB_HOST` | `localhost` | 호스트에서 접속할 DB 주소 |
| `DB_PORT` | `5432` | 호스트에 공개할 DB 포트 |
| `DB_DATABASE` | `coupon` | 데이터베이스 이름 |
| `DB_USERNAME` | `postgres` | DB 사용자 |
| `DB_PASSWORD` | `postgres` | 로컬 개발용 비밀번호 |
| `DB_SYNCHRONIZE` | `false` | 초기 개발용 자동 스키마 동기화 허용 여부 |

`TypeOrmModule.forRootAsync()`가 `ConfigService`에서 연결 정보를 읽습니다.
`synchronize`는 기본적으로 꺼져 있으며, `NODE_ENV=development`와
`DB_SYNCHRONIZE=true`를 **동시에** 지정한 경우에만 켜집니다.
운영 및 그 외 환경에서는 `DB_SYNCHRONIZE=true`여도 항상 꺼집니다.
실제 데이터를 유지하는 단계에서는 자동 동기화를 끄고 마이그레이션을 도입해야 합니다.
현재 엔티티와 마이그레이션은 없습니다.

## PostgreSQL 연결 확인

```bash
docker compose ps
docker compose exec postgres pg_isready -U postgres -d coupon
docker compose exec postgres psql -U postgres -d coupon -c 'SELECT current_database(), current_user;'
```

위 명령은 기본 DB 이름/사용자 기준이며 변경했다면 명령에도 반영하세요.
컨테이너가 `healthy`, DB가 `coupon`, 사용자가 `postgres`인지 확인합니다.
앱 실행 시 `TypeOrmCoreModule dependencies initialized`와
`Nest application successfully started`가 출력되면 앱의 DB 초기화도 완료된 것입니다.
Swagger 응답도 확인할 수 있습니다.

```bash
curl -I http://localhost:3000/docs
```

PostgreSQL 데이터는 `postgres_data` 볼륨에 유지됩니다.
중지는 `docker compose stop postgres`, 컨테이너 제거는 `docker compose down`을 사용합니다.
`docker compose down -v`는 DB 데이터까지 삭제하므로 주의하세요.
기존 볼륨이 있으면 `.env`의 DB 이름/사용자/비밀번호를 바꿔도 기존 DB에 자동 반영되지 않습니다.
5432 포트가 사용 중이면 `.env`의 `DB_PORT`를 변경하고 컨테이너를 다시 실행하세요.

## 디렉터리 구조와 범위

```text
src/
  main.ts                    # 앱 시작 및 기존 Swagger 설정
  app.module.ts              # ConfigModule, TypeOrmModule 등록
  config/
    database.config.ts       # DB 연결 설정
```

추후 `src/coupon/`에 모듈을 추가하고 `AppModule`에 등록하면 됩니다.
엔티티는 해당 모듈에서 `TypeOrmModule.forFeature()`로 등록할 수 있도록
`autoLoadEntities`를 활성화했습니다. 현재 coupon 디렉터리나 모듈은 만들지 않았습니다.

이번 단계에는 Coupon/CouponIssue Entity, 쿠폰 API 및 발급 로직, Redis,
BullMQ/Queue, 분산락, 트랜잭션/락 처리, Repository 추상화, DDD, CQRS를 구현하지 않았습니다.

설정 참고: [NestJS Configuration](https://docs.nestjs.com/techniques/configuration).
