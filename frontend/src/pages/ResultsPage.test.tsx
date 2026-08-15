import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import type { ResearchSessionSummary } from '../types/assessment'
import { ResultsPage } from './ResultsPage'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>(
    '../lib/api',
  )
  return {
    ...actual,
    fetchResearchSummary: vi.fn(),
  }
})

const mockedFetch = vi.mocked(api.fetchResearchSummary)

const NEXT_STEP =
  'If you have questions or ongoing concerns, consider discussing them with a qualified healthcare professional.'

const BANNED_PHRASES = [
  'risk score',
  'high risk',
  'low risk',
  'autism probability',
  'likely autistic',
  'unlikely autistic',
  'you have autism',
]

function summary(
  extras: Partial<ResearchSessionSummary> = {},
): ResearchSessionSummary {
  return {
    session_id: '11111111-2222-3333-4444-555555555555',
    status: 'complete',
    data_quality: {
      questionnaire_completed: true,
      questionnaire_item_count: 10,
      video_task_status: 'completed',
      tracking_ratio: 0.8,
      calibration_status: 'not_available',
      overall_quality_label: 'usable_for_research_display',
    },
    research_task_observations: {
      questionnaire_response_pattern: {
        mean_response_time_ms: 1400,
        response_time_variability_ms: 180,
        answer_change_count: 1,
      },
      video_task_summary: {
        task_completed: true,
        valid_tracking_duration_ms: 6400,
        mean_blink_estimate: 0.2,
        head_motion_summary: {
          mean_abs_yaw_deg: 6,
          mean_abs_pitch_deg: 4,
        },
        attention_estimates_available: true,
      },
    },
    explanation: {
      summary:
        'This is a research-session summary of the tasks that were completed.',
      available_data: [
        'Self-report questionnaire answers and response timing',
        'Numeric video-task tracking summary',
      ],
      unavailable_or_limited_data: [
        'Calibration pass or fail is not stored on the server',
      ],
      limitations: [
        'The self-report questionnaire is a development placeholder, not a validated clinical instrument.',
        'Webcam estimates depend on the device, lighting, camera position, and whether tracking stayed on a single face.',
        'One short research task cannot assess autism.',
        'This prototype does not diagnose autism or replace a professional assessment, and it does not provide a clinical probability.',
      ],
      next_steps: [NEXT_STEP],
    },
    safety: {
      research_only: true,
      not_a_diagnosis: true,
      no_clinical_probability_provided: true,
    },
    ...extras,
  }
}

describe('ResultsPage', () => {
  beforeEach(() => {
    mockedFetch.mockReset()
  })

  it('renders the persistent safety notice with a loaded summary', async () => {
    mockedFetch.mockResolvedValue(summary())
    render(
      <ResultsPage sessionId="sess-1" loadError={null} onBack={vi.fn()} />,
    )

    expect(
      screen.getByRole('heading', { name: /research-session summary/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('note', { name: /research session notice/i }),
    ).toHaveTextContent(/does not diagnose autism/i)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /research-task measurements/i }),
      ).toBeInTheDocument()
    })
    expect(screen.getByText(NEXT_STEP)).toBeInTheDocument()
  })

  it('renders a skipped video without crashing', async () => {
    mockedFetch.mockResolvedValue(
      summary({
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
            mean_response_time_ms: 1400,
            response_time_variability_ms: 180,
            answer_change_count: 1,
          },
          video_task_summary: {
            task_completed: false,
            valid_tracking_duration_ms: 0,
            mean_blink_estimate: null,
            head_motion_summary: null,
            attention_estimates_available: false,
          },
        },
      }),
    )

    render(
      <ResultsPage sessionId="sess-1" loadError={null} onBack={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/video task: skipped/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/mean blink estimate/i)).not.toBeInTheDocument()
    expect(screen.getByText(NEXT_STEP)).toBeInTheDocument()
  })

  it('renders limited tracking as a quality limitation', async () => {
    mockedFetch.mockResolvedValue(
      summary({
        status: 'partial',
        data_quality: {
          questionnaire_completed: true,
          questionnaire_item_count: 10,
          video_task_status: 'completed',
          tracking_ratio: 0.4,
          calibration_status: 'not_available',
          overall_quality_label: 'limited',
        },
      }),
    )

    render(
      <ResultsPage sessionId="sess-1" loadError={null} onBack={vi.fn()} />,
    )

    await waitFor(() => {
      expect(
        screen.getByLabelText(/tracking quality: limited/i),
      ).toBeInTheDocument()
    })
  })

  it('does not present risk, probability, or diagnostic conclusions', async () => {
    mockedFetch.mockResolvedValue(summary())
    const { container } = render(
      <ResultsPage sessionId="sess-1" loadError={null} onBack={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/mean time on each question/i)).toBeInTheDocument()
    })
    expect(
      screen.queryByText(/placeholder questionnaire total/i),
    ).not.toBeInTheDocument()

    const page = container.textContent?.toLowerCase() ?? ''
    for (const phrase of BANNED_PHRASES) {
      expect(page).not.toContain(phrase)
    }

    const measurements = screen.getByRole('region', {
      name: /research-task measurements/i,
    })
    expect(measurements.textContent).not.toMatch(/\brisk\b/i)
    expect(measurements.textContent).not.toMatch(/\bprobability\b/i)

    const quality = screen.getByRole('region', {
      name: /session completeness/i,
    })
    expect(quality.textContent).not.toMatch(/\brisk\b/i)
    expect(quality.textContent).not.toMatch(/\bprobability\b/i)
  })

  it('shows a safe error when the session is missing', async () => {
    mockedFetch.mockRejectedValue(new Error('session_not_found'))
    render(
      <ResultsPage sessionId="missing" loadError={null} onBack={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /this research session was not found/i,
      )
    })
    expect(
      screen.getByRole('note', { name: /research session notice/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument()
  })
})
