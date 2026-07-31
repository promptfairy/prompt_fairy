# 測試片段備忘

## 2026-07-31 混合人物／動作／場景／構圖片段

來源回饋：原胖譜包含背景、動作與視角時，混合長句仍可能落入「人物」。

代表片段：

```text
and a white wireless earbud. She casually holds a transparent cup of iced orange juice with a brown straw and a cute smiling face logo. Captured from a dramatic low-angle wide-angle perspective against a clear blue sky,
```

預期行為：

- `earbud` 可視為服裝配件訊號，但不得讓整段一律落入「人物」。
- `holds`、`cup`、`straw`、`juice` 應提供動作／持物訊號。
- `low-angle`、`wide-angle`、`perspective` 應優先歸為「構圖／鏡頭」。
- `clear blue sky` 應提供場景／背景訊號。
- 點擊後方分類標籤後，水平捲動位置應保留。