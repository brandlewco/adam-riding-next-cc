module.exports = {
  output: 'export',
  images: {
    loader: "custom",
    imageSizes: [480,768,1280,2048]
  },
  transpilePackages: ["next-image-export-optimizer"],
  env: {
    nextImageExportOptimizer_imageFolderPath: "public/uploads",
    nextImageExportOptimizer_exportFolderPath: "out",
    nextImageExportOptimizer_quality: "75",
    nextImageExportOptimizer_storePicturesInWEBP: "true",
    nextImageExportOptimizer_exportFolderName: "opt",

    // If you do not want to use blurry placeholder images, then you can set
    // nextImageExportOptimizer_generateAndUseBlurImages to false and pass
    // `placeholder="empty"` to all <ExportedImage> components.
    nextImageExportOptimizer_generateAndUseBlurImages: "true",

    // If you want to cache the remote images, you can set the time to live of the cache in seconds.
    // The default value is 0 seconds.
    nextImageExportOptimizer_remoteImageCacheTTL: "0",
  },
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
}