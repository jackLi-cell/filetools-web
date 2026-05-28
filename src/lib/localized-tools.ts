import type { Tool } from "@/config/tools"
import { getToolSeo, type ToolSeo } from "@/config/seo"
import type { Locale } from "@/i18n/config"

type ToolCopy = {
  name: string
  description: string
  keywords?: string[]
}

const EN_TOOL_COPY: Record<string, ToolCopy> = {
  "image-compress": {
    name: "Image Compressor",
    description: "Reduce JPG, PNG, and WebP file size with quality and target-size controls.",
    keywords: ["image compressor", "compress image", "JPG compressor", "PNG compressor", "WebP compressor"],
  },
  "image-convert": {
    name: "Image Format Converter",
    description: "Convert images between PNG, JPG, WebP, GIF, BMP, and AVIF formats.",
    keywords: ["image converter", "PNG to JPG", "JPG to WebP", "WebP converter"],
  },
  "image-crop": {
    name: "Image Cropper",
    description: "Crop images freely or with preset ratios for avatars, covers, and social posts.",
  },
  "image-resize": {
    name: "Image Resizer",
    description: "Resize images by pixels, percentage, or common platform presets.",
  },
  "image-base64": {
    name: "Image Base64 Converter",
    description: "Convert images to Base64 strings or restore Base64 data back to image files.",
  },
  "image-watermark": {
    name: "Image Watermark Tool",
    description: "Add visible text or image watermarks to uploaded images.",
  },
  "image-steganography": {
    name: "Invisible Watermark",
    description: "Embed a hidden watermark in an image for lightweight ownership tracking.",
  },
  "image-steganography-detect": {
    name: "Invisible Watermark Detector",
    description: "Extract and check hidden watermark data from supported images.",
  },
  "image-remove-bg": {
    name: "Background Remover",
    description: "Remove image backgrounds with AI-assisted processing.",
  },
  "image-id-photo": {
    name: "ID Photo Background Changer",
    description: "Change ID photo background colors for common document photo needs.",
  },
  "image-ocr": {
    name: "Image OCR",
    description: "Extract text from images with OCR processing.",
  },
  "image-exif": {
    name: "EXIF Viewer and Cleaner",
    description: "View or remove image metadata such as camera, lens, and location fields.",
  },
  "image-svg-convert": {
    name: "SVG to PNG/JPG Converter",
    description: "Convert SVG vector graphics into PNG or JPG bitmap files.",
  },
  "image-collage": {
    name: "Image Collage Maker",
    description: "Join multiple images into a long image or grid collage.",
  },
  "pdf-to-image": {
    name: "PDF to Image",
    description: "Convert each PDF page into PNG or JPG images.",
    keywords: ["PDF to image", "PDF to PNG", "PDF to JPG"],
  },
  "image-to-pdf": {
    name: "Image to PDF",
    description: "Merge JPG, PNG, and WebP images into a single PDF file.",
    keywords: ["image to PDF", "JPG to PDF", "PNG to PDF"],
  },
  "pdf-merge": {
    name: "PDF Merger",
    description: "Combine multiple PDF files into one document in your chosen order.",
    keywords: ["merge PDF", "combine PDF", "PDF merger"],
  },
  "pdf-split": {
    name: "PDF Splitter",
    description: "Split a PDF by page range or export selected pages as separate files.",
    keywords: ["split PDF", "extract PDF pages", "PDF splitter"],
  },
  "pdf-compress": {
    name: "PDF Compressor",
    description: "Reduce PDF file size for email, uploads, and archiving.",
    keywords: ["compress PDF", "reduce PDF size", "PDF compressor"],
  },
  "json-formatter": {
    name: "JSON Formatter",
    description: "Format, minify, validate, view, and compare JSON data.",
    keywords: ["JSON formatter", "JSON validator", "JSON beautifier"],
  },
  "regex-tester": {
    name: "Regex Tester",
    description: "Test regular expressions with live matches, groups, templates, and replacement output.",
  },
  "timestamp-converter": {
    name: "Timestamp Converter",
    description: "Convert Unix timestamps to readable dates and calculate timezone/date differences.",
  },
  "url-codec": {
    name: "URL Encoder and Decoder",
    description: "Encode, decode, parse, and build URLs and query strings.",
  },
  "hash-generator": {
    name: "Hash Generator",
    description: "Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes for text and files.",
  },
  "uuid-generator": {
    name: "UUID and Password Generator",
    description: "Generate UUID values and random secure passwords.",
  },
  "jwt-decoder": {
    name: "JWT Decoder",
    description: "Decode JWT headers and payloads and inspect token expiration details.",
  },
  "xml-formatter": {
    name: "XML and YAML Formatter",
    description: "Format XML and convert structured data into readable YAML output.",
  },
  "qrcode-generate": {
    name: "QR Code Generator",
    description: "Create QR codes for URLs, text, Wi-Fi, vCard, and location data.",
    keywords: ["QR code generator", "create QR code", "WiFi QR code"],
  },
  "qrcode-decode": {
    name: "QR Code Decoder",
    description: "Upload an image and decode the QR code content inside it.",
  },
  "barcode-generate": {
    name: "Barcode Generator",
    description: "Generate EAN, UPC, Code128, and printable barcode labels.",
  },
  "markdown-preview": {
    name: "Markdown Preview",
    description: "Preview Markdown in real time, switch themes, generate a TOC, and export output.",
  },
  "markdown-to-html": {
    name: "Markdown to HTML",
    description: "Convert Markdown content into a complete HTML file.",
  },
  "word-counter": {
    name: "Word Counter",
    description: "Count words, characters, lines, paragraphs, reading time, and keyword density.",
  },
  "text-dedup": {
    name: "Text Deduplicator",
    description: "Remove duplicate lines, find near duplicates, and export a cleanup report.",
  },
  "case-converter": {
    name: "Case Converter",
    description: "Convert text and variable names between upper, lower, camel, snake, and kebab case.",
  },
  "color-converter": {
    name: "Color Converter",
    description: "Convert HEX, RGB, and HSL colors and generate palettes, gradients, and contrast checks.",
  },
  "video-compress": {
    name: "Video Compressor",
    description: "Compress videos with quality, resolution, and target-size presets.",
  },
  "video-convert": {
    name: "Video Converter",
    description: "Convert videos between MP4, WebM, MOV, AVI, and other common formats.",
  },
  "video-to-gif": {
    name: "Video to GIF",
    description: "Convert a selected video segment into an animated GIF.",
  },
  "video-extract-audio": {
    name: "Extract Audio from Video",
    description: "Extract the audio track from a video and save it as an audio file.",
  },
  "audio-convert": {
    name: "Audio Converter",
    description: "Convert audio between MP3, WAV, FLAC, AAC, and OGG formats.",
  },
  "audio-compress": {
    name: "Audio Compressor",
    description: "Reduce audio file size by adjusting bitrate and encoding settings.",
  },
  "audio-trim": {
    name: "Audio Trimmer",
    description: "Cut an audio file to a specific start and end time.",
  },
  "audio-merge": {
    name: "Audio Merger",
    description: "Join multiple audio files into one continuous audio track.",
  },
  "html-to-markdown": {
    name: "HTML to Markdown",
    description: "Convert HTML snippets or pages into clean Markdown.",
  },
  "signature-create": {
    name: "E-Signature Image Maker",
    description: "Draw and export a handwritten signature image.",
  },
  "favicon-generator": {
    name: "Favicon Generator",
    description: "Generate full-size website favicons and app icons from one image.",
  },
  "table-converter": {
    name: "Table to Markdown/HTML",
    description: "Convert table data into Markdown tables or HTML table markup.",
  },
  "text-replace": {
    name: "Batch Text Replace",
    description: "Find, replace, and compare text in bulk.",
  },
  "data-mask": {
    name: "Data Masking Tool",
    description: "Detect and mask phone numbers, email addresses, ID-like strings, and sensitive text.",
  },
  "text-cleaner": {
    name: "Text Cleaner",
    description: "Remove extra spaces, blank lines, mojibake-like clutter, and formatting noise.",
  },
  "word-to-pdf": {
    name: "Word to PDF",
    description: "Convert DOC and DOCX documents into PDF files.",
    keywords: ["Word to PDF", "DOCX to PDF", "DOC to PDF"],
  },
  "pdf-to-word": {
    name: "PDF to Word",
    description: "Convert PDF files into editable Word documents where possible.",
    keywords: ["PDF to Word", "PDF to DOCX", "editable PDF"],
  },
  "excel-to-pdf": {
    name: "Excel to PDF",
    description: "Convert XLS and XLSX spreadsheets into PDF files.",
    keywords: ["Excel to PDF", "XLSX to PDF", "spreadsheet to PDF"],
  },
  "excel-to-image": {
    name: "Excel to Image",
    description: "Convert Excel sheets into PNG images.",
  },
  "ppt-to-pdf": {
    name: "PowerPoint to PDF",
    description: "Convert PPT and PPTX presentations into PDF files.",
    keywords: ["PPT to PDF", "PowerPoint to PDF", "slides to PDF"],
  },
  "ppt-to-image": {
    name: "PowerPoint to Image",
    description: "Convert each presentation slide into a PNG image.",
  },
  "word-to-image": {
    name: "Word to Image",
    description: "Convert Word document pages into PNG images.",
  },
}

export function localizeTool(tool: Tool, locale: Locale | string): Tool {
  if (locale !== "en") return tool

  const copy = EN_TOOL_COPY[tool.slug]
  if (!copy) return tool

  return {
    ...tool,
    name: copy.name,
    description: copy.description,
  }
}

export function localizeTools(tools: Tool[], locale: Locale | string): Tool[] {
  return tools.map((tool) => localizeTool(tool, locale))
}

function defaultEnglishSeo(tool: Tool): ToolSeo {
  const copy = EN_TOOL_COPY[tool.slug]
  const name = copy?.name || tool.name
  const description = copy?.description || tool.description
  const isLocal = tool.isLocal

  return {
    slug: tool.slug,
    title: `${name} - Online ${name} Tool`,
    description,
    keywords: copy?.keywords || [name, "online tool", "CatConvert", tool.slug],
    h1: name,
    intro: `${description} Use this tool directly in your browser on desktop or mobile, with clear limits and download-ready results.`,
    scenarios: isLocal
      ? [
          "Handle a quick file or text task without installing desktop software.",
          "Process private draft content locally in the browser when the tool supports local processing.",
          "Prepare files for email, upload forms, documentation, or content publishing.",
        ]
      : [
          "Run a server-side conversion or processing task that needs heavier tooling.",
          "Prepare documents, media, or files for sharing, printing, submission, or archiving.",
          "Use credits for advanced processing while keeping basic tools free.",
        ],
    steps: isLocal
      ? [
          "Add your file or paste the content into the tool.",
          "Adjust the available options for your expected output.",
          "Preview or check the result, then download or copy it.",
        ]
      : [
          "Upload the required file and confirm the processing options.",
          "Sign in if the tool requires credits.",
          "Start processing and wait for the server task to finish.",
          "Download the result and review it before using it in important work.",
        ],
    notes: isLocal
      ? [
          "Local browser tools do not upload files to the server.",
          "Keep an original copy before replacing important files.",
          "Large files may depend on your browser memory and device performance.",
        ]
      : [
          "Server-side results are temporary; download completed files promptly.",
          "Important legal, financial, academic, or business files should be manually reviewed after conversion.",
          "Processing can fail for encrypted, damaged, or unusual file formats.",
        ],
    faq: [
      {
        q: "Is this tool free to use?",
        a: tool.isFree
          ? "Yes. This tool is free to use."
          : `This advanced tool uses ${tool.creditsCost} credits per run. Basic tools remain free.`,
      },
      {
        q: "Are my files uploaded?",
        a: isLocal
          ? "No. This tool runs locally in your browser."
          : "This tool uses server-side processing. Source files and temporary results are cleaned up according to the site's file retention policy.",
      },
    ],
  }
}

export function getLocalizedToolSeo(
  slug: string,
  locale: Locale | string,
  tool: Tool
): ToolSeo | undefined {
  if (locale === "en") return defaultEnglishSeo(localizeTool(tool, locale))
  return getToolSeo(slug)
}
