import { useState, useEffect, useRef } from 'react'
import { Sparkles, Pencil, Trash2, X } from 'lucide-react'
import { API_URL } from '../../lib/api'
import Countdown from '../../components/Countdown'
import PostCard from '../../components/PostCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import EditPostDialog from './EditPostDialog'

const profileTabs = [
  { key: 'collaboration', label: 'Collaborations' },
  { key: 'promotion', label: 'Promotions' },
  { key: 'offer', label: 'Offers' },
]

export default function BusinessPosts({ token, businessId, isOwnProfile, activeTab, setActiveTab }) {
  const [posts, setPosts] = useState([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [selectedPost, setSelectedPost] = useState(null)
  const postDialogRef = useRef(null)
  const [editingPost, setEditingPost] = useState(null)
  const [deletingPost, setDeletingPost] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  useEffect(() => {
    const dialog = postDialogRef.current
    if (!dialog) return
    if (selectedPost && !dialog.open) dialog.showModal()
    if (!selectedPost && dialog.open) dialog.close()
  }, [selectedPost])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoadingPosts(true)
    fetch(`${API_URL}/businesses/${businessId}/posts?postType=${activeTab}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!controller.signal.aborted) setPosts(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setPosts([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingPosts(false)
      })
    return () => controller.abort()
  }, [businessId, token, activeTab])
  async function deletePost() {
    if (!deletingPost || isDeleting) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(`${API_URL}/posts/${deletingPost}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Could not delete this post. Please try again.')
      setPosts((previous) => previous.filter((post) => post._id !== deletingPost))
      setDeletingPost(null)
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  function closePostDialog() {
    setSelectedPost(null)
  }

  function applyEdits(updated) {
    setPosts((previous) => previous.map((post) => (post._id === updated._id ? updated : post)))
    setEditingPost(null)
  }

  return (
    <>
      <div className="profile-section">
        <div className="profile-tabs">
          {profileTabs.map((tab) => (
            <button
              key={tab.key}
              className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isLoadingPosts ? (
          <div className="loading-state">Loading posts...</div>
        ) : posts.length ? (
          <div className="profile-post-grid">
            {posts.map((post) => (
              <article className="profile-post-card" key={post._id}>
                <button
                  className="profile-post-open"
                  onClick={() => setSelectedPost(post)}
                  aria-label={`Open post: ${post.title}`}
                >
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="profile-post-card-empty">
                      <Sparkles size={20} />
                    </div>
                  )}
                  {post.postType === 'offer' && post.expiresAt && (
                    <Countdown targetDate={post.expiresAt} compact />
                  )}
                  <strong>{post.title}</strong>
                  <span>{post.content}</span>
                </button>
                {isOwnProfile && (
                  <div className="profile-post-management">
                    <button
                      className="profile-post-edit"
                      aria-label={`Edit post: ${post.title}`}
                      title="Edit post"
                      onClick={() => setEditingPost(post)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="profile-post-delete"
                      aria-label={`Delete post: ${post.title}`}
                      title="Delete post"
                      onClick={() => {
                        setDeleteError('')
                        setDeletingPost(post._id)
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Sparkles size={24} />
            <p>No {profileTabs.find((tab) => tab.key === activeTab)?.label.toLowerCase()} posts yet.</p>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(deletingPost)}
        title="Delete this post?"
        busy={isDeleting}
        error={deleteError}
        onCancel={() => setDeletingPost(null)}
        onConfirm={deletePost}
      >
        This removes the post from your profile and the feed. This action cannot be undone.
      </ConfirmDialog>
      <dialog
        ref={postDialogRef}
        className="business-post-dialog"
        aria-label={selectedPost ? `Post: ${selectedPost.title}` : 'Business post'}
        onClose={(event) => {
          if (event.target === event.currentTarget) closePostDialog()
        }}
        onClick={(event) => {
          if (event.target === postDialogRef.current) postDialogRef.current.close()
        }}
      >
        {selectedPost && (
          <>
            <button
              className="icon-button business-post-dialog-close"
              onClick={() => postDialogRef.current?.close()}
              aria-label="Close post"
            >
              <X size={21} />
            </button>
            <PostCard post={selectedPost} onOpenBusiness={closePostDialog} />
          </>
        )}
      </dialog>
      {editingPost && (
        <EditPostDialog
          token={token}
          editingPost={editingPost}
          onSave={applyEdits}
          onClose={() => setEditingPost(null)}
        />
      )}
    </>
  )
}
