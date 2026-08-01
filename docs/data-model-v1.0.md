# 胖譜小精靈 Data Model v1.0

## 目的

本文件定義第一版胖譜小精靈需要保存的本機資料模型。

第一版採 local-first：

- 人物設定、材料庫、胖譜庫、圖片索引、版本紀錄與設定預設保存在使用者裝置。
- 圖片檔案只作 app 內顯示與版本紀錄，不自動上傳。
- 不保存 API key 或遠端生成連線資訊。

本文件先描述資料結構與欄位意義，不綁定特定資料庫。實作可使用 IndexedDB、localForage、Dexie 或其他 PWA 本機儲存方案。

## 命名原則

- 每筆資料都有 `id`。
- 每筆主要資料都有 `createdAt`、`updatedAt`。
- 刪除預設採 `archivedAt` 軟刪除，避免誤刪。
- 圖片以 `assetId` 關聯，不直接塞進主要物件。
- prompt 相關文字保留原文與輸出版本。

## 主要集合

```text
settings
characters
characterImports
materials
promptEntries
promptVersions
assets
tags
activityLogs
```

## Settings

全域設定，只保留一份。

```ts
type AppSettings = {
  id: "default";
  privacyMode: "local" | "sprite" | "ask_each_time";
  defaultProvider: "openai" | "gemini" | null;
  sendConfirmation: {
    enabled: boolean;
    neverSendImages: boolean;
    neverSendHistory: boolean;
  };
  defaultOutput: {
    includeFaceReference: boolean;
    generationMode: "recast" | "only_selected";
    writingHabit: "minimal" | "write_filled" | "ask_each_time";
    outputLanguage: "zh_explanation_en_prompt" | "en_prompt_only";
  };
  aliasStyle: {
    format: "bracket_letters";
    sequence: string[]; // ["AA", "BB", "CC"]
  };
  createdAt: string;
  updatedAt: string;
};
```

欄位說明：

- `privacyMode`
  - `local`：不連 AI。
  - `sprite`：可把這次選中的文字送去 AI。
  - `ask_each_time`：每次送出前確認。
- `aliasStyle` 只表示偏好代稱格式，不綁定角色。

## Character

人物設定只保存角色本人，不固定綁定 `[AA]`、`[BB]`。

```ts
type Character = {
  id: string;
  name: string;
  avatarAssetId?: string;
  notes?: string;
  impression?: string;
  writingHabit: "minimal" | "write_filled" | "ask_each_time";
  faceReference: {
    enabled: boolean;
    presetId?: string;
    customTextZh?: string;
    customTextEn?: string;
    outputPosition: "prefix" | "none";
  };
  appearance: {
    hairColor?: string;
    hairstyle?: string;
    eyes?: string;
    heightBody?: string;
    makeup?: string;
    glassesOrDefaultWear?: string;
  };
  appearanceWritePolicy: {
    hairColor?: WritePolicy;
    hairstyle?: WritePolicy;
    eyes?: WritePolicy;
    heightBody?: WritePolicy;
    makeup?: WritePolicy;
    glassesOrDefaultWear?: WritePolicy;
  };
  fixtures: Fixture[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

type WritePolicy = "minimal" | "write" | "ask";
```

欄位說明：

- `writingHabit`
  - `minimal`：少寫一點，交給參考圖。
  - `write_filled`：照我填的寫。
  - `ask_each_time`：這次再問我。
- `appearanceWritePolicy` 是進階覆寫；沒有設定時沿用 `writingHabit`。
- `faceReference` 中英文都可存，但第一版實際輸出預設使用英文。

## Fixture

固定標記與配件。只存「是什麼、在哪裡、重不重要」，不存 visible / partial / hidden 的完整生成語句。

```ts
type Fixture = {
  id: string;
  type:
    | "tattoo"
    | "mole"
    | "tear_mole"
    | "scar"
    | "earring"
    | "glasses"
    | "ring"
    | "watch"
    | "bracelet"
    | "necklace"
    | "other";
  name: string;
  bodySlot?: string;
  side?: "left" | "right" | "both" | "center" | "unknown";
  importance: "signature" | "standard" | "optional";
  defaultVisibilityIntent: "show" | "can_hide" | "contextual";
  note?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};
```

範例：

```json
{
  "id": "fx_001",
  "type": "tattoo",
  "name": "左鎖骨太陽刺青",
  "bodySlot": "collarbone_left",
  "side": "left",
  "importance": "signature",
  "defaultVisibilityIntent": "contextual"
}
```

## Character Import

從舊胖譜匯入人物設定時的暫存草稿。

```ts
type CharacterImport = {
  id: string;
  sourcePrompt: string;
  providerUsed?: "openai" | "gemini" | "local";
  extracted: {
    suggestedSave: ExtractedField[];
    maybeOneOff: ExtractedField[];
    notRecommended: ExtractedField[];
  };
  status: "draft" | "applied" | "discarded";
  createdCharacterId?: string;
  createdAt: string;
  updatedAt: string;
};

type ExtractedField = {
  key: string;
  label: string;
  value: string;
  reason?: string;
  selected: boolean;
};
```

## Phrase Card

材料庫中的材料卡。存 prompt 片段，不存完整胖譜。

```ts
type Material = {
  id: string;
  name: string;
  category:
    | "face_reference"
    | "style_filter"
    | "lighting"
    | "character_quality"
    | "negative"
    | "restriction"
    | "enhancement"
    | "tool_specific";
  content: string;
  descriptionZh?: string;
  useCase?: string;
  applicableProviders: ("openai" | "gemini")[] | ["all"];
  isFavorite: boolean;
  defaultEnabled: boolean;
  conflictHints?: ConflictHint[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

type ConflictHint = {
  keyword: string;
  message: string;
  severity: "info" | "warning" | "risk";
};
```

## Prompt Entry

胖譜庫中的完整 prompt 收藏。

```ts
type PromptEntry = {
  id: string;
  title: string;
  sourcePrompt: string;
  sourceUrl?: string;
  sourcePlatform?: "threads" | "instagram" | "manual" | "other";
  outputFormat: "natural_language";
  status: "unused" | "used" | "retry";
  coverAssetId?: string;
  demoAssetIds: string[];
  tagIds: string[];
  peopleCount?: "single" | "couple" | "group" | "unknown";
  notes?: string;
  starred: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};
```

欄位說明：

- `sourcePrompt` 保存原始胖譜。
- `outputFormat` 第一版固定為自然語句 Prompt。
- `coverAssetId` 是胖譜列表封面。
- `demoAssetIds` 是示範圖，不自動送 AI。

## Prompt Version

胖譜版本紀錄。每次從調製台生成或修修胖譜後都可產生一筆版本。

```ts
type PromptVersion = {
  id: string;
  promptEntryId?: string;
  parentVersionId?: string;
  versionLabel: string; // V1, V2, V3
  promptText: string;
  explanation?: string;
  notes?: string;
  provider: "openai" | "gemini" | null;
  generationMode: "recast" | "only_selected" | "series" | "repair";
  characterAssignments: CharacterAssignment[];
  appliedMaterialIds: string[];
  resultAssetIds: string[];
  userFeedback?: {
    problemText?: string;
    desiredChange?: string;
    satisfaction?: "liked" | "okay" | "bad";
  };
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

type CharacterAssignment = {
  characterId: string;
  alias: "AA" | "BB" | "CC" | string;
  roleIndex: number;
};
```

欄位說明：

- `parentVersionId` 用來形成 V1 -> V2 -> V3 的版本鏈。
- `generationMode: "repair"` 用於修修胖譜。
- `resultAssetIds` 保存生成結果圖，本機紀錄用。

## Asset

圖片與本機檔案索引。

```ts
type Asset = {
  id: string;
  kind:
    | "character_avatar"
    | "prompt_cover"
    | "demo_image"
    | "result_image"
    | "sprite_avatar"
    | "other";
  fileName?: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  storageKey: string;
  localOnly: true;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};
```

欄位說明：

- `storageKey` 指向 IndexedDB / Cache Storage / File System Access API 中的實際 blob。
- 第一版所有 asset 都是 `localOnly: true`。
- 不保存遠端圖片 URL 作為主要圖片來源，除非使用者明確紀錄來源。

## Tag

標籤供胖譜庫與未來搜尋使用。

```ts
type Tag = {
  id: string;
  name: string;
  category:
    | "style"
    | "scene"
    | "status"
    | "people"
    | "tool"
    | "custom";
  color?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};
```

預設標籤建議：

- 單人、雙人、多人。
- 情侶、日系、海邊、室內、寫實。
- 需要參考圖、有指定服裝、有指定背景。
- 已捏、未捏、想重捏。

## API Connection

本機保存的 API 連線設定。

```ts
type ApiConnection = {
  id: string;
  provider: "openai" | "gemini";
  displayName: string;
  apiKeyStorageRef: string;
  defaultModel?: string;
  status: "untested" | "connected" | "failed";
  lastTestedAt?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};
```

安全原則：

- 實作時使用瀏覽器本機儲存能力。
- 不建立或保存任何遠端生成憑證。
- JSON 備份只包含 Prompt Fairy 的本機館藏、設定與規則資料。

## Activity Log

輕量本機操作紀錄，用於最近使用與除錯，不送伺服器。

```ts
type ActivityLog = {
  id: string;
  type:
    | "prompt_parsed"
    | "prompt_generated"
    | "prompt_saved"
    | "character_created"
    | "phrase_applied"
    | "version_repaired"
    | "api_tested";
  entityId?: string;
  entityType?: "promptEntry" | "promptVersion" | "character" | "phraseCard" | "apiConnection";
  message?: string;
  createdAt: string;
};
```

第一版可選做；不是必要核心功能。

## Send Payload Preview

送出前確認畫面所需的暫時計算資料，不一定保存。

```ts
type SendPayloadPreview = {
  provider: "openai" | "gemini";
  willSend: {
    sourcePrompt: boolean;
    selectedCharacterSummaries: boolean;
    appliedPhrases: boolean;
    userRepairText?: boolean;
  };
  willNotSend: {
    characterAvatars: true;
    promptHistory: true;
    unselectedData: true;
    imagesByDefault: true;
  };
  textPreview: string;
};
```

## 第一版資料邊界

第一版保存：

- 人物設定。
- 固定標記與配件。
- 材料卡。
- 完整胖譜收藏。
- 胖譜版本。
- 本機圖片。
- 標籤。
- 設定。
- 本機規則包資訊。

第一版不保存或不處理：

- 雲端帳號。
- 多裝置同步狀態。
- 社群分享權限。
- 自動抓 Threads 結果。
- 圖片 AI 分析結果。
- Midjourney / Niji 參數資料。

## 備份策略 v1

JSON 匯出第一版應包含：

- settings。
- characters。
- materials。
- promptEntries。
- promptVersions。
- tags。

JSON 匯出預設不包含圖片 blob。

圖片備份第一版可暫緩，或提供「匯出資料不含圖片」提示。

第二階段再考慮：

- 加密備份。
- 圖片打包匯出。
- 跨裝置同步。
