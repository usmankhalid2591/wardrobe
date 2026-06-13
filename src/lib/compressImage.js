// Resize + compress an image file in-browser before upload.
// Keeps Supabase storage usage low and the grid fast.
export async function compressImage(file, { maxDim = 1280, quality = 0.82 } = {}) {
  try {
    if (!file.type.startsWith('image/')) return file

    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width)
        width = maxDim
      } else {
        width = Math.round((width * maxDim) / height)
        height = maxDim
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file

    // Only use the compressed version if it's actually smaller.
    return blob.size < file.size ? blob : file
  } catch {
    // Unsupported format, decode error, etc. — fall back to the original file.
    return file
  }
}
