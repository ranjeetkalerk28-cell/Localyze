import { Bookmark, Building2, Ellipsis, Heart, MessageCircle, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../account/AccountContext'
import { API_URL } from '../lib/api'
import { formatDate } from '../lib/dates'
import Countdown from './Countdown'
import Avatar from './Avatar'
import BusinessLink from './BusinessLink'

export default function PostCard({ post, onOpenBusiness, onSaveChange, onLikeChange, homeCard = false }) {
  const { token, userId, isBusiness: isBusinessAccount, savedPostIds, updateSaved } = useAccount()
  const initialSaved = savedPostIds.has(post._id)
  const [liked, setLiked] = useState(() =>
    Boolean(userId && (post.likes?.includes(userId) || post.businessLikes?.includes(userId))),
  )
  const [likeCount, setLikeCount] = useState((post.likes?.length || 0) + (post.businessLikes?.length || 0))
  const [saved, setSaved] = useState(initialSaved)
  const [isLiking, setIsLiking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentsError, setCommentsError] = useState(false)
  const [latestComment, setLatestComment] = useState(null)
  const [previewError, setPreviewError] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentSubmitError, setCommentSubmitError] = useState('')
  const commentsDialogRef = useRef(null)
  const businessName = post.business?.businessName || 'Localyze member'
  const ageHours = Math.max(0, Math.floor((Date.now() - new Date(post.createdAt)) / 3600000))
  const ageLabel = ageHours < 1 ? 'Just now' : ageHours < 24 ? `${ageHours}h ago` : formatDate(post.createdAt)

  useEffect(() => setSaved(initialSaved), [initialSaved])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_URL}/posts/${post._id}/comments?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load comment preview')
        return response.json()
      })
      .then((data) => {
        if (!cancelled) setLatestComment(data[0] || null)
      })
      .catch(() => {
        if (!cancelled) setPreviewError(true)
      })

    return () => {
      cancelled = true
    }
  }, [post._id, token])

  useEffect(() => {
    const dialog = commentsDialogRef.current
    if (!dialog) return
    if (showComments && !dialog.open) dialog.showModal()
    if (!showComments && dialog.open) dialog.close()
  }, [showComments])

  async function toggleLike() {
    if (isLiking) return
    setIsLiking(true)
    const previousLiked = liked
    const previousCount = likeCount
    setLiked(!previousLiked)
    setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1)
    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/like`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Unable to like post')
      const data = await response.json()
      setLiked(data.liked)
      setLikeCount(data.likes)
      onLikeChange?.(post._id, data.liked, post)
    } catch {
      setLiked(previousLiked)
      setLikeCount(previousCount)
    } finally {
      setIsLiking(false)
    }
  }

  async function toggleSave() {
    if (isSaving) return
    setIsSaving(true)
    const next = !saved
    setSaved(next)
    try {
      const response = await fetch(`${API_URL}/saved/${post._id}`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok && response.status !== 409) throw new Error('Unable to update saved post')
      updateSaved(post._id, next)
      onSaveChange?.(post._id, next, post)
    } catch {
      setSaved(!next)
    } finally {
      setIsSaving(false)
    }
  }

  async function openComments() {
    setShowComments(true)

    setIsLoadingComments(true)
    setCommentsError(false)
    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Unable to load comments')
      const data = await response.json()
      setComments(data)
      setLatestComment(data[data.length - 1] || null)
    } catch {
      setCommentsError(true)
    } finally {
      setIsLoadingComments(false)
    }
  }

  async function submitComment(event) {
    event.preventDefault()
    if (!commentText.trim() || isSubmittingComment) return
    setIsSubmittingComment(true)
    setCommentSubmitError('')
    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (!response.ok) throw new Error('Unable to post comment')
      const comment = await response.json()
      setComments((previous) => [...previous, comment])
      setLatestComment(comment)
      setCommentText('')
    } catch (error) {
      setCommentSubmitError(error.message)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  function renderCommentAuthor(comment) {
    const isBusinessComment = Boolean(comment.business)
    const authorName = isBusinessComment
      ? comment.business?.businessName || 'A business'
      : comment.user?.name || comment.user?.username || 'Someone'

    return (
      <>
        <strong>{authorName}</strong>
        {isBusinessComment && (
          <span className="comment-business-badge" title="Business account" aria-label="Business account">
            <Building2 size={11} strokeWidth={2.5} />
          </span>
        )}
      </>
    )
  }

  return (
    <article className={`post-card ${post.imageUrl ? 'has-photo' : 'text-post'}`}>
      <header className="post-header">
        {post.business?._id ? (
          <BusinessLink
            businessId={post.business._id}
            onClick={onOpenBusiness}
            aria-label={`View ${businessName} profile`}
          >
            <Avatar name={businessName} src={post.business.logoUrl} />
          </BusinessLink>
        ) : (
          <Avatar name={businessName} src={post.business?.logoUrl} />
        )}
        <div className="post-author">
          {post.business?._id ? (
            <BusinessLink
              className="post-author-link"
              businessId={post.business._id}
              onClick={onOpenBusiness}
            >
              {businessName}
            </BusinessLink>
          ) : (
            <strong>{businessName}</strong>
          )}
          <span>
            {post.business?.industry || 'Independent business'}
            {homeCard && (
              <time className="feed-byline" dateTime={post.createdAt}>
                {' '}
                · {ageLabel}
              </time>
            )}
          </span>
        </div>
        <time className="post-header-date">{formatDate(post.createdAt)}</time>
        {homeCard && post.business?._id && (
          <details className="feed-post-menu">
            <summary aria-label={`Actions for ${post.title}`}>
              <Ellipsis />
            </summary>
            <BusinessLink businessId={post.business._id} onClick={onOpenBusiness}>
              View business profile
            </BusinessLink>
          </details>
        )}
      </header>
      {post.imageUrl && (
        <img className="post-image" src={post.imageUrl} alt={post.title} loading="lazy" decoding="async" />
      )}
      <div className="post-actions">
        <div className="action-group">
          <div className="like-action">
            <button
              className={`icon-button ${liked ? 'is-liked' : ''}`}
              onClick={toggleLike}
              aria-label={liked ? 'Unlike post' : 'Like post'}
              disabled={isLiking}
            >
              <Heart size={21} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              data-count={likeCount}
              className="post-like-count"
              onClick={toggleLike}
              disabled={isLiking}
              aria-label={`${likeCount} likes`}
            >
              {likeCount}
            </button>
          </div>
          <button className="icon-button" onClick={openComments} aria-label="View comments">
            <MessageCircle size={21} />
          </button>
        </div>
        {!isBusinessAccount && (
          <button
            className={`icon-button ${saved ? 'is-saved' : ''}`}
            onClick={toggleSave}
            aria-label={saved ? 'Remove saved post' : 'Save post'}
            disabled={isSaving}
          >
            <Bookmark size={21} fill={saved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      <div className="post-copy">
        <div className="post-meta">
          <span className={`post-type post-type-${post.postType || 'offer'}`}>
            {post.postType || 'offer'}
          </span>
          {post.postType === 'offer' && post.expiresAt && <Countdown targetDate={post.expiresAt} compact />}
        </div>
        <h2>{post.title}</h2>
        <p>{post.content}</p>
        <div className="tag-row">
          {(post.tags || []).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      </div>
      <button className="comment-preview" onClick={openComments} aria-label="Open post comments">
        {latestComment ? (
          <>
            <span className="comment-preview-content">
              {renderCommentAuthor(latestComment)} {latestComment.content}
            </span>
            <span className="comment-preview-link">View comments</span>
          </>
        ) : previewError ? (
          <span className="comment-preview-muted">Comments unavailable</span>
        ) : (
          <span className="comment-preview-muted">Be the first to comment</span>
        )}
      </button>
      <dialog
        ref={commentsDialogRef}
        className="comments-dialog"
        aria-labelledby={`comments-title-${post._id}`}
        onClose={() => setShowComments(false)}
        onClick={(event) => {
          if (event.target === commentsDialogRef.current) commentsDialogRef.current.close()
        }}
      >
        <header className="comments-dialog-header">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2 id={`comments-title-${post._id}`}>Comments</h2>
          </div>
          <button
            className="icon-button comments-dialog-close"
            onClick={() => commentsDialogRef.current?.close()}
            aria-label="Close comments"
          >
            <X size={21} />
          </button>
        </header>
        {post.imageUrl && <img className="comments-photo" src={post.imageUrl} alt={post.title} />}
        <div className="comments-post-context">
          <strong>{post.title}</strong>
          <p>{post.content}</p>
        </div>
        <div className="comments-dialog-list">
          {isLoadingComments ? (
            <div className="loading-state">Loading comments...</div>
          ) : commentsError ? (
            <div className="empty-state">
              <p>We couldn’t load the comments.</p>
              <button className="primary-button" onClick={openComments}>
                Try again
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="empty-state">
              <MessageCircle size={22} />
              <p>No comments yet. Start the conversation.</p>
            </div>
          ) : (
            <ul className="comment-list">
              {comments.map((comment) => (
                <li key={comment._id}>
                  <div className="comment-author">{renderCommentAuthor(comment)}</div>
                  <p>{comment.content}</p>
                  <time>{formatDate(comment.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form className="comment-form comments-dialog-form" onSubmit={submitComment}>
          <input
            aria-label="Add a comment"
            placeholder="Write a comment *"
            required
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            maxLength={500}
          />
          <button type="submit" disabled={isSubmittingComment || !commentText.trim()}>
            {isSubmittingComment ? 'Posting...' : 'Post'}
          </button>
          {commentSubmitError && <p className="auth-message">{commentSubmitError}</p>}
        </form>
      </dialog>
    </article>
  )
}
