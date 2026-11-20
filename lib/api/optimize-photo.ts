/* ─────────────────────────────────────────────────────────────────────────────
   Une photo allégée avant de partir vers le stockage.

   Une photo de téléphone pèse 3 à 5 Mo pour 4000 px de large, et le site l'affiche
   telle quelle. On la redessine ici, dans le navigateur, à `maxSide` px au plus sur
   son plus grand côté, en WebP (JPEG si le navigateur ne sait pas encoder le WebP,
   comme certaines versions de Safari). L'API et R2 ne changent pas : ils reçoivent
   un JPEG, un PNG ou un WebP comme avant, juste plus léger.

   Si quelque chose échoue (format illisible, navigateur trop ancien) ou si le
   résultat n'est pas plus léger, on garde le fichier d'origine : l'envoi marche
   toujours, au pire sans gain.
   ───────────────────────────────────────────────────────────────────────────── */

/** Couverture d'un plat ou d'un menu : assez pour un écran large en 2x. */
export const PHOTO_MAX_SIDE = 1600
/** Photo de profil : jamais affichée en grand. */
export const AVATAR_MAX_SIDE = 512

const QUALITY = 0.8

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    // `from-image` applique l’orientation EXIF : une photo prise en portrait le reste.
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function optimizePhoto(file: File, maxSide = PHOTO_MAX_SIDE): Promise<File> {
  if (typeof document === 'undefined') return file
  try {
    const image = await decode(file)
    const width = image.width
    const height = image.height
    if (!width || !height) return file

    const scale = Math.min(1, maxSide / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    if ('close' in image) image.close()

    let blob = await toBlob(canvas, 'image/webp')
    // Sans encodeur WebP, le navigateur rend un PNG : on repasse en JPEG, sur fond
    // blanc pour qu'une transparence ne devienne pas noire.
    if (!blob || blob.type !== 'image/webp') {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      blob = await toBlob(canvas, 'image/jpeg')
    }
    if (!blob || blob.size >= file.size) return file

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const name = file.name.replace(/\.[^.]*$/, '') || 'photo'
    return new File([blob], `${name}.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}
