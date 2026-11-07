import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findAuditPages } from '../src/bin/check-dist-no-audit.js'

let dist: string
const write = (rel: string) => {
  mkdirSync(dirname(join(dist, rel)), { recursive: true })
  writeFileSync(join(dist, rel), '')
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'dist-audit-'))
})
afterEach(() => rmSync(dist, { recursive: true, force: true }))

describe('findAuditPages', () => {
  it('finds nothing in a site without audit material', () => {
    write('index.html')
    write('guide/auditing-your-code.html')
    write('assets/app.js')
    expect(findAuditPages(dist)).toEqual([])
  })

  it('finds an audit directory (without descending) and audit files, at any depth, case-insensitively', () => {
    write('audit/index.html')
    write('audit/deep/x.html')
    write('guide/security-audit.html')
    write('guide/Audit.html')
    write('a/b/audit.report.html')
    write('a/b/the_audit_2026.html')
    expect(findAuditPages(dist).sort()).toEqual(['a/b/audit.report.html', 'a/b/the_audit_2026.html', 'audit', 'guide/Audit.html', 'guide/security-audit.html'])
  })

  it('throws when the directory does not exist', () => {
    expect(() => findAuditPages(join(dist, 'missing'))).toThrow()
  })
})
