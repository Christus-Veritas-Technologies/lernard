/**
 * Custom webpack config for NestJS.
 * Ensures @lernard/* workspace packages are bundled into the output
 * rather than externalised — this avoids ESM file-extension issues at runtime.
 */
module.exports = (options, _webpack) => {
  return {
    ...options,
    externals: [
      (ctx, callback) => {
        const req = ctx.request

        // Bundle all @lernard/* workspace packages — do not externalise them.
        if (req && req.startsWith('@lernard/')) {
          return callback()
        }

        // Keep everything else external (default NestJS webpack behaviour —
        // avoids duplicating large packages like express in the bundle).
        callback(null, `commonjs ${req}`)
      },
    ],
  }
}
