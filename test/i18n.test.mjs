/**
 * i18n smoke test for the browser bundle (node --test test/i18n.test.mjs).
 *
 * Loads lib/client.js in a VM sandbox (like the runtime does), grabs the
 * __i18n seam and asserts: English is the default in a no-navigator
 * environment, zh strings are reachable, the host's { active } snapshot
 * field is honored, and {param} interpolation works.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

let captured = null
const sandbox = {
  window: {
    __ModuleLoader__: {
      load({ factory }) { captured = factory(() => ({})) },
    },
  },
}
vm.createContext(sandbox)
vm.runInContext(code, sandbox)

test('dsh-history client i18n: English default, zh switch, host locale, interpolation', () => {
  assert.ok(captured && captured.__i18n, 'bundle must export the __i18n seam')
  const { t, setLang, syncHostLocale } = captured.__i18n

  // No navigator in the VM → English is the default.
  assert.equal(t('badgeAria'), 'My messages')
  assert.equal(t('badge', { count: 3 }), 'My messages (3)')

  // zh strings are reachable and interpolation works there too.
  setLang('zh')
  assert.equal(t('badgeAria'), '我的消息')
  assert.equal(t('badge', { count: 3 }), '我的消息 (3)')
  setLang('en')

  // The host's snapshot shape is { active, locales, revision }.
  syncHostLocale({ locale: { snapshot: () => ({ active: 'zh-CN', revision: 1 }) } })
  assert.equal(t('badgeAria'), '我的消息')
  syncHostLocale({ locale: { snapshot: () => ({ active: 'en-US', revision: 2 }) } })
  assert.equal(t('badgeAria'), 'My messages')
  // Unknown / absent locale does not wedge the language.
  syncHostLocale({ locale: { snapshot: () => ({}) } })
  assert.equal(t('badgeAria'), 'My messages')
})
