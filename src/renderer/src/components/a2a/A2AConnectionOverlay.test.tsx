// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { A2AConnectionOverlay } from './A2AConnectionOverlay'
import { useA2AStore } from '../../store/a2a-traces-store'

type Rect = {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
  x: number
  y: number
  toJSON: () => void
}

function setRect(
  element: HTMLElement,
  rect: Omit<Rect, 'right' | 'bottom' | 'x' | 'y' | 'toJSON'>
) {
  element.getBoundingClientRect = () => ({
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => {}
  })
}

function appendTerminalFixture(
  index: number,
  tabId: string,
  tabRect: Omit<Rect, 'right' | 'bottom' | 'x' | 'y' | 'toJSON'>,
  paneRect: Omit<Rect, 'right' | 'bottom' | 'x' | 'y' | 'toJSON'>,
  title = `Agent ${index}`
): HTMLElement[] {
  const tab = document.createElement('div')
  tab.setAttribute('data-a2a-test-fixture', '')
  tab.setAttribute('data-tab-id', tabId)
  tab.setAttribute('data-tab-title', title)
  tab.setAttribute('data-terminal-index', String(index))
  setRect(tab, tabRect)

  const terminalPane = document.createElement('div')
  terminalPane.setAttribute('data-a2a-test-fixture', '')
  terminalPane.setAttribute('data-terminal-tab-id', tabId)
  setRect(terminalPane, paneRect)

  document.body.append(tab, terminalPane)
  return [tab, terminalPane]
}

describe('A2AConnectionOverlay', () => {
  beforeEach(() => {
    useA2AStore.getState().clearTraces()
  })

  afterEach(() => {
    cleanup()
    document.querySelectorAll('[data-a2a-test-fixture]').forEach((element) => element.remove())
    document.querySelectorAll('[data-a2a-test-menu-entry]').forEach((element) => element.remove())
    useA2AStore.getState().clearTraces()
  })

  it('renders overlay container', () => {
    render(<A2AConnectionOverlay />)
    expect(screen.getByTestId('a2a-connection-overlay')).toBeDefined()
  })

  it('renders SVG beams and badges when real terminal elements exist', () => {
    const fixtureElements = [
      ...appendTerminalFixture(
        2,
        'tab-2',
        { left: 100, top: 20, width: 80, height: 30 },
        { left: 100, top: 100, width: 300, height: 180 }
      ),
      ...appendTerminalFixture(
        5,
        'tab-5',
        { left: 400, top: 20, width: 80, height: 30 },
        { left: 800, top: 100, width: 300, height: 180 }
      )
    ]

    act(() => {
      useA2AStore.getState().addTrace({
        from: '@2',
        to: '@5',
        type: 'send',
        text: 'npm test'
      })
    })

    const { container } = render(<A2AConnectionOverlay />)
    const svg = container.querySelector('svg')
    expect(svg).toBeDefined()
    expect(container.querySelector('.a2a-link-beam')).toBeDefined()

    expect(screen.getByText('#2')).toBeDefined()
    expect(screen.getByText('#5')).toBeDefined()
    expect(screen.getByText('npm test')).toBeDefined()

    const beamPath = container.querySelector('.a2a-link-beam .a2a-link-beam-flow')
    expect(beamPath?.getAttribute('d')).toContain('M 250 190')
    expect(beamPath?.getAttribute('d')).toMatch(/950 190$/)

    fixtureElements.forEach((element) => document.body.removeChild(element))
  })

  it('renders an exaggerated directional energy motif on a grounded route', () => {
    const fixtureElements = [
      ...appendTerminalFixture(
        2,
        'motif-tab-2',
        { left: 100, top: 20, width: 80, height: 30 },
        { left: 100, top: 100, width: 300, height: 180 }
      ),
      ...appendTerminalFixture(
        5,
        'motif-tab-5',
        { left: 400, top: 20, width: 80, height: 30 },
        { left: 800, top: 100, width: 300, height: 180 }
      )
    ]

    act(() => {
      useA2AStore.getState().addTrace({
        id: 'motif-proof',
        from: '@2',
        to: '@5',
        type: 'send',
        text: 'directed motif'
      })
    })

    const { container } = render(<A2AConnectionOverlay />)
    expect(container.querySelector('.a2a-link-beam-flow')?.getAttribute('stroke-width')).toBe('4.5')
    expect(container.querySelector('.a2a-direction-carrier')).toBeDefined()
    expect(container.querySelector('[class*="a2a-connection-effects-"]')).toBeDefined()

    // Motif gradient and stroke mapping verification
    const beamGroup = container.querySelector('.a2a-link-beam')
    expect(beamGroup?.getAttribute('class')).toMatch(
      /a2a-link-beam-(flame|foliage|chain|water|tornado)/
    )
    const beamFlow = container.querySelector('.a2a-link-beam-flow')
    expect(beamFlow?.getAttribute('stroke')).toMatch(
      /url\(#a2a-beam-gradient-(flame|foliage|chain|water|tornado)\)/
    )

    fixtureElements.forEach((element) => document.body.removeChild(element))
  })

  it('correctly maps explicit motif tag to theme colors and gradients', () => {
    const fixtureElements = [
      ...appendTerminalFixture(
        2,
        'motif-flame-tab-2',
        { left: 100, top: 20, width: 80, height: 30 },
        { left: 100, top: 100, width: 300, height: 180 }
      ),
      ...appendTerminalFixture(
        5,
        'motif-flame-tab-5',
        { left: 400, top: 20, width: 80, height: 30 },
        { left: 800, top: 100, width: 300, height: 180 }
      )
    ]

    act(() => {
      useA2AStore.getState().addTrace({
        id: 'flame-proof',
        from: '@2',
        to: '@5',
        type: 'send',
        text: 'motif:flame 烈焰測試'
      })
    })

    const { container } = render(<A2AConnectionOverlay />)
    const beamGroup = container.querySelector('.a2a-link-beam')
    expect(beamGroup?.getAttribute('class')).toContain('a2a-link-beam-flame')
    const beamFlow = container.querySelector('.a2a-link-beam-flow')
    expect(beamFlow?.getAttribute('stroke')).toBe('url(#a2a-beam-gradient-flame)')
    expect(beamFlow?.getAttribute('marker-end')).toBe('url(#a2a-arrow-flame)')

    fixtureElements.forEach((element) => document.body.removeChild(element))
  })

  it('paints a signed general order in that general beam', () => {
    const fixtureElements = [
      ...appendTerminalFixture(
        2,
        'general-tab-2',
        { left: 100, top: 20, width: 80, height: 30 },
        { left: 100, top: 100, width: 300, height: 180 }
      ),
      ...appendTerminalFixture(
        5,
        'general-tab-5',
        { left: 400, top: 20, width: 80, height: 30 },
        { left: 800, top: 100, width: 300, height: 180 }
      )
    ]

    act(() => {
      useA2AStore.getState().addTrace({
        id: 'zhaoyun-order',
        from: '@2',
        to: '@5',
        type: 'message',
        text: '趙雲令：讀 order 並完整執行'
      })
    })

    const { container } = render(<A2AConnectionOverlay />)
    expect(container.querySelector('.a2a-link-beam')?.getAttribute('class')).toContain(
      'a2a-link-beam-moonlight'
    )
    expect(container.querySelector('.a2a-link-beam-flow')?.getAttribute('stroke')).toBe(
      'url(#a2a-beam-gradient-moonlight)'
    )
    expect(container.querySelector('.a2a-motif-moonlight-carrier')).not.toBeNull()

    fixtureElements.forEach((element) => document.body.removeChild(element))
  })

  it('paints every dispatch from a general terminal in that general beam', () => {
    const fixtureElements = [
      ...appendTerminalFixture(
        2,
        'machao-tab-2',
        { left: 100, top: 20, width: 80, height: 30 },
        { left: 100, top: 100, width: 300, height: 180 },
        '馬超 將軍'
      ),
      ...appendTerminalFixture(
        5,
        'machao-tab-5',
        { left: 400, top: 20, width: 80, height: 30 },
        { left: 800, top: 100, width: 300, height: 180 }
      )
    ]

    act(() => {
      useA2AStore.getState().addTrace({
        id: 'machao-dispatch',
        from: '@2',
        to: '@5',
        type: 'send',
        text: 'npm test'
      })
    })

    const { container } = render(<A2AConnectionOverlay />)
    expect(container.querySelector('.a2a-link-beam')?.getAttribute('class')).toContain(
      'a2a-link-beam-gold'
    )
    expect(container.querySelector('.a2a-motif-gold-carrier')).not.toBeNull()

    fixtureElements.forEach((element) => document.body.removeChild(element))
  })

  it('ignores tab badges and menu entries and anchors to the visible CLI pane center', () => {
    const menuEntry = document.createElement('div')
    menuEntry.setAttribute('data-a2a-test-menu-entry', '')
    menuEntry.setAttribute('data-terminal-index', '2')
    setRect(menuEntry, { left: 1600, top: 20, width: 120, height: 30 })
    document.body.appendChild(menuEntry)

    const hiddenWorkspace = document.createElement('div')
    hiddenWorkspace.setAttribute('aria-hidden', 'true')
    hiddenWorkspace.setAttribute('data-a2a-test-fixture', '')
    const hiddenTab = document.createElement('div')
    hiddenTab.setAttribute('data-tab-id', 'hidden-tab-2')
    hiddenTab.setAttribute('data-tab-title', 'Hidden Agent 2')
    hiddenTab.setAttribute('data-terminal-index', '2')
    setRect(hiddenTab, { left: 10, top: 10, width: 80, height: 30 })
    const hiddenPane = document.createElement('div')
    hiddenPane.setAttribute('data-terminal-tab-id', 'hidden-tab-2')
    setRect(hiddenPane, { left: 10, top: 10, width: 1200, height: 800 })
    hiddenWorkspace.append(hiddenTab, hiddenPane)
    document.body.appendChild(hiddenWorkspace)

    const fixtureElements = [
      ...appendTerminalFixture(
        2,
        'tab-2',
        { left: 100, top: 20, width: 80, height: 30 },
        { left: 140, top: 80, width: 240, height: 160 }
      ),
      ...appendTerminalFixture(
        5,
        'tab-5',
        { left: 400, top: 20, width: 80, height: 30 },
        { left: 760, top: 220, width: 240, height: 160 }
      )
    ]

    act(() => {
      useA2AStore.getState().addTrace({ from: '@2', to: '@5', text: 'real route' })
    })

    const { container } = render(<A2AConnectionOverlay />)
    const beamPath = container.querySelector('.a2a-link-beam .a2a-link-beam-flow')
    expect(beamPath?.getAttribute('d')).toMatch(/^M 260 160 /)
    expect(beamPath?.getAttribute('d')).toMatch(/ 880 300$/)

    fixtureElements.forEach((element) => document.body.removeChild(element))
  })

  it('re-measures the source and target centers after a pane layout change', () => {
    const [tab2, pane2] = appendTerminalFixture(
      2,
      'tab-2',
      { left: 100, top: 20, width: 80, height: 30 },
      { left: 100, top: 100, width: 240, height: 160 }
    )
    const [tab5, pane5] = appendTerminalFixture(
      5,
      'tab-5',
      { left: 400, top: 20, width: 80, height: 30 },
      { left: 700, top: 100, width: 240, height: 160 }
    )

    act(() => {
      useA2AStore.getState().addTrace({ from: '@2', to: '@5', text: 'reflow' })
    })

    const { container } = render(<A2AConnectionOverlay />)
    const getBeamPath = () => container.querySelector('.a2a-link-beam .a2a-link-beam-flow')
    expect(getBeamPath()?.getAttribute('d')).toContain('M 220 180')

    setRect(pane2, { left: 300, top: 240, width: 200, height: 120 })
    setRect(pane5, { left: 900, top: 40, width: 200, height: 120 })
    act(() => {
      fireEvent.resize(window)
    })

    expect(getBeamPath()?.getAttribute('d')).toMatch(/^M 400 300 /)
    expect(getBeamPath()?.getAttribute('d')).toMatch(/ 1000 100$/)

    document.body.removeChild(tab2)
    document.body.removeChild(pane2)
    document.body.removeChild(tab5)
    document.body.removeChild(pane5)
  })

  it('prevents phantom beams to empty space when target terminal is not in DOM (Zero Phantom Beam)', () => {
    // Only #1 is in DOM, #8 does NOT exist.
    const [tab1, pane1] = appendTerminalFixture(
      1,
      'tab-1',
      { left: 50, top: 20, width: 80, height: 30 },
      { left: 50, top: 80, width: 260, height: 160 }
    )

    act(() => {
      useA2AStore.getState().addTrace({
        from: '@1',
        to: '@8',
        type: 'send',
        text: 'test empty target'
      })
    })

    const { container } = render(<A2AConnectionOverlay />)
    // Beams must NOT be drawn to empty space
    expect(container.querySelector('.a2a-link-beam')).toBeNull()

    // Localized indicator should still be present near #1
    expect(screen.getByText('#1')).toBeDefined()
    expect(screen.getByText('#8')).toBeDefined()

    document.body.removeChild(tab1)
    document.body.removeChild(pane1)
  })

  it('renders loopback arc and beam for single-terminal self-link', () => {
    const [tab1, pane1] = appendTerminalFixture(
      1,
      'tab-1',
      { left: 50, top: 20, width: 80, height: 30 },
      { left: 50, top: 80, width: 260, height: 160 }
    )

    act(() => {
      useA2AStore.getState().addTrace({
        from: '@1',
        to: '@1',
        type: 'send',
        text: 'echo A2A Beam Test'
      })
    })

    const { container } = render(<A2AConnectionOverlay />)
    const beam = container.querySelector('.a2a-link-beam')
    expect(beam).not.toBeNull()

    const beamFlow = container.querySelector('.a2a-link-beam .a2a-link-beam-flow')
    expect(beamFlow?.getAttribute('d')).toContain('M 150 150 Q 180 40 210 150')

    document.body.removeChild(tab1)
    document.body.removeChild(pane1)
  })

  it('allows dismissing an active trace via close button', () => {
    const [tab2, pane2] = appendTerminalFixture(
      2,
      'tab-2',
      { left: 100, top: 20, width: 80, height: 30 },
      { left: 100, top: 80, width: 260, height: 160 }
    )

    let traceId = ''
    act(() => {
      const trace = useA2AStore.getState().addTrace({
        from: '@2',
        to: '@8',
        type: 'message',
        text: 'review please'
      })
      traceId = trace.id
    })

    expect(traceId).toBeTruthy()
    render(<A2AConnectionOverlay />)
    expect(useA2AStore.getState().activeLinks).toHaveLength(1)

    const dismissBtn = screen.getByLabelText('Dismiss trace')
    fireEvent.click(dismissBtn)

    expect(useA2AStore.getState().activeLinks).toHaveLength(0)

    document.body.removeChild(tab2)
    document.body.removeChild(pane2)
  })

  it('toggles HUD and can trigger test traces', () => {
    render(<A2AConnectionOverlay />)

    // Initially no traces, trigger button shouldn't show
    expect(screen.queryByTestId('a2a-hud-trigger')).toBeNull()

    act(() => {
      useA2AStore.getState().addTrace({ from: '@1', to: '@2' })
    })

    const triggerBtn = screen.getByTestId('a2a-hud-trigger')
    expect(triggerBtn).toBeDefined()

    fireEvent.click(triggerBtn)
    expect(screen.getByText('A2A 通訊軌跡 (Trace)')).toBeDefined()

    // Click demo #2 ➔ #5 button
    const demoBtn = screen.getByText('#2 ➔ #5')
    fireEvent.click(demoBtn)

    const state = useA2AStore.getState()
    expect(state.activeLinks.some((l) => l.fromIndex === 2 && l.toIndex === 5)).toBe(true)

    // Click Open Hub button
    const openHubBtn = screen.getByTitle('展開完整 A2A 調度中樞 (Grokbot Hub)')
    fireEvent.click(openHubBtn)
    expect(useA2AStore.getState().isHubOpen).toBe(true)
  })
})
