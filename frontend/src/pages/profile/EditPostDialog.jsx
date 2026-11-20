import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { API_URL, uploadImageFile } from '../../lib/api'
import { dateInputValue } from '../../lib/dates'

export default function EditPostDialog({ token, editingPost, onSave, onClose }) {
  const [postEditForm, setPostEditForm] = useState(() => ({
    title: editingPost.title || '',
    content: editingPost.content || '',
    imageUrl: editingPost.imageUrl || '',
    imagePublicId: editingPost.imagePublicId || '',
    tags: (editingPost.tags || []).join(', '),
    validFrom: dateInputValue(editingPost.validFrom),
    expiresAt: dateInputValue(editingPost.expiresAt),
    collaborationRequirements: editingPost.collaborationRequirements || '',
  }))
  const [postEditError, setPostEditError] = useState('')
  const [isSavingPost, setIsSavingPost] = useState(false)
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false)
  const postEditDialogRef = useRef(null)

  useEffect(() => {
    postEditDialogRef.current.showModal()
  }, [])
  async function handlePostImageUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    setPostEditError('')
    setIsUploadingPostImage(true)
    try {
      const { url, publicId } = await uploadImageFile(token, file, 'post')
      setPostEditForm((previous) => ({ ...previous, imageUrl: url, imagePublicId: publicId }))
    } catch (error) {
      setPostEditError(error.message)
    } finally {
      setIsUploadingPostImage(false)
      event.target.value = ''
    }
  }

  async function savePostEdits(event) {
    event.preventDefault()
    if (isSavingPost || isUploadingPostImage) return
    setPostEditError('')

    if (editingPost.postType === 'offer') {
      if (!postEditForm.validFrom || !postEditForm.expiresAt) {
        setPostEditError('Offers require both a valid-from and valid-until date.')
        return
      }
      if (postEditForm.expiresAt <= postEditForm.validFrom) {
        setPostEditError('The valid-until date must be after the valid-from date.')
        return
      }
    }

    setIsSavingPost(true)
    try {
      const response = await fetch(`${API_URL}/posts/${editingPost._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: postEditForm.title.trim(),
          content: postEditForm.content.trim(),
          imageUrl: postEditForm.imageUrl,
          imagePublicId: postEditForm.imagePublicId,
          tags: postEditForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          validFrom: editingPost.postType === 'offer' ? postEditForm.validFrom : null,
          expiresAt: postEditForm.expiresAt || null,
          collaborationRequirements:
            editingPost.postType === 'collaboration' ? postEditForm.collaborationRequirements.trim() : '',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to update post')
      onSave(data)
    } catch (error) {
      setPostEditError(error.message)
    } finally {
      setIsSavingPost(false)
    }
  }

  return (
    <dialog
      ref={postEditDialogRef}
      className="post-edit-dialog"
      aria-labelledby="post-edit-title"
      onClose={onClose}
      onCancel={(event) => {
        if (isSavingPost) event.preventDefault()
      }}
      onClick={(event) => {
        if (event.target === postEditDialogRef.current && !isSavingPost) postEditDialogRef.current.close()
      }}
    >
      <header className="post-edit-header">
        <div>
          <p className="eyebrow">Business studio / Edit post</p>
          <h2 id="post-edit-title">Update your {editingPost.postType}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => postEditDialogRef.current?.close()}
          aria-label="Close edit post"
          disabled={isSavingPost}
        >
          <X size={21} />
        </button>
      </header>
      <form className="post-form post-edit-form" onSubmit={savePostEdits}>
        <p className="post-edit-type">
          Post type stays <strong>{editingPost.postType}</strong> after publishing.
        </p>
        <label>
          Headline *
          <input
            value={postEditForm.title}
            onChange={(event) => setPostEditForm({ ...postEditForm, title: event.target.value })}
            required
            maxLength={120}
          />
        </label>
        <label>
          Description *
          <textarea
            value={postEditForm.content}
            onChange={(event) => setPostEditForm({ ...postEditForm, content: event.target.value })}
            required
            maxLength={3000}
          />
        </label>
        <label>
          Image <span>(optional)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handlePostImageUpload}
            disabled={isUploadingPostImage || isSavingPost}
          />
        </label>
        {isUploadingPostImage && <p className="dashboard-intro">Uploading image...</p>}
        {postEditForm.imageUrl && (
          <div className="post-edit-image">
            <img className="image-upload-preview" src={postEditForm.imageUrl} alt="Post preview" />
            <button
              type="button"
              onClick={() => setPostEditForm({ ...postEditForm, imageUrl: '', imagePublicId: '' })}
            >
              Remove image
            </button>
          </div>
        )}
        {editingPost.postType === 'collaboration' && (
          <label>
            Collaboration requirements *
            <textarea
              value={postEditForm.collaborationRequirements}
              onChange={(event) =>
                setPostEditForm({ ...postEditForm, collaborationRequirements: event.target.value })
              }
              required
              maxLength={2000}
            />
          </label>
        )}
        <label>
          Tags <span>(comma separated)</span>
          <input
            value={postEditForm.tags}
            onChange={(event) => setPostEditForm({ ...postEditForm, tags: event.target.value })}
          />
        </label>
        {editingPost.postType === 'offer' && (
          <label>
            Valid from *
            <input
              type="date"
              value={postEditForm.validFrom}
              onChange={(event) => setPostEditForm({ ...postEditForm, validFrom: event.target.value })}
              required
            />
          </label>
        )}
        <label>
          Valid until{editingPost.postType === 'offer' && ' *'}
          <input
            type="date"
            value={postEditForm.expiresAt}
            min={editingPost.postType === 'offer' ? postEditForm.validFrom : undefined}
            onChange={(event) => setPostEditForm({ ...postEditForm, expiresAt: event.target.value })}
            required={editingPost.postType === 'offer'}
          />
        </label>
        {postEditError && <p className="auth-message">{postEditError}</p>}
        <div className="edit-profile-actions">
          <button type="button" onClick={() => postEditDialogRef.current?.close()} disabled={isSavingPost}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSavingPost || isUploadingPostImage}>
            {isSavingPost ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
