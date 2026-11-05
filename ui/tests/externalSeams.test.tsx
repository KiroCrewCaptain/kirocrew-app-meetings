/**
 * What changed when the page left the dashboard: its own string catalogs, the
 * host's scoped client as the transport, local stand-ins for the dashboard
 * modules the App Kit does not publish, and the fallbacks for a host older than
 * App Kit level 1.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CATALOGS, localeChain, t } from '../src/i18n'
import { meetingsApi, setTransport } from '../src/api'
import { resolveRelativeImages } from '../src/host/MarkdownRenderer'
import { basePathOf, withBase } from '../src/host/basePath'
import { PCM_WORKLET_URL } from '../src/hooks/useMeetingTranscription'
import { stubLocale } from './stubs/app-sdk'

const SRC = join(__dirname, '..', 'src')

function sources(): Array<[string, string]> {
  const out: Array<[string, string]> = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (/\.tsx?$/.test(entry.name)) out.push([path.slice(SRC.length + 1), readFileSync(path, 'utf-8')])
    }
  }
  walk(SRC)
  return out
}

describe('the string catalogs', () => {
  const keysOf = (node: object, prefix = ''): string[] =>
    Object.entries(node).flatMap(([k, v]) =>
      typeof v === 'string' ? [prefix + k] : keysOf(v as object, `${prefix}${k}.`))

  it('carries every locale the dashboard ships', () => {
    expect(Object.keys(CATALOGS).sort()).toEqual(
      ['bn', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'zh-CN'],
    )
  })

  it('has every key the source names in English, and every locale keeps the English keys it translates', () => {
    const used = new Set<string>(['components.confirmDialog.cancel'])
    for (const [, text] of sources()) {
      for (const m of text.matchAll(/'(apps\.meetings\.[A-Za-z0-9_.]+)'/g)) used.add(m[1])
    }
    expect(used.size).toBeGreaterThan(150)
    const english = new Set(keysOf(CATALOGS.en))
    const missing = [...used].filter(key => !english.has(key) && !english.has(`${key}_other`))
    expect(missing).toEqual([])
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      // A locale may leave a string untranslated (it falls back to English), but
      // never carries a key English does not have.
      const stray = keysOf(catalog).filter(key => !english.has(key) && !/_(zero|one|two|few|many|other)$/.test(key))
      expect([locale, stray]).toEqual([locale, []])
    }
  })

  it('falls back from a regional locale to its base language, then English', () => {
    expect(localeChain('pt-BR')).toEqual(['pt', 'en'])
    expect(localeChain('xx')).toEqual(['en'])
  })

  it('picks the plural form the locale names', () => {
    stubLocale('en')
    expect(t('apps.meetings.list.synced', { count: 1 })).toBe('Synced 1 event')
    expect(t('apps.meetings.list.synced', { count: 3 })).toBe('Synced 3 events')
  })

  it('shows the key itself for a string no catalog has, and nothing for no key', () => {
    expect(t('apps.meetings.no_such_key')).toBe('apps.meetings.no_such_key')
    expect(t(undefined as unknown as string)).toBe('')
  })
})

describe('the transport', () => {
  it('sends every call through the scoped client the root hands it, under the app prefix', async () => {
    const raw = vi.fn(async () => new Response(JSON.stringify({ meetings: [] }), { status: 200 }))
    setTransport({ raw })
    try {
      await meetingsApi.meetings()
      await meetingsApi.config()
      expect(raw.mock.calls.map(([path]) => path)).toEqual([
        '/api/apps/meetings/meetings',
        // `/config` under an app's prefix is the gateway's own route, so the
        // app's settings live at `/settings`.
        '/api/apps/meetings/settings',
      ])
    } finally {
      setTransport(null)
    }
  })

  it("reads the backend's error and code back out of the scoped client's refusal", async () => {
    setTransport({
      raw: async () => {
        throw Object.assign(new Error('API 409'), {
          status: 409,
          body: JSON.stringify({
            error: 'another meeting is running',
            code: 'meeting_active',
            blocking_meeting_title: 'Standup',
            blocking_meeting_status: 'active',
          }),
        })
      },
    })
    try {
      await expect(meetingsApi.start('m2', {})).rejects.toMatchObject({
        name: 'MeetingsApiError',
        status: 409,
        code: 'meeting_active',
        message: 'another meeting is running',
        blockingMeetingTitle: 'Standup',
      })
    } finally {
      setTransport(null)
    }
  })

  it('names the status when the refusal body is not the JSON contract', async () => {
    setTransport({
      raw: async () => {
        throw Object.assign(new Error('API 502'), { status: 502, body: 'Bad Gateway' })
      },
    })
    try {
      await expect(meetingsApi.status()).rejects.toMatchObject({ status: 502, message: 'HTTP 502' })
    } finally {
      setTransport(null)
    }
  })

  it('passes a refusal that is not an HTTP answer through unchanged', async () => {
    const outside = new Error('path is outside this app’s permissions')
    setTransport({ raw: async () => { throw outside } })
    try {
      await expect(meetingsApi.meetings()).rejects.toBe(outside)
    } finally {
      setTransport(null)
    }
  })
})

describe('no private dashboard surface', () => {
  it('imports only the host modules, the two bundled libraries and its own files', () => {
    const allowed = new Set([
      'react',
      'react-dom',
      'lucide-react',
      '@tanstack/react-query',
      '@kirocrew/app-sdk',
      '@kirocrew/app-sdk/ui',
      'framer-motion',
      'react-virtuoso',
    ])
    for (const [name, text] of sources()) {
      for (const m of text.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)) {
        const spec = m[1]
        if (spec.startsWith('./') || spec.startsWith('../')) {
          // A relative import never climbs out of ui/src (or to the catalogs).
          const depth = name.split('/').length - 1
          const ups = spec.split('/').filter(part => part === '..').length
          expect([name, spec, ups <= depth || spec.startsWith('../i18n/') || spec.startsWith('../../i18n/')]).toEqual([name, spec, true])
          continue
        }
        expect([name, spec, allowed.has(spec)]).toEqual([name, spec, true])
      }
    }
  })

  it('names no dashboard-internal path', () => {
    for (const [name, text] of sources()) {
      expect([name, /from '[^']*(?:\/store\/|\/components\/ui'|react-redux|react-router)/.test(text)]).toEqual([name, false])
    }
  })
})

describe('local stand-ins', () => {
  it('resolves a note image against the note folder, and leaves URLs and absolute paths alone', () => {
    const note = '/data/apps/meetings/data/notes/m1/note.md'
    expect(resolveRelativeImages('![10:23](images/a.png)', note)).toBe(
      '![10:23](/data/apps/meetings/data/notes/m1/images/a.png)',
    )
    expect(resolveRelativeImages('![x](<images/b c.png>)', note)).toBe(
      '![x](</data/apps/meetings/data/notes/m1/images/b c.png>)',
    )
    expect(resolveRelativeImages('![x](https://cdn.example/x.png) ![y](/abs/y.png)', note)).toBe(
      '![x](https://cdn.example/x.png) ![y](/abs/y.png)',
    )
    expect(resolveRelativeImages('![w](images/w.png)', 'C:\\Users\\a\\notes\\m1\\note.md')).toBe(
      '![w](C:/Users/a/notes/m1/images/w.png)',
    )
  })

  it('reads the dashboard base from where the gateway served the bundle', () => {
    expect(basePathOf('http://h:6776/apps/meetings/ui/dist/index.mjs')).toBe('')
    expect(basePathOf('https://h/proxy/kc/apps/meetings/ui/dist/index.mjs')).toBe('/proxy/kc')
    expect(withBase('/vendor/mermaid.min.js', '/proxy/kc')).toBe('/proxy/kc/vendor/mermaid.min.js')
    expect(withBase('/proxy/kc/vendor/x.js', '/proxy/kc')).toBe('/proxy/kc/vendor/x.js')
    expect(withBase('/vendor/x.js', '')).toBe('/vendor/x.js')
  })

  it('loads the capture worklet from this app, beside its bundle', () => {
    expect(PCM_WORKLET_URL.endsWith('/pcm-worklet.js')).toBe(true)
    expect(PCM_WORKLET_URL).not.toContain('data:')
  })
})

describe('a host older than App Kit level 1', () => {
  it('falls back to a native select when the host has no Select', async () => {
    vi.resetModules()
    vi.doMock('@kirocrew/app-sdk/ui', async () => {
      const real = await vi.importActual<Record<string, unknown>>('./stubs/app-sdk-ui')
      const { Select: _gone, ...rest } = real
      return rest
    })
    try {
      const { default: SimpleSelect } = await import('../src/host/SimpleSelect')
      const onChange = vi.fn()
      render(
        <SimpleSelect options={['a', 'b']} optionLabels={['Alpha', 'Beta']} value="a" onChange={onChange} aria-label="Pick" />,
      )
      const select = screen.getByLabelText('Pick') as HTMLSelectElement
      expect(select.tagName).toBe('SELECT')
      expect(select.hasAttribute('data-host-select')).toBe(false)
      fireEvent.change(select, { target: { value: 'b' } })
      expect(onChange).toHaveBeenCalledWith('b')
    } finally {
      vi.doUnmock('@kirocrew/app-sdk/ui')
      vi.resetModules()
    }
  })
})
