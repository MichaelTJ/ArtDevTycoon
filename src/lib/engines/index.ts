export { EngineManager, type EngineManagerDeps } from './manager';
export { ENGINE_REGISTRY, type EngineDescriptor } from './registry';
export { detectCapability, meetsRequirements } from './capability';
export { EngineError, toEngineError } from './errors';
export {
	buildKeywordQuestion,
	buildReviewPrompt,
	parseYesNo,
	accuracyFromHits,
	buildTitle,
	cleanReview
} from './critiqueProtocol';
