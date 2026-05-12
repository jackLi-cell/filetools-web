"use client"

import { ImageCompressTool } from "./image-compress"
import { ImageConvertTool } from "./image-convert"
import { ImageCropTool } from "./image-crop"
import { ImageResizeTool } from "./image-resize"
import { ImageBase64Tool } from "./image-base64"
import { JsonFormatterTool } from "./json-formatter"
import { RegexTesterTool } from "./regex-tester"
import { QrCodeGenerateTool } from "./qrcode-generate"
import { QrCodeDecodeTool } from "./qrcode-decode"
import { BarcodeGenerateTool } from "./barcode-generate"
import { TimestampConverterTool } from "./timestamp-converter"
import { HashGeneratorTool } from "./hash-generator"
import { UrlCodecTool } from "./url-codec"
import { UuidGeneratorTool } from "./uuid-generator"
import { JwtDecoderTool } from "./jwt-decoder"
import { WordCounterTool } from "./word-counter"
import { TextDedupTool } from "./text-dedup"
import { CaseConverterTool } from "./case-converter"
import { ColorConverterTool } from "./color-converter"
import { MarkdownPreviewTool } from "./markdown-preview"
import { XmlFormatterTool } from "./xml-formatter"
import { HtmlToMarkdownTool } from "./html-to-markdown"
import { SignatureCreateTool } from "./signature-create"
import {
  PdfToImageTool, ImageToPdfTool, PdfMergeTool, PdfSplitTool, PdfCompressTool,
  VideoCompressTool, VideoConvertTool, VideoToGifTool, VideoExtractAudioTool,
  AudioConvertTool, AudioCompressTool, AudioTrimTool, AudioMergeTool,
  ImageWatermarkTool, ImageSteganographyTool, ImageSteganographyDetectTool,
  WordToPdfTool, PdfToWordTool, ExcelToPdfTool, ExcelToImageTool,
  PptToPdfTool, PptToImageTool, WordToImageTool,
} from "./server-tools"
import { ImageCollageTool } from "./image-collage"
import { ImageExifTool } from "./image-exif"
import { ImageSvgConvertTool } from "./image-svg-convert"
import { PlaceholderTool } from "./placeholder"

const toolComponents: Record<string, React.ComponentType> = {
  "image-compress": ImageCompressTool,
  "image-convert": ImageConvertTool,
  "image-crop": ImageCropTool,
  "image-resize": ImageResizeTool,
  "image-base64": ImageBase64Tool,
  "json-formatter": JsonFormatterTool,
  "regex-tester": RegexTesterTool,
  "qrcode-generate": QrCodeGenerateTool,
  "qrcode-decode": QrCodeDecodeTool,
  "barcode-generate": BarcodeGenerateTool,
  "timestamp-converter": TimestampConverterTool,
  "hash-generator": HashGeneratorTool,
  "url-codec": UrlCodecTool,
  "uuid-generator": UuidGeneratorTool,
  "jwt-decoder": JwtDecoderTool,
  "word-counter": WordCounterTool,
  "text-dedup": TextDedupTool,
  "case-converter": CaseConverterTool,
  "color-converter": ColorConverterTool,
  "markdown-preview": MarkdownPreviewTool,
  "markdown-to-html": MarkdownPreviewTool,
  "xml-formatter": XmlFormatterTool,
  "html-to-markdown": HtmlToMarkdownTool,
  "signature-create": SignatureCreateTool,
  // 后端处理工具
  "pdf-to-image": PdfToImageTool,
  "image-to-pdf": ImageToPdfTool,
  "pdf-merge": PdfMergeTool,
  "pdf-split": PdfSplitTool,
  "pdf-compress": PdfCompressTool,
  "video-compress": VideoCompressTool,
  "video-convert": VideoConvertTool,
  "video-to-gif": VideoToGifTool,
  "video-extract-audio": VideoExtractAudioTool,
  "audio-convert": AudioConvertTool,
  "audio-compress": AudioCompressTool,
  "audio-trim": AudioTrimTool,
  "audio-merge": AudioMergeTool,
  "image-watermark": ImageWatermarkTool,
  "image-steganography": ImageSteganographyTool,
  "image-steganography-detect": ImageSteganographyDetectTool,
  "image-collage": ImageCollageTool,
  "image-exif": ImageExifTool,
  "image-svg-convert": ImageSvgConvertTool,
  // Office (LibreOffice)
  "word-to-pdf": WordToPdfTool,
  "pdf-to-word": PdfToWordTool,
  "excel-to-pdf": ExcelToPdfTool,
  "excel-to-image": ExcelToImageTool,
  "ppt-to-pdf": PptToPdfTool,
  "ppt-to-image": PptToImageTool,
  "word-to-image": WordToImageTool,
}

export function ToolRenderer({ slug }: { slug: string }) {
  const Component = toolComponents[slug] || PlaceholderTool
  return <Component />
}
