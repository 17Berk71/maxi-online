// Asset content/version affects geometry, UVs and light preprocessing as well as colour.
// A pack with the same garment id can be replaced while the fitting room is open.
export function garmentAssetKey(item) {
  const source = JSON.stringify([item.assetRevision, item.tex, item.materialTexture, item.shape, item.fit, item.drape, item.photoLight, item.sizesT, item.digitization]);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
export const garmentKey = item => item.id + ':' + (item.state || '') + ':' + (item.size || '') + ':' + garmentAssetKey(item);
