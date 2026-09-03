import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import { Questionnaire } from './Questionnaire'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return {
    ...actual,
    fetchQuestionBank: vi.fn(),
    fetchQuestionnaireProgress: vi.fn(),
    postQuestionResponse: vi.fn(),
    postQuestionnaireComplete: vi.fn(),
  }
})

const bank: api.QuestionBank = {
  bank_id: 'placeholder-v1',
  instrument_version: 'placeholder-v1',
  label: 'Self-report research prescreening items (development placeholder)',
  scale: [
    { value: 1, label: 'Strongly disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Agree' },
    { value: 4, label: 'Strongly agree' },
  ],
  required_count: 2,
  items: [
    {
      id: 'ph_01',
      text: 'I prefer familiar routines over unexpected changes.',
      required: true,
      reverse_scored: false,
      category: 'routine',
    },
    {
      id: 'ph_02',
      text: 'I feel comfortable starting conversations with people I do not know well.',
      required: true,
      reverse_scored: true,
      category: 'social_preference',
    },
  ],
}

const baseSession = (stage: api.SessionStage): api.SessionResponse => ({
  id: 'sess-1',
  stage,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
  consent: {
    research_only: true,
    no_diagnosis: true,
    data_minimization: true,
    camera_optional: false,
    consented_at: '2026-01-01T00:01:00+00:00',
  },
  intake: {
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
})

describe('Questionnaire', () => {
  beforeEach(() => {
    vi.mocked(api.fetchQuestionBank).mockReset()
    vi.mocked(api.fetchQuestionnaireProgress).mockReset()
    vi.mocked(api.postQuestionResponse).mockReset()
    vi.mocked(api.postQuestionnaireComplete).mockReset()
    vi.mocked(api.fetchQuestionBank).mockResolvedValue(bank)
  })

  it('shows placeholder banner and bank-driven first question', async () => {
    vi.mocked(api.fetchQuestionnaireProgress).mockResolvedValue({
      session_id: 'sess-1',
      stage: 'intake_complete',
      bank_id: bank.bank_id,
      required_count: 2,
      answered_count: 0,
      answered: {},
      next_question_id: 'ph_01',
      ordered_question_ids: ['ph_01', 'ph_02'],
      session: baseSession('intake_complete'),
    })

    render(
      <Questionnaire
        sessionId="sess-1"
        initialSession={baseSession('intake_complete')}
        onSessionUpdate={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/placeholder questionnaire for development purposes only/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/not a validated clinical instrument/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/prefer familiar routines over unexpected changes/i),
      ).toBeInTheDocument()
    })
  })

  it('completion UI hides numeric score and the word score', async () => {
    const completed = baseSession('questionnaire_complete')
    completed.questionnaire = {
      started_at: '2026-01-01T00:02:00+00:00',
      completed_at: '2026-01-01T00:10:00+00:00',
      score: 42,
      item_count: 10,
      bank_id: 'placeholder-v1',
      instrument_version: 'placeholder-v1',
      subscale_scores: { routine: 5 },
      timing: {
        item_count: 10,
        total_time_ms: 1000,
        mean_time_to_first_interaction_ms: 100,
        mean_total_time_on_question_ms: 100,
        total_answer_changes: 0,
      },
    }
    vi.mocked(api.fetchQuestionnaireProgress).mockResolvedValue({
      session_id: 'sess-1',
      stage: 'questionnaire_complete',
      bank_id: bank.bank_id,
      required_count: 2,
      answered_count: 2,
      answered: {},
      next_question_id: null,
      ordered_question_ids: ['ph_01', 'ph_02'],
      session: completed,
    })

    const { container } = render(
      <Questionnaire
        sessionId="sess-1"
        initialSession={completed}
        onSessionUpdate={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    await screen.findByRole('heading', { name: /questionnaire complete/i })
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/\b42\b/)
    expect(text.toLowerCase()).not.toContain('score')
  })

  it('offers finish when all answers saved but not completed', async () => {
    const user = userEvent.setup()
    const onSessionUpdate = vi.fn()
    const inProgress = baseSession('questionnaire_in_progress')
    vi.mocked(api.fetchQuestionnaireProgress).mockResolvedValue({
      session_id: 'sess-1',
      stage: 'questionnaire_in_progress',
      bank_id: bank.bank_id,
      required_count: 2,
      answered_count: 2,
      answered: {
        ph_01: {
          question_id: 'ph_01',
          answer_value: 3,
          shown_at: 't0',
          answered_at: 't1',
          time_to_first_interaction_ms: 10,
          total_time_on_question_ms: 100,
          answer_change_count: 0,
        },
        ph_02: {
          question_id: 'ph_02',
          answer_value: 2,
          shown_at: 't0',
          answered_at: 't1',
          time_to_first_interaction_ms: 10,
          total_time_on_question_ms: 100,
          answer_change_count: 0,
        },
      },
      next_question_id: null,
      ordered_question_ids: ['ph_01', 'ph_02'],
      session: inProgress,
    })
    vi.mocked(api.postQuestionnaireComplete).mockResolvedValue(
      baseSession('questionnaire_complete'),
    )

    render(
      <Questionnaire
        sessionId="sess-1"
        initialSession={inProgress}
        onSessionUpdate={onSessionUpdate}
        onBack={vi.fn()}
      />,
    )

    await screen.findByRole('heading', { name: /finish questionnaire/i })
    await user.click(
      screen.getByRole('button', { name: /finish questionnaire/i }),
    )
    await waitFor(() => {
      expect(api.postQuestionnaireComplete).toHaveBeenCalledWith('sess-1')
    })
    await screen.findByRole('heading', { name: /questionnaire complete/i })
  })

  it('treats questionnaire_already_complete as success and advances', async () => {
    const user = userEvent.setup()
    const onSessionUpdate = vi.fn()
    const inProgress = baseSession('questionnaire_in_progress')
    const completed = baseSession('questionnaire_complete')
    const answered = {
      ph_01: {
        question_id: 'ph_01',
        answer_value: 3,
        shown_at: 't0',
        answered_at: 't1',
        time_to_first_interaction_ms: 10,
        total_time_on_question_ms: 100,
        answer_change_count: 0,
      },
      ph_02: {
        question_id: 'ph_02',
        answer_value: 2,
        shown_at: 't0',
        answered_at: 't1',
        time_to_first_interaction_ms: 10,
        total_time_on_question_ms: 100,
        answer_change_count: 0,
      },
    }
    vi.mocked(api.postQuestionnaireComplete).mockRejectedValue(
      new Error('questionnaire_already_complete'),
    )
    vi.mocked(api.fetchQuestionnaireProgress)
      .mockResolvedValueOnce({
        session_id: 'sess-1',
        stage: 'questionnaire_in_progress',
        bank_id: bank.bank_id,
        required_count: 2,
        answered_count: 2,
        answered,
        next_question_id: null,
        ordered_question_ids: ['ph_01', 'ph_02'],
        session: inProgress,
      })
      .mockResolvedValueOnce({
        session_id: 'sess-1',
        stage: 'questionnaire_complete',
        bank_id: bank.bank_id,
        required_count: 2,
        answered_count: 2,
        answered,
        next_question_id: null,
        ordered_question_ids: ['ph_01', 'ph_02'],
        session: completed,
      })

    render(
      <Questionnaire
        sessionId="sess-1"
        initialSession={inProgress}
        onSessionUpdate={onSessionUpdate}
        onBack={vi.fn()}
      />,
    )

    await screen.findByRole('heading', { name: /finish questionnaire/i })
    await user.click(
      screen.getByRole('button', { name: /finish questionnaire/i }),
    )
    await screen.findByRole('heading', { name: /questionnaire complete/i })
    expect(onSessionUpdate).toHaveBeenCalledWith(completed)
  })

  it('associates scale group with question text', async () => {
    vi.mocked(api.fetchQuestionnaireProgress).mockResolvedValue({
      session_id: 'sess-1',
      stage: 'intake_complete',
      bank_id: bank.bank_id,
      required_count: 2,
      answered_count: 0,
      answered: {},
      next_question_id: 'ph_01',
      ordered_question_ids: ['ph_01', 'ph_02'],
      session: baseSession('intake_complete'),
    })

    render(
      <Questionnaire
        sessionId="sess-1"
        initialSession={baseSession('intake_complete')}
        onSessionUpdate={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    await screen.findByText(/prefer familiar routines/i)
    const group = screen.getByRole('group', {
      name: /prefer familiar routines/i,
    })
    expect(group).toBeInTheDocument()
  })

  it('posts metrics and advances on next', async () => {
    const user = userEvent.setup()
    const onSessionUpdate = vi.fn()
    vi.mocked(api.fetchQuestionnaireProgress).mockResolvedValue({
      session_id: 'sess-1',
      stage: 'intake_complete',
      bank_id: bank.bank_id,
      required_count: 2,
      answered_count: 0,
      answered: {},
      next_question_id: 'ph_01',
      ordered_question_ids: ['ph_01', 'ph_02'],
      session: baseSession('intake_complete'),
    })
    vi.mocked(api.postQuestionResponse).mockResolvedValue({
      session: baseSession('questionnaire_in_progress'),
      response: {
        question_id: 'ph_01',
        answer_value: 3,
        shown_at: 't0',
        answered_at: 't1',
        time_to_first_interaction_ms: 10,
        total_time_on_question_ms: 100,
        answer_change_count: 0,
      },
      answered_count: 1,
      required_count: 2,
      next_question_id: 'ph_02',
    })

    render(
      <Questionnaire
        sessionId="sess-1"
        initialSession={baseSession('intake_complete')}
        onSessionUpdate={onSessionUpdate}
        onBack={vi.fn()}
      />,
    )

    await screen.findByText(/prefer familiar routines/i)
    await user.click(screen.getByRole('button', { name: /3\s*agree/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await waitFor(() => {
      expect(api.postQuestionResponse).toHaveBeenCalled()
    })
    const payload = vi.mocked(api.postQuestionResponse).mock.calls[0][0]
    expect(payload.question_id).toBe('ph_01')
    expect(payload.answer_value).toBe(3)
    expect(payload.time_to_first_interaction_ms).toBeGreaterThanOrEqual(0)
    expect(payload.total_time_on_question_ms).toBeGreaterThanOrEqual(
      payload.time_to_first_interaction_ms,
    )
    await waitFor(() => {
      expect(document.getElementById('question-text-ph_02')).toHaveTextContent(
        /comfortable starting conversations/i,
      )
    })
  })

  it('posts a question response only once if Next is clicked twice', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchQuestionnaireProgress).mockResolvedValue({
      session_id: 'sess-1',
      stage: 'intake_complete',
      bank_id: bank.bank_id,
      required_count: 2,
      answered_count: 0,
      answered: {},
      next_question_id: 'ph_01',
      ordered_question_ids: ['ph_01', 'ph_02'],
      session: baseSession('intake_complete'),
    })
    let resolvePost!: (value: api.QuestionResponseResult) => void
    vi.mocked(api.postQuestionResponse).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve
        }),
    )

    render(
      <Questionnaire
        sessionId="sess-1"
        initialSession={baseSession('intake_complete')}
        onSessionUpdate={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    await screen.findByText(/prefer familiar routines/i)
    await user.click(screen.getByRole('button', { name: /3\s*agree/i }))
    const next = screen.getByRole('button', { name: /^next$/i })
    fireEvent.click(next)
    fireEvent.click(next)
    expect(api.postQuestionResponse).toHaveBeenCalledTimes(1)
    resolvePost({
      session: baseSession('questionnaire_in_progress'),
      response: {
        question_id: 'ph_01',
        answer_value: 3,
        shown_at: 't0',
        answered_at: 't1',
        time_to_first_interaction_ms: 10,
        total_time_on_question_ms: 100,
        answer_change_count: 0,
      },
      answered_count: 1,
      required_count: 2,
      next_question_id: 'ph_02',
    })
    await waitFor(() => {
      expect(document.getElementById('question-text-ph_02')).toBeTruthy()
    })
  })
})
