import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { A2ACinemaDemo } from './A2ACinemaDemo'
import { useA2AStore } from '../../store/a2a-traces-store'
import { DEMO_AGENTS, DEMO_STEPS } from './a2a-demo-scenario'

describe('A2ACinemaDemo', () => {
  beforeEach(() => {
    useA2AStore.getState().clearTraces()
  })

  afterEach(() => {
    cleanup()
    useA2AStore.getState().clearTraces()
  })

  it('renders 8 agents and their models in the collaborative mesh', () => {
    render(<A2ACinemaDemo />)

    expect(screen.getByTestId('a2a-cinema-demo')).toBeDefined()
    expect(screen.getByText('OAGENT MULTI-AI COLLABORATIVE MESH')).toBeDefined()
    expect(screen.getByText('LIVE DEMO REEL')).toBeDefined()

    // Verify all 8 agents are present
    for (const agent of DEMO_AGENTS) {
      expect(screen.getByText(agent.handle)).toBeDefined()
      expect(screen.getByText(agent.model)).toBeDefined()
    }
  })

  it('broadcasts traces to a2a store on mount and step progression', () => {
    render(<A2ACinemaDemo />)

    const traces = useA2AStore.getState().recentTraces
    expect(traces.length).toBeGreaterThanOrEqual(1)
    expect(traces[0].fromIndex).toBe(DEMO_STEPS[0].fromIndex)
    expect(traces[0].toIndex).toBe(DEMO_STEPS[0].toIndex)
    expect(traces[0].text).toContain(DEMO_STEPS[0].motif)
  })

  it('steps forward when clicking Step Next', () => {
    render(<A2ACinemaDemo />)

    expect(screen.getByText(`STEP 1 / ${DEMO_STEPS.length}`)).toBeDefined()

    const stepNextBtn = screen.getByTitle('Step Next')
    act(() => {
      fireEvent.click(stepNextBtn)
    })

    expect(screen.getByText(`STEP 2 / ${DEMO_STEPS.length}`)).toBeDefined()
  })

  it('toggles playback with Pause and Play buttons', () => {
    render(<A2ACinemaDemo />)

    const pauseBtn = screen.getByText('Pause')
    act(() => {
      fireEvent.click(pauseBtn)
    })

    expect(screen.getByText('Play')).toBeDefined()

    const playBtn = screen.getByText('Play')
    act(() => {
      fireEvent.click(playBtn)
    })

    expect(screen.getByText('Pause')).toBeDefined()
  })

  it('resets to step 1 when clicking Replay', () => {
    render(<A2ACinemaDemo />)

    const stepNextBtn = screen.getByTitle('Step Next')
    act(() => {
      fireEvent.click(stepNextBtn)
      fireEvent.click(stepNextBtn)
    })
    expect(screen.getByText(`STEP 3 / ${DEMO_STEPS.length}`)).toBeDefined()

    const replayBtn = screen.getByTitle('Replay from Step 1')
    act(() => {
      fireEvent.click(replayBtn)
    })
    expect(screen.getByText(`STEP 1 / ${DEMO_STEPS.length}`)).toBeDefined()
  })

  it('changes playback speed multiplier', () => {
    render(<A2ACinemaDemo />)

    const speed2xBtn = screen.getByText('2x')
    act(() => {
      fireEvent.click(speed2xBtn)
    })
    expect(speed2xBtn.className).toContain('bg-violet-600')
  })

  it('toggles fullscreen mode', () => {
    render(<A2ACinemaDemo />)

    const fullscreenBtn = screen.getByTitle('Fullscreen')
    act(() => {
      fireEvent.click(fullscreenBtn)
    })

    const container = screen.getByTestId('a2a-cinema-demo')
    expect(container.className).toContain('fixed inset-0')
  })
})
