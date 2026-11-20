export const API_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export async function uploadImageFile(token, file, type = 'post') {
  const body = new FormData()
  body.append('image', file)
  const response = await fetch(`${API_URL}/uploads/image?type=${type}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Unable to upload image')
  return { url: data.url, publicId: data.publicId }
}
