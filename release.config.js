const headerPattern =
  /^(?:(?:[\u2300-\u23FF]|[\u2B05-\u2B07]|[\u2194-\u2199]|[\u2700-\u27BF]|[\u1F000-\u1F9FF]|[\u1F600-\u1F64F]|[\u1F680-\u1F6FF]|[\u1F300-\u1F5FF])\s)?(\w+)(?:\(([\w$.\-* ]+)\))?: (.*)$/; // NOSONAR

module.exports = {
  branches: ['master'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'angular',
        releaseRules: [
          { breaking: true, release: 'major' },
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'revert', release: 'patch' },
        ],
        parserOpts: { headerPattern, headerCorrespondence: ['type', 'scope', 'subject'] },
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      { preset: 'angular', parserOpts: { headerPattern, headerCorrespondence: ['type', 'scope', 'subject'] } },
    ],
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: false }],
    ['@semantic-release/exec', { prepareCmd: 'pnpm build && tar -czf objecter.tar.gz -C dist .' }],
    ['@semantic-release/npm', { pkgRoot: 'dist' }],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    ['@semantic-release/github', { assets: [{ path: 'objecter.tar.gz', label: 'Distribution' }] }],
  ],
};
