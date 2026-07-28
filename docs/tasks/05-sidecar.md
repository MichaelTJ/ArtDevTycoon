# Spec 05 — Python AI Sidecar

**Worktree:** `../adt-wt-sidecar` (branch `agent/sidecar`)
**Depends on:** nothing. Start immediately, in parallel with specs 01 and 03.

## Ownership zone

```
sidecar/**
```

You own one top-level directory and nothing else. Do not touch any TypeScript, any
config, or `package.json`. Do not run state-changing git commands.

## Mission

Build a local FastAPI service that generates artwork with **SDXL-Turbo** and critiques
it with **Janus-Pro-1B**, running on this machine's Intel Arc iGPU through OpenVINO.

The single most important design constraint: **the service must start, serve, and pass
its whole test suite with no model weights on disk.** Model files are several
gigabytes and are downloaded by an opt-in setup script. Everything model-related sits
behind a small backend interface with a deterministic fake implementation, which is the
default. Build and test against the fake; never download weights during implementation.

## Hardware reality

| Fact                                          | Consequence for your design                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intel Arc 130V iGPU (Lunar Lake), **no CUDA** | Inference goes through OpenVINO with `device="GPU"`. Never write `.cuda()` or `device_map="auto"`.                                                      |
| 16 GB RAM **shared** with the GPU             | Load models lazily, one at a time, and evict the idle one. Both resident at once will not fit.                                                          |
| System Python is 3.14                         | The ML stack does not support it. The real backend needs a separate Python 3.12 venv. Core deps must stay importable on whatever Python is present.     |
| SDXL-Turbo is a distilled model               | It **must** run with `num_inference_steps=1` and `guidance_scale=0.0`. Ordinary guidance produces noise. This is the single easiest thing to get wrong. |

---

## Files to create

```
sidecar/
├── README.md                  setup, running, troubleshooting
├── requirements.txt           light deps — always installable
├── requirements-ml.txt        heavy deps — opt-in, Python 3.12 only
├── pyproject.toml             ruff + pytest configuration
├── .env.example
├── app/
│   ├── __init__.py
│   ├── main.py                FastAPI app and routes
│   ├── config.py              settings from environment
│   ├── schemas.py             pydantic request/response models
│   ├── critique.py            pure scoring and prompt-building logic
│   └── backends/
│       ├── __init__.py        backend registry and lazy selection
│       ├── base.py            ImageBackend / CriticBackend protocols
│       ├── fake.py            deterministic, no models — the default
│       ├── openvino_sdxl.py   real image generation
│       └── janus_critic.py    real critique
├── scripts/
│   ├── setup.ps1              create the venv, install ML deps
│   └── export_models.py       download and convert to OpenVINO IR
└── tests/
    ├── test_api.py
    ├── test_critique.py
    └── test_fake_backend.py
```

### Dependencies

`requirements.txt` — must install on any Python 3.11+ including 3.14:

```
fastapi>=0.115
uvicorn[standard]>=0.32
pydantic>=2.9
pillow>=11.0
numpy>=2.1
```

`requirements-ml.txt` — Python 3.12 only, installed by `setup.ps1`:

```
-r requirements.txt
openvino>=2025.0
optimum-intel[openvino]>=1.21
transformers>=4.52
diffusers>=0.31
torch>=2.5
sentencepiece
```

Dev deps (`ruff`, `pytest`, `httpx`) go in `pyproject.toml` under an optional group.

---

## 1. `app/config.py`

Read from the environment with sane defaults; never require a `.env` to exist.

| Variable              | Default     | Meaning                                                    |
| --------------------- | ----------- | ---------------------------------------------------------- |
| `ADT_HOST`            | `127.0.0.1` | Bind address. Keep it loopback — this service has no auth. |
| `ADT_PORT`            | `8756`      | Must match `SIDECAR_URL` in the SvelteKit `.env`           |
| `ADT_BACKEND`         | `fake`      | `fake` or `real`                                           |
| `ADT_DEVICE`          | `GPU`       | OpenVINO device: `GPU`, `CPU`, or `AUTO`                   |
| `ADT_MODELS_DIR`      | `./models`  | Where the OpenVINO IR exports live                         |
| `ADT_IMAGE_STEPS`     | `1`         | SDXL-Turbo step count — do not raise it                    |
| `ADT_MAX_CONCURRENCY` | `1`         | Serialise inference; the iGPU cannot overlap requests      |

Expose a cached `get_settings()` returning a frozen dataclass or a pydantic
`BaseSettings`.

## 2. `app/schemas.py`

Pydantic models mirroring the TypeScript contract in `src/lib/types/contracts.ts`. The
sidecar speaks `snake_case`; the TypeScript client converts at the boundary. **Score
field names are the exception** — they stay camelCase because they pass through
unchanged into the game's `Critique`.

```python
class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    seed: int | None = None

class GenerateResponse(BaseModel):
    image_base64: str
    width: int
    height: int
    duration_ms: float

class CritiqueRequest(BaseModel):
    brief_request: str = Field(min_length=1)
    brief_keywords: list[str] = Field(min_length=1, max_length=8)
    player_prompt: str = Field(min_length=1)
    image_base64: str = Field(min_length=1)

class CritiqueResponse(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    accuracyScore: int = Field(ge=1, le=10)
    criticReview: str = Field(min_length=1, max_length=600)

class HealthResponse(BaseModel):
    status: Literal["ok"]
    device: str
    backend: Literal["fake", "real"]
    models: dict[str, Literal["loaded", "unloaded", "missing"]]
```

> **Note the division of labour.** The sidecar returns only `accuracyScore` — a
> judgement about the _picture_, which is the one thing a vision model can offer that
> text analysis cannot. `creativityScore` and `finalPayout` are computed in TypeScript
> from the player's prompt, so all economy rules stay in one place and the mock and
> real providers cannot drift apart. Do not return a payout.

## 3. `app/backends/base.py`

```python
class ImageBackend(Protocol):
    name: str
    def is_ready(self) -> bool: ...
    def generate(self, prompt: str, seed: int | None) -> tuple[Image.Image, float]: ...
    def unload(self) -> None: ...

class CriticBackend(Protocol):
    name: str
    def is_ready(self) -> bool: ...
    def describe(self, image: Image.Image, question: str) -> str: ...
    def unload(self) -> None: ...
```

`describe` answers one question about one image. Keeping the interface this narrow is
what makes the critique logic in `critique.py` pure and testable — all model
interaction reduces to "ask a question, get a string".

## 4. `app/backends/fake.py`

The default. Deterministic, instant, no dependencies beyond Pillow and numpy.

- `FakeImageBackend.generate` seeds `random.Random(seed or hash(prompt))` and paints a
  512×512 abstract composition with Pillow — a pastel background and a handful of
  blobs and strokes. The same prompt must always produce byte-identical PNG output.
- `FakeCriticBackend.describe` returns a canned answer derived from the question: if
  the question contains a keyword that also appears in the fake's configured
  `known_terms`, answer `"yes"`, otherwise `"no"`. Tests configure `known_terms`
  directly.
- Both report `is_ready() -> True`.

## 5. `app/critique.py` — pure logic, no models

This is where the design gets interesting, and it is the part to get right.

**Do not ask a 1B model to emit JSON.** It will not reliably comply, and a parse
failure mid-game is a terrible experience. Instead ask it a series of narrow questions
whose answers are trivial to parse, then compute the score yourself.

```python
def build_keyword_question(keyword: str) -> str:
    return f"Does this picture clearly show {keyword}? Answer only yes or no."

def build_review_question(brief_request: str) -> str:
    return (
        "You are a witty art critic reviewing an amateur painting. "
        f"The client asked for: {brief_request} "
        "In one or two sentences, give your honest verdict on this picture."
    )

def parse_yes_no(answer: str) -> bool:
    """True only for a clear yes. Ambiguous or empty answers count as no."""

def accuracy_from_hits(hits: int, total: int) -> int:
    """Mirror of the TypeScript formula: clamp(round(1 + ratio * 9), 1, 10)."""

def build_title(player_prompt: str, seed: int) -> str:
    """Deterministic gallery title from the prompt's first meaningful words."""

def clean_review(raw: str, fallback: str) -> str:
    """Trim, collapse whitespace, cut to 600 chars, strip any leaked prompt echo.
    Return `fallback` if the model produced nothing usable."""
```

`accuracy_from_hits` **must** match the TypeScript `scorePrompt` accuracy formula
exactly, so switching providers does not change the game's difficulty:

| hits / total | accuracy |
| ------------ | -------- |
| 0 / 4        | 1        |
| 1 / 4        | 3        |
| 2 / 4        | 6        |
| 3 / 4        | 8        |
| 4 / 4        | 10       |

`parse_yes_no` rules: lowercase and strip; `True` when the answer starts with `yes` or
contains `yes,` / `yes.` / `yes` as a standalone word; `False` for everything else
including the empty string. A vision model that rambles counts as a no — better to
under-score than to hand out free money for an unparseable answer.

**These functions are the bulk of your test suite.** They are pure, so test them hard.

## 6. `app/backends/openvino_sdxl.py`

```python
from optimum.intel.openvino import OVStableDiffusionXLPipeline

pipe = OVStableDiffusionXLPipeline.from_pretrained(model_dir, device=settings.device)
image = pipe(
    prompt=prompt,
    num_inference_steps=1,     # SDXL-Turbo is single-step. Never raise this.
    guidance_scale=0.0,        # Turbo has no negative prompt; guidance breaks it.
    height=512,
    width=512,
).images[0]
```

- Load lazily on first `generate`, not at import. Startup must stay instant.
- Before loading, ask the registry to unload the critic — they do not co-fit in memory.
- If `model_dir` does not exist, `is_ready()` returns `False` and `/health` reports the
  model as `missing`. Never crash on a missing model.
- Seed via a `torch.Generator` when torch is present; if seeding is unavailable, log it
  and continue rather than failing the request.
- Log the wall-clock duration of each generation at INFO. Expect roughly 2–4 seconds
  once warm, and 30–90 seconds for the very first call while the model loads.

## 7. `app/backends/janus_critic.py`

Janus-Pro-1B in **understanding** mode: it looks at the PNG through its SigLIP encoder
and answers questions. We do not use its image-generation side — SDXL-Turbo is better
at that, while Janus is the only local model that can actually see the finished piece.

Try the OpenVINO path first and fall back gracefully:

1. **OpenVINO** — `OVModelForVisualCausalLM.from_pretrained(model_dir, trust_remote_code=True)`
   against the IR produced by `export_models.py`.
2. **PyTorch** — `transformers.JanusForConditionalGeneration` with
   `deepseek-community/Janus-Pro-1B`, on `xpu` if `torch.xpu.is_available()` else `cpu`.
3. **Unavailable** — `is_ready()` returns `False`. The TypeScript layer then falls back
   to the mock critic, and the game keeps working.

Generation settings: `max_new_tokens=64` for reviews, `max_new_tokens=8` for yes/no
questions, `do_sample=False` so critiques are reproducible. Images are resized to
384×384 before encoding, which is Janus's native input size.

## 8. `app/main.py`

FastAPI app exposing exactly the three endpoints the TypeScript client in Spec 02
expects. **Match these shapes precisely** — they are a cross-language contract.

### `GET /health`

Never fails. Reports backend, device and per-model status. This is what
`SidecarImageGenerator.isAvailable()` probes with a 2-second timeout, so it must not
touch the models or block.

### `POST /generate`

Body `GenerateRequest`, returns `GenerateResponse`. Encode the PNG to base64 **without**
a `data:` prefix — the TypeScript side adds it. On backend failure return `503` with
`{"detail": "..."}`.

### `POST /critique`

Body `CritiqueRequest`, returns `CritiqueResponse`. Steps:

1. Decode `image_base64` into a Pillow image; a bad payload is a `422`.
2. For each of `brief_keywords` (cap at 4 to bound latency), call
   `describe(image, build_keyword_question(kw))` and `parse_yes_no` the answer.
3. `accuracyScore = accuracy_from_hits(hits, total)`.
4. Call `describe(image, build_review_question(brief_request))` for the prose, then
   `clean_review(...)` with a band-appropriate fallback.
5. `title = build_title(player_prompt, seed)`.

Cross-cutting requirements:

- Guard all inference with an `asyncio.Semaphore(ADT_MAX_CONCURRENCY)`. Two concurrent
  generations on this iGPU will thrash memory and may fail outright.
- Run blocking model calls in a thread (`anyio.to_thread.run_sync` or
  `run_in_executor`) so the event loop keeps serving `/health`.
- Enable CORS for `http://localhost:5173` and `http://localhost:4173` (the SvelteKit
  dev and preview ports).
- Log every request with its duration. Never log the base64 payloads.

## 9. `scripts/export_models.py`

An **opt-in** downloader and converter. Do not run it during implementation.

```powershell
python scripts/export_models.py --image --critic
```

- `--image`: export `stabilityai/sdxl-turbo` to `models/sdxl-turbo-ov` via
  `optimum-cli export openvino --model stabilityai/sdxl-turbo --weight-format int8 models/sdxl-turbo-ov`.
  Mention `rupeshs/sdxl-turbo-openvino-int8` in the README as a pre-converted
  alternative that skips a long conversion.
- `--critic`: export `deepseek-ai/Janus-Pro-1B` with `--trust-remote-code`. Janus needs
  custom modelling code, so this export is the fragile step; if it fails, print a clear
  message telling the user the PyTorch fallback will be used and exit `0`, not `1`.
- Print the disk space required (roughly 7 GB total) and ask for confirmation before
  downloading, unless `--yes` is passed.
- Skip any export whose output directory already exists, unless `--force`.

## 10. `scripts/setup.ps1`

PowerShell, because this is a Windows machine:

1. Find Python 3.12 via `py -3.12`. If absent, print the download URL and exit with a
   clear message — do not attempt to install it.
2. Create `sidecar/.venv`.
3. `pip install -r requirements-ml.txt`.
4. Print the exact command to start the service and a reminder to update the Intel
   graphics driver to 32.0.101.8801 or newer, since the installed 32.0.101.6737 predates
   current PyTorch XPU support.

## 11. Tests

Use `pytest` with `fastapi.testclient.TestClient` and the fake backend. The suite must
run in a few seconds and require no models and no network.

`tests/test_critique.py` — the priority, since this is pure logic:

- `accuracy_from_hits` matches every row of the table above.
- `parse_yes_no`: `'Yes'` → `True`; `'yes, clearly'` → `True`; `'No.'` → `False`;
  `'I cannot tell'` → `False`; `''` → `False`; `'yesterday'` → `False` (guard against
  the naive `startswith` bug).
- `build_title` is deterministic for a fixed seed and never exceeds 120 characters.
- `clean_review` collapses whitespace, truncates to 600 characters, and returns the
  fallback for an empty or whitespace-only input.

`tests/test_api.py`:

- `GET /health` returns `200` with `backend == 'fake'`.
- `POST /generate` returns valid base64 that Pillow can decode to a 512×512 image.
- The same prompt twice returns identical `image_base64`.
- `POST /generate` with an empty prompt returns `422`.
- `POST /critique` with a fake backend configured to answer yes to everything returns
  `accuracyScore == 10`; configured to answer no to everything returns `1`.
- `POST /critique` with malformed base64 returns `422`, not `500`.
- No response body ever contains a `finalPayout` field.

## 12. `sidecar/README.md`

Cover: what the service is and why it exists; running with the fake backend in one
command; the full setup path for real models; the hardware constraints table above;
every environment variable; the endpoint reference; and a troubleshooting section
covering a missing Python 3.12, a failed Janus export, out-of-memory on the shared
iGPU, and the port clashing with the SvelteKit config.

---

## Verification

These replace the Node commands used by the other specs:

```powershell
cd sidecar
python -m pip install -r requirements.txt
python -m pip install ruff pytest httpx
python -m ruff check .
python -m ruff format --check .
python -m pytest -q
```

Then confirm the service actually boots with no models present:

```powershell
python -m uvicorn app.main:app --port 8756
# In another terminal:
curl http://127.0.0.1:8756/health
```

If Python 3.12 is unavailable, still run the above with the system Python — the light
dependency set is deliberately chosen to install on newer versions. The ML
dependencies are not needed for any test.

## Definition of done

- [ ] Every file in the tree exists.
- [ ] `python -m pytest -q` passes with no models and no network access.
- [ ] The service starts in under two seconds with `ADT_BACKEND=fake` and `/health`
      returns `200`.
- [ ] `ruff check` and `ruff format --check` are clean.
- [ ] No `.cuda()` and no `device_map="auto"` anywhere.
- [ ] `num_inference_steps=1` and `guidance_scale=0.0` in the SDXL path.
- [ ] A missing model degrades to `is_ready() == False`; it never raises on startup.
- [ ] No model weights are committed. `sidecar/models` is already in `.gitignore`.
- [ ] `sidecar/README.md` written.
- [ ] Handoff entry appended to `docs/agent-log.md`.
