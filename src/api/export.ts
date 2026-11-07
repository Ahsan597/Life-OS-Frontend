import { apiClient } from '@/api/client'

export type ExportDataset = 'habits' | 'habit_logs' | 'check_ins' | 'recommendations'

export type ExportRequest = { format: 'json' } | { format: 'csv'; dataset: ExportDataset }

export const DEFAULT_EXPORT_FILENAME = 'lifeos-export.json'

/** Reads `filename="…"` (or RFC 5987 `filename*=UTF-8''…`) from Content-Disposition */
export function filenameFromDisposition(header: unknown, fallback = DEFAULT_EXPORT_FILENAME): string {
  if (typeof header !== 'string') return fallback
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim())
    } catch {
      // fall through to the plain form
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)
  return plain ? plain[1].trim() : fallback
}

/**
 * Downloads the export as a Blob (it needs the Bearer token, so a plain link won't do).
 * CSV cells starting with = + - @ come prefixed with ' on purpose; leave them alone.
 */
export async function downloadExport(request: ExportRequest): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.get<Blob>('/export', { params: request, responseType: 'blob' })
  const fallback = request.format === 'csv' ? `lifeos-${request.dataset}.csv` : DEFAULT_EXPORT_FILENAME
  return { blob: response.data, filename: filenameFromDisposition(response.headers['content-disposition'], fallback) }
}

/** Saves a Blob through a temporary <a download>, then frees the object URL */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    // Revoking in the same tick can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }
}
