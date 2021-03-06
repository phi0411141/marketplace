import { Publication } from './Publication.model'
import { Asset } from '../Asset'
import { PUBLICATION_ASSET_TYPES } from '../shared/publication'

// TODO: We might want to forgo of this class in favour of a better abstraction
export class PublicationService {
  constructor() {
    this.Publication = Publication
  }

  getPublicableAsset(assetType) {
    if (!this.Publication.isValidAssetType(assetType)) {
      throw new Error(`Invalid publication asset_type "${assetType}"`)
    }

    return Asset.getModel(assetType)
  }

  getPublicableAssets() {
    const publicableAssets = {}

    for (const key in PUBLICATION_ASSET_TYPES) {
      publicableAssets[key] = Asset.getModel(key)
    }

    return Object.values(publicableAssets)
  }
}
