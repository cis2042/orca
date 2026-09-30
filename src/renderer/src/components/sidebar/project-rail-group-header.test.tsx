import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProjectNameList } from './project-rail-group-header'

describe('ProjectNameList', () => {
  it('lists every project name in the group', () => {
    const html = renderToStaticMarkup(<ProjectNameList names={['xagent.id', 'xhuman.id']} />)
    expect(html).toContain('xagent.id')
    expect(html).toContain('xhuman.id')
    expect(html).not.toContain('還有')
  })

  it('caps the list at eight names and reports the remainder', () => {
    const names = Array.from({ length: 11 }, (_, idx) => `project-${idx + 1}`)
    const html = renderToStaticMarkup(<ProjectNameList names={names} />)
    expect(html).toContain('project-8')
    expect(html).not.toContain('project-9')
    expect(html).toContain('還有 3 個')
  })

  it('renders nothing for an empty group', () => {
    expect(renderToStaticMarkup(<ProjectNameList names={[]} />)).toBe('')
  })
})
