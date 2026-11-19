# GREEN APPLE — interactive album promo prototype

실제 작동하는 V1 시안: **3D 회전 청사과 + 트랙별 스티커 5개 + 떼기/다시 붙이기 + 20초 오디오 미리듣기 UI + 수집 컬렉션**.

## 미리보기 실행

`index.html`을 파일 탐색기에서 직접 더블클릭하지 말고, 이 프로젝트 폴더를 로컬 웹 서버로 열어 주세요.

```bash
cd green-apple-prototype
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 열면 됩니다. VS Code **Live Server**로 열어도 됩니다. Three.js 라이브러리와 폰트는 CDN이므로 첫 로드에 인터넷이 필요합니다.

## 파일 목록

- `assets/green-apple.glb` — 이 프로젝트를 위해 새로 만든 회전 가능한 3D 청사과 (약 1.1MB)
- `assets/apple-skin.jpg` — 사과 껍질 질감 원본 (GLB 내부에도 포함되어 있음)
- `assets/stickers/sticker-01.png` ~ `sticker-05.png` — 제공한 스티커 시트에서 추출한 투명 PNG
- `assets/album-cover.jpg` — 제공한 앨범 커버 이미지
- `index.html`, `style.css`, `main.js` — 프로모션 페이지
- `build_assets.py` — 원본 이미지에서 모델·스티커 생성하는 스크립트 (제작 참고용, 배포는 선택)

## 음원 교체

`assets/audio/` 안에 아래 파일을 놓으면 스티커를 뗄 때 자동 재생됩니다.

- `track-01.mp3`
- `track-02.mp3`
- `track-03.mp3`
- `track-04.mp3`
- `track-05.mp3`

`main.js` 최상단의 `tracks`에서 곡명, 파일 경로와 실제 벌스 시작 지점(`startAt`), 미리듣기 길이(`previewSeconds`)를 수정할 수 있습니다. 기본 미리듣기는 0초부터 20초입니다. 예: 34초부터 15초 동안 들려주려면 해당 트랙 항목을 `startAt: 34, previewSeconds: 15`로 수정하면 됩니다.

**주의:** 상업 음원의 미리듣기는 해당 권리자로부터 이용 허락이 필요할 수 있습니다. 이번 아카이브에는 음원 원본이 제공되지 않아 어떤 음악도 포함하지 않았습니다.

## UX

- 커서/터치 드래그: 청사과 360° 회전
- 스티커 클릭/탭: 가상으로 껍질에서 떼고 트랙 프리뷰 열기
- 오른쪽 트랙 이름 선택: 아직 붙어 있다면 해당 스티커 쪽으로 사과 회전 / 이미 뗐다면 플레이어 오픈
- 오른쪽 하단 컬렉션: 떼어낸 스티커가 모여 기록됨. 컬렉션 스티커를 클릭하면 다시 플레이어 오픈
- `RESTICK`: 모든 스티커 다시 붙이기

## 이후 디자인 수정

- 사과의 사실감 강화를 원하면 완성된 CC0/직접제작 GLB를 `assets/green-apple.glb`로 교체할 수 있으나, 표면 스티커는 현재 `applePoint()`에 맞춰 만든 패치이므로 새 GLB의 형상에 맞게 위치를 다시 계산해야 합니다.
- 스트리밍 연결 버튼, 아티스트명, 릴리즈일, 실제 트랙명, 맛보기 구간, 가사/크레딧은 아직 제공되지 않아 임의로 넣지 않았습니다.
- 오디오는 10–30초 중 요청한 범위의 중간값인 20초로 기본 설정했습니다.
