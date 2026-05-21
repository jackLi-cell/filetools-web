"use client"

import { ServerToolBase } from "./server-tool-base"

export function PdfToImageTool() {
  return <ServerToolBase
    toolSlug="pdf-to-image"
    accept="application/pdf"
    maxSizeMb={30}
    creditsCost={1}
    acceptHint="支持 PDF 文件，自动导出全部页面"
    paramsSchema={[
      { name: "format", label: "图片格式", type: "select", default: "png", options: [
        { value: "png", label: "PNG" },
        { value: "jpg", label: "JPG" },
      ]},
      { name: "dpi", label: "清晰度 DPI", type: "select", default: "150", options: [
        { value: "150", label: "150 DPI（推荐）" },
        { value: "200", label: "200 DPI" },
        { value: "300", label: "300 DPI（更清晰）" },
      ]},
    ]}
  />
}

export function ImageToPdfTool() {
  return <ServerToolBase toolSlug="image-to-pdf" accept="image/*" maxSizeMb={30} maxFiles={20} creditsCost={1} acceptHint="支持 1-20 张图片，每张最大 30MB" />
}

export function PdfMergeTool() {
  return <ServerToolBase toolSlug="pdf-merge" accept="application/pdf" maxSizeMb={50} maxFiles={20} creditsCost={1} acceptHint="支持 2-20 个 PDF 文件，每个最大 50MB" />
}

export function PdfSplitTool() {
  return <ServerToolBase
    toolSlug="pdf-split"
    accept="application/pdf"
    maxSizeMb={50}
    creditsCost={1}
    paramsSchema={[
      { name: "splitMode", label: "拆分方式", type: "select", default: "range", options: [
        { value: "range", label: "提取页码范围为一个 PDF" },
        { value: "each", label: "每页拆成独立 PDF（ZIP 下载）" },
      ]},
      { name: "startPage", label: "起始页", type: "number", default: 1, min: 1 },
      { name: "endPage", label: "结束页", type: "number", default: 1, min: 1 },
    ]}
  />
}

export function PdfCompressTool() {
  return <ServerToolBase
    toolSlug="pdf-compress"
    accept="application/pdf"
    maxSizeMb={50}
    creditsCost={2}
    acceptHint="支持 PDF 文件"
    paramsSchema={[
      { name: "quality", label: "压缩档位", type: "select", default: "ebook", options: [
        { value: "screen", label: "最小体积（72dpi，适合屏幕浏览）" },
        { value: "ebook", label: "平衡（150dpi，推荐）" },
        { value: "printer", label: "高质量（300dpi，适合打印）" },
      ]},
    ]}
  />
}

export function VideoCompressTool() {
  return <ServerToolBase
    toolSlug="video-compress"
    accept="video/*"
    maxSizeMb={500}
    creditsCost={5}
    paramsSchema={[
      { name: "preset", label: "压缩预设", type: "select", default: "balanced", options: [
        { value: "wechat", label: "微信发送（≤25MB）" },
        { value: "email", label: "邮件附件（≤10MB）" },
        { value: "balanced", label: "平衡（CRF 28）" },
        { value: "quality", label: "高质量（CRF 23）" },
        { value: "custom", label: "自定义 CRF" },
      ]},
      { name: "crf", label: "自定义 CRF（18-35，越小越高）", type: "number", default: 28, min: 18, max: 35 },
      { name: "resolution", label: "分辨率", type: "select", default: "original", options: [
        { value: "original", label: "保持原始" },
        { value: "1080p", label: "1080p (1920x1080)" },
        { value: "720p", label: "720p (1280x720)" },
        { value: "480p", label: "480p (854x480)" },
      ]},
    ]}
    acceptHint="支持 MP4、MOV、WebM 等"
  />
}

export function VideoConvertTool() {
  return <ServerToolBase
    toolSlug="video-convert"
    accept="video/*"
    maxSizeMb={500}
    creditsCost={5}
    paramsSchema={[
      { name: "format", label: "目标格式", type: "select", default: "mp4", options: [
        { value: "mp4", label: "MP4" },
        { value: "webm", label: "WebM" },
        { value: "mov", label: "MOV" },
        { value: "avi", label: "AVI" },
      ]},
      { name: "resolution", label: "分辨率", type: "select", default: "original", options: [
        { value: "original", label: "保持原始" },
        { value: "1080p", label: "1080p" },
        { value: "720p", label: "720p" },
        { value: "480p", label: "480p" },
      ]},
    ]}
  />
}

export function VideoToGifTool() {
  return <ServerToolBase
    toolSlug="video-to-gif"
    accept="video/*"
    maxSizeMb={100}
    creditsCost={3}
    paramsSchema={[
      { name: "startTime", label: "起始时间（秒）", type: "number", default: 0, min: 0 },
      { name: "duration", label: "持续时长（秒）", type: "number", default: 5, min: 1, max: 30 },
      { name: "fps", label: "帧率", type: "select", default: "10", options: [
        { value: "5", label: "5 fps（最小体积）" },
        { value: "10", label: "10 fps（推荐）" },
        { value: "15", label: "15 fps（流畅）" },
        { value: "24", label: "24 fps（高质量）" },
      ]},
      { name: "width", label: "宽度（px）", type: "select", default: "480", options: [
        { value: "320", label: "320px（小）" },
        { value: "480", label: "480px（中）" },
        { value: "640", label: "640px（大）" },
        { value: "original", label: "原始宽度" },
      ]},
      { name: "loop", label: "循环次数", type: "select", default: "0", options: [
        { value: "0", label: "无限循环" },
        { value: "1", label: "播放 1 次" },
        { value: "3", label: "播放 3 次" },
      ]},
    ]}
    acceptHint="支持 MP4、MOV、WebM，建议片段不超过 30 秒"
  />
}

export function VideoExtractAudioTool() {
  return <ServerToolBase toolSlug="video-extract-audio" accept="video/*" maxSizeMb={500} creditsCost={2} />
}

export function AudioConvertTool() {
  return <ServerToolBase
    toolSlug="audio-convert"
    accept="audio/*"
    maxSizeMb={100}
    creditsCost={3}
    paramsSchema={[
      { name: "format", label: "目标格式", type: "select", default: "mp3", options: [
        { value: "mp3", label: "MP3" },
        { value: "wav", label: "WAV" },
        { value: "flac", label: "FLAC" },
        { value: "aac", label: "AAC" },
        { value: "ogg", label: "OGG" },
      ]},
    ]}
  />
}

export function AudioCompressTool() {
  return <ServerToolBase
    toolSlug="audio-compress"
    accept="audio/*"
    maxSizeMb={100}
    creditsCost={2}
    paramsSchema={[
      { name: "bitrate", label: "比特率", type: "select", default: "128k", options: [
        { value: "64k", label: "64 kbps（最小）" },
        { value: "96k", label: "96 kbps" },
        { value: "128k", label: "128 kbps（推荐）" },
        { value: "192k", label: "192 kbps" },
        { value: "256k", label: "256 kbps（高质量）" },
      ]},
    ]}
  />
}

export function AudioTrimTool() {
  return <ServerToolBase
    toolSlug="audio-trim"
    accept="audio/*"
    maxSizeMb={100}
    creditsCost={2}
    paramsSchema={[
      { name: "start", label: "起始时间（秒）", type: "number", default: 0, min: 0 },
      { name: "duration", label: "持续时长（秒）", type: "number", default: 30, min: 1 },
      { name: "fadeIn", label: "淡入时长（秒）", type: "number", default: 0, min: 0, max: 10 },
      { name: "fadeOut", label: "淡出时长（秒）", type: "number", default: 0, min: 0, max: 10 },
    ]}
  />
}

export function AudioMergeTool() {
  return <ServerToolBase toolSlug="audio-merge" accept="audio/*" maxSizeMb={100} creditsCost={2} />
}

export function ImageWatermarkTool() {
  return <ServerToolBase
    toolSlug="image-watermark"
    accept="image/*"
    maxSizeMb={30}
    creditsCost={2}
    paramsSchema={[
      { name: "text", label: "水印文字", type: "text", default: "CatConvert" },
      { name: "opacity", label: "透明度（0-1）", type: "number", default: 0.3, min: 0.1, max: 1 },
      { name: "fontSize", label: "字号", type: "number", default: 48, min: 16, max: 200 },
    ]}
  />
}

export function ImageSteganographyTool() {
  return <ServerToolBase
    toolSlug="image-steganography"
    accept="image/*"
    maxSizeMb={30}
    creditsCost={3}
    paramsSchema={[
      { name: "message", label: "嵌入的隐形文字", type: "text", default: "" },
    ]}
    acceptHint="推荐 PNG 无损格式，避免水印丢失"
  />
}

export function ImageSteganographyDetectTool() {
  return <ServerToolBase toolSlug="image-steganography-detect" accept="image/*" maxSizeMb={30} creditsCost={3} />
}

// Office (LibreOffice)

export function WordToPdfTool() {
  return <ServerToolBase
    toolSlug="word-to-pdf"
    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    maxSizeMb={50}
    creditsCost={3}
    acceptHint="支持 .doc / .docx 文件"
  />
}

export function PdfToWordTool() {
  return <ServerToolBase
    toolSlug="pdf-to-word"
    accept="application/pdf"
    maxSizeMb={50}
    creditsCost={5}
    acceptHint="支持 PDF 文件，转换为 .docx"
  />
}

export function ExcelToPdfTool() {
  return <ServerToolBase
    toolSlug="excel-to-pdf"
    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    maxSizeMb={50}
    creditsCost={3}
    acceptHint="支持 .xls / .xlsx 文件"
  />
}

export function ExcelToImageTool() {
  return <ServerToolBase
    toolSlug="excel-to-image"
    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    maxSizeMb={50}
    creditsCost={4}
    acceptHint="支持 .xls / .xlsx 文件，转为 PNG 图片"
    paramsSchema={[
      { name: "format", label: "图片格式", type: "select", default: "png", options: [
        { value: "png", label: "PNG" },
        { value: "jpg", label: "JPG" },
      ]},
      { name: "dpi", label: "清晰度 DPI", type: "select", default: "150", options: [
        { value: "150", label: "150 DPI（推荐）" },
        { value: "200", label: "200 DPI" },
        { value: "300", label: "300 DPI（更清晰）" },
      ]},
    ]}
  />
}

export function PptToPdfTool() {
  return <ServerToolBase
    toolSlug="ppt-to-pdf"
    accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
    maxSizeMb={100}
    creditsCost={3}
    acceptHint="支持 .ppt / .pptx 文件"
  />
}

export function PptToImageTool() {
  return <ServerToolBase
    toolSlug="ppt-to-image"
    accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
    maxSizeMb={100}
    creditsCost={5}
    acceptHint="支持 .ppt / .pptx 文件，转为 PNG 图片"
    paramsSchema={[
      { name: "format", label: "图片格式", type: "select", default: "png", options: [
        { value: "png", label: "PNG" },
        { value: "jpg", label: "JPG" },
      ]},
      { name: "dpi", label: "清晰度 DPI", type: "select", default: "150", options: [
        { value: "150", label: "150 DPI（推荐）" },
        { value: "200", label: "200 DPI" },
        { value: "300", label: "300 DPI（更清晰）" },
      ]},
    ]}
  />
}

export function WordToImageTool() {
  return <ServerToolBase
    toolSlug="word-to-image"
    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    maxSizeMb={50}
    creditsCost={4}
    acceptHint="支持 .doc / .docx 文件，转为 PNG 图片"
    paramsSchema={[
      { name: "format", label: "图片格式", type: "select", default: "png", options: [
        { value: "png", label: "PNG" },
        { value: "jpg", label: "JPG" },
      ]},
      { name: "dpi", label: "清晰度 DPI", type: "select", default: "150", options: [
        { value: "150", label: "150 DPI（推荐）" },
        { value: "200", label: "200 DPI" },
        { value: "300", label: "300 DPI（更清晰）" },
      ]},
    ]}
  />
}
