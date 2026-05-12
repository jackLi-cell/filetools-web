"use client"

import { ServerToolBase } from "./server-tool-base"

export function PdfToImageTool() {
  return <ServerToolBase toolSlug="pdf-to-image" accept="application/pdf" maxSizeMb={30} creditsCost={1} isLimitedFree acceptHint="支持 PDF 文件，最大 30MB" />
}

export function ImageToPdfTool() {
  return <ServerToolBase toolSlug="image-to-pdf" accept="image/*" maxSizeMb={30} creditsCost={1} isLimitedFree acceptHint="支持图片格式" />
}

export function PdfMergeTool() {
  return <ServerToolBase toolSlug="pdf-merge" accept="application/pdf" maxSizeMb={50} creditsCost={1} isLimitedFree acceptHint="支持 PDF 文件" />
}

export function PdfSplitTool() {
  return <ServerToolBase
    toolSlug="pdf-split"
    accept="application/pdf"
    maxSizeMb={50}
    creditsCost={1}
    isLimitedFree
    paramsSchema={[
      { name: "startPage", label: "起始页", type: "number", default: 1, min: 1 },
      { name: "endPage", label: "结束页", type: "number", default: 1, min: 1 },
    ]}
  />
}

export function PdfCompressTool() {
  return <ServerToolBase toolSlug="pdf-compress" accept="application/pdf" maxSizeMb={50} creditsCost={2} acceptHint="支持 PDF 文件" />
}

export function VideoCompressTool() {
  return <ServerToolBase
    toolSlug="video-compress"
    accept="video/*"
    maxSizeMb={500}
    creditsCost={5}
    paramsSchema={[
      { name: "quality", label: "质量（CRF，越小越高）", type: "number", default: 28, min: 18, max: 35 },
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
      { name: "fps", label: "帧率", type: "number", default: 10, min: 5, max: 30 },
      { name: "width", label: "宽度（px）", type: "number", default: 480, min: 100, max: 1920 },
    ]}
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
  />
}

export function WordToImageTool() {
  return <ServerToolBase
    toolSlug="word-to-image"
    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    maxSizeMb={50}
    creditsCost={4}
    acceptHint="支持 .doc / .docx 文件，转为 PNG 图片"
  />
}
