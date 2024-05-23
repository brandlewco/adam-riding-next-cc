const withExportImages = require('next-export-optimize-images')

module.exports = withExportImages({
  output: 'export',
  reactStrictMode: true,
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.jsx$/,
      use: [
        {
          loader: 'import-glob-keyed'
        },
      ],
    })

    return config
  },
})