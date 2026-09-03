export {
	FURNITURE_CHOICES,
	FURNITURE_SHEET,
	FURNITURE_SHEETS,
	PEOPLE_SHEETS,
	PEOPLE_SHEET_IDS,
	PERSON_SLOT_IDS,
	PERSON_SLOT_LABELS,
	ROOM_LABELS,
	TILESETS,
	TILESET_IDS,
	TILE_ROLES,
	TILE_ROLE_LABELS,
	TINT_PRESETS,
	getFurnitureSheet,
	getPeopleSheet,
	getTileset,
	isFurnitureSheetId,
	isPeopleSheetId,
	isPersonSlotId,
	isTilesetId,
	sheetTileCount,
	styleMapToString,
	tileBackgroundStyle,
	type FurnitureSheetId,
	type PeopleSheetId,
	type PersonSlotId,
	type SheetSpec,
	type TileRole,
	type TilesetId,
	type TilesetSpec
} from './catalog';

export {
	STUDIO_EDITOR_STORAGE_KEY,
	emptyStudioEditorState,
	parseStudioEditorState,
	roomToDraft,
	type PersonLook,
	type RoomDraft,
	type StudioEditorState
} from './schema';

export {
	applyTileEdit,
	authoredDraft,
	cloneDraft,
	furnitureAt,
	furnitureSheetOf,
	groundSheetOf,
	listFloorKinds,
	listFurnitureKinds,
	listWallKinds,
	mergeDraftOntoRoom,
	recolorFloors,
	recolorFurniture,
	recolorWalls,
	roleAt,
	switchTileset,
	type FloorKind,
	type FurnitureKind,
	type GroundKind,
	type TileEdit,
	type WallKind
} from './draft';

export {
	clearStudioEditorState,
	loadStudioEditorState,
	persistStudioEditorState,
	resetPersonLook,
	resetRoomDraft,
	savePersonLook,
	saveRoomDraft
} from './storage';

export {
	clampPersonLook,
	defaultPersonLook,
	overlayClientLook,
	overlayStaffLook,
	resolvePersonLook,
	resolveRoomDraft,
	resolveRoomForPlay
} from './apply';
