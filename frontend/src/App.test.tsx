import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './lib/api'
import * as camera from './lib/camera'
import * as sessionStore from './lib/sessionStorage'
import { getStimulusTaskManifest } from './lib/stimuliManifest'
import { THEME_STORAGE_KEY } from './lib/theme'

vi.mock('./lib/camera', async () => {
  const actual = await vi.importActual<typeof import('./lib/camera')>(
    './lib/camera',
  )
  return {
    ...actual,
    requestVideoOnlyStream: vi.fn(),
    stopMediaStream: vi.fn(),
    assertVideoOnly: vi.fn(),
  }
})

vi.mock('./lib/faceLandmarker', () => ({
  getFaceLandmarker: vi.fn().mockRejectedValue(new Error('offline in tests')),
  detectFacesForVideo: vi.fn(),
  estimateTrackingConfidence: vi.fn().mockReturnValue(0),
  closeFaceLandmarker: vi.fn(),
  WASM_ROOT: '/mediapipe/wasm',
  MODEL_URL: '/mediapipe/face_landmarker.task',
}))

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api')
  return {
    ...actual,
    fetchHealth: vi.fn(),
    createSession: vi.fn(),
    getSession: vi.fn(),
    postConsent: vi.fn(),
    postIntake: vi.fn(),
    postFeatures: vi.fn(),
    fetchResearchSummary: vi.fn(),
  }
})

const mocked = {
  fetchHealth: vi.mocked(api.fetchHealth),
  createSession: vi.mocked(api.createSession),
  getSession: vi.mocked(api.getSession),
  postConsent: vi.mocked(api.postConsent),
  postIntake: vi.mocked(api.postIntake),
  postFeatures: vi.mocked(api.postFeatures),
  fetchResearchSummary: vi.mocked(api.fetchResearchSummary),
}

const baseSession = (
  stage: api.SessionStage,
  extras: Partial<api.SessionResponse> = {},
): api.SessionResponse => ({
  id: '11111111-2222-3333-4444-555555555555',
  stage,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
  consent: {
    research_only: stage !== 'created',
    no_diagnosis: stage !== 'created',
    data_minimization: stage !== 'created',
    camera_optional: stage === 'created' ? null : false,
    consented_at: stage === 'created' ? null : '2026-01-01T00:01:00+00:00',
  },
  intake:
    stage === 'created' || stage === 'consented'
      ? null
      : {
          age_range: '25-34',
          language: 'en',
          accessibility_prefs: {
            large_text: false,
            reduced_motion: false,
            screen_reader_hints: false,
          },
          optional_context: null,
        },
  questionnaire: null,
  features_recorded: false,
  ...extras,
})

describe('App Phase 1 flow', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.removeItem(THEME_STORAGE_KEY)
    delete document.documentElement.dataset.theme
    mocked.fetchHealth.mockReset()
    mocked.createSession.mockReset()
    mocked.getSession.mockReset()
    mocked.postConsent.mockReset()
    mocked.postIntake.mockReset()
    mocked.postFeatures.mockReset()
    mocked.fetchResearchSummary.mockReset()
    mocked.postFeatures.mockResolvedValue({
      status: 'accepted',
      quality: 'unavailable',
      detail: 'numeric_features_stored',
    })
    mocked.fetchResearchSummary.mockResolvedValue({
      session_id: '11111111-2222-3333-4444-555555555555',
      status: 'partial',
      data_quality: {
        questionnaire_completed: true,
        questionnaire_item_count: 10,
        video_task_status: 'skipped',
        tracking_ratio: 0,
        calibration_status: 'not_available',
        overall_quality_label: 'limited',
      },
      research_task_observations: {
        questionnaire_response_pattern: {
          mean_response_time_ms: 1000,
          response_time_variability_ms: 50,
          answer_change_count: 0,
        },
        video_task_summary: {
          task_completed: false,
          valid_tracking_duration_ms: 0,
          mean_blink_estimate: null,
          head_motion_summary: null,
          attention_estimates_available: false,
        },
      },
      explanation: {
        summary:
          'The video task was skipped, so no video-task observations are shown.',
        available_data: ['Self-report questionnaire answers and response timing'],
        unavailable_or_limited_data: ['Video task was skipped'],
        limitations: [
          'The self-report questionnaire is a development placeholder, not a validated clinical instrument.',
          'One short research task cannot assess autism.',
        ],
        next_steps: [
          'If you have questions or ongoing concerns, consider discussing them with a qualified healthcare professional.',
        ],
      },
      safety: {
        research_only: true,
        not_a_diagnosis: true,
        no_clinical_probability_provided: true,
      },
    })
    mocked.fetchHealth.mockResolvedValue({
      status: 'ok',
      service: 'asd-insight-companion',
      version: '0.0.1',
    })
  })

  it('shows research disclaimer and welcome shell', async () => {
    render(<App />)
    expect(
      screen.getByRole('link', { name: /skip to main content/i }),
    ).toHaveAttribute('href', '#main-content')
    expect(
      screen.getByRole('note', { name: /research disclaimer/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /welcome/i }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/backend: ok/i)).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /switch to (dark|light) mode/i }),
    ).toBeInTheDocument()
  })

  it('toggles dark and light appearance without changing the session', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i })
    await user.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(
      screen.getByRole('button', { name: /switch to light mode/i }),
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(
      screen.getByRole('button', { name: /switch to light mode/i }),
    )
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(
      screen.getByRole('heading', { name: /welcome/i }),
    ).toBeInTheDocument()
  })

  it('starts a session and reaches consent (cannot skip to intake)', async () => {
    const user = userEvent.setup()
    mocked.createSession.mockResolvedValue(baseSession('created'))

    render(<App />)
    await user.click(
      screen.getByRole('button', { name: /start anonymous session/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^consent$/i }),
      ).toBeInTheDocument()
    })
    expect(document.getElementById('main-content')).toHaveFocus()
    expect(
      screen.queryByRole('heading', { name: /^intake$/i }),
    ).not.toBeInTheDocument()
    expect(sessionStore.loadSessionId()).toBe(
      '11111111-2222-3333-4444-555555555555',
    )
  })

  it('resumes consented session into intake view', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(baseSession('consented'))

    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume saved session/i }),
      ).toBeInTheDocument()
    })
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^intake$/i }),
      ).toBeInTheDocument()
    })
  })

  it('routes intake_complete stage to questionnaire view', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(baseSession('intake_complete'))
    // Questionnaire page will call assessment APIs; stub as network fail to
    // still prove routing (heading appears even if load errors).
    render(<App />)
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /questionnaire/i }),
      ).toBeInTheDocument()
    })
  })

  it('applies large_text accessibility class from intake prefs', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(
      baseSession('consented', {
        intake: {
          age_range: '25-34',
          language: 'en',
          accessibility_prefs: {
            large_text: true,
            reduced_motion: true,
            screen_reader_hints: true,
          },
          optional_context: null,
        },
      }),
    )

    const { container } = render(<App />)
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /intake/i }),
      ).toBeInTheDocument()
    })
    const shell = container.querySelector('.app-shell')
    expect(shell).toHaveClass('a11y-large-text')
    expect(shell).toHaveClass('a11y-reduced-motion')
    expect(shell).toHaveClass('a11y-screen-reader-hints')
  })

  it('keeps prior session id when start fails', async () => {
    const user = userEvent.setup()
    const prior = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    sessionStore.saveSessionId(prior)
    mocked.createSession.mockRejectedValue(new Error('network down'))

    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /resume saved session/i }),
      ).toBeInTheDocument()
    })
    await user.click(
      screen.getByRole('button', { name: /start anonymous session/i }),
    )
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /something went wrong\. you can try again/i,
      )
    })
    expect(sessionStore.loadSessionId()).toBe(prior)
  })

  it('declined camera consent never calls getUserMedia and still completes', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(
      baseSession('questionnaire_complete', {
        consent: {
          research_only: true,
          no_diagnosis: true,
          data_minimization: true,
          camera_optional: false,
          consented_at: '2026-01-01T00:01:00+00:00',
        },
      }),
    )
    vi.mocked(camera.requestVideoOnlyStream).mockReset()

    const { container } = render(<App />)
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /camera quality check/i }),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('button', { name: /enable camera/i }),
    ).not.toBeInTheDocument()
    expect(camera.requestVideoOnlyStream).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: /continue without camera/i }),
    )
    expect(
      screen.getByRole('heading', { name: /calibration/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /start with camera/i }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /skip calibration camera/i }),
    )
    expect(
      screen.getByRole('heading', { name: getStimulusTaskManifest().title }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /enable camera sampling/i }),
    ).not.toBeInTheDocument()
    expect(container.querySelector('video.stimulus-video')).toBeNull()

    await user.click(screen.getByRole('button', { name: /skip video task/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /research-session summary/i }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByRole('note', { name: /research session notice/i }),
    ).toHaveTextContent(/does not diagnose autism/i)
    expect(screen.getByLabelText(/video task: skipped/i)).toBeInTheDocument()
    expect(mocked.postFeatures).toHaveBeenCalled()
    expect(mocked.fetchResearchSummary).toHaveBeenCalled()
    const sent = mocked.postFeatures.mock.calls[0][0] as {
      media_uploaded: boolean
      frames?: unknown
    }
    expect(sent.media_uploaded).toBe(false)
    expect(sent.frames).toBeUndefined()
    expect(camera.requestVideoOnlyStream).not.toHaveBeenCalled()
  })

  it('shows retry recovery when feature submit fails', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(
      baseSession('questionnaire_complete', {
        consent: {
          research_only: true,
          no_diagnosis: true,
          data_minimization: true,
          camera_optional: false,
          consented_at: '2026-01-01T00:01:00+00:00',
        },
      }),
    )
    mocked.postFeatures.mockRejectedValue(new Error('Failed to fetch'))

    render(<App />)
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /continue without camera/i }),
      ).toBeInTheDocument()
    })
    await user.click(
      screen.getByRole('button', { name: /continue without camera/i }),
    )
    await user.click(
      screen.getByRole('button', { name: /skip calibration camera/i }),
    )
    await user.click(screen.getByRole('button', { name: /skip video task/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /could not save tracking notes/i }),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      /research service is unavailable/i,
    )
    expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /research-session summary/i }),
    ).not.toBeInTheDocument()
  })

  it('goes back one step from the camera check, not to welcome', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(baseSession('questionnaire_complete'))

    render(<App />)
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /camera quality check/i }),
      ).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(
      screen.queryByRole('heading', { name: /^welcome$/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /questionnaire/i }),
    ).toBeInTheDocument()
  })

  it('resumes a recorded session to results, not the camera step', async () => {
    const user = userEvent.setup()
    sessionStore.saveSessionId('11111111-2222-3333-4444-555555555555')
    mocked.getSession.mockResolvedValue(
      baseSession('questionnaire_complete', { features_recorded: true }),
    )

    render(<App />)
    await user.click(
      screen.getByRole('button', { name: /resume saved session/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /research-session summary/i }),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('heading', { name: /camera quality check/i }),
    ).not.toBeInTheDocument()
    expect(mocked.fetchResearchSummary).toHaveBeenCalled()
  })
})
