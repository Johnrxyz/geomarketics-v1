export default {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // Keep all IDs — data-cell-id attributes are used for stall mapping
          cleanupIds: false,
          // Don't remove hidden elements — some stalls may toggle visibility
          removeHiddenElems: false,
          // Keep defs — used for clip paths in draw.io exports
          removeUselessDefs: false,
        },
      },
    },
    // Safe cleanup passes
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",
    "cleanupAttrs",
    "minifyStyles",
    "convertColors",
  ],
};
