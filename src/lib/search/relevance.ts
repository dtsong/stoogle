import searchRelevanceConfig from '../../../config/search-relevance.json'

export const SEARCH_RELEVANCE_CONFIG = {
  queryBy: searchRelevanceConfig.queryBy,
  queryByWeights: searchRelevanceConfig.queryByWeights,
  numTypos: searchRelevanceConfig.numTypos,
  typoTokensThreshold: searchRelevanceConfig.typoTokensThreshold,
} as const
