export default function AuthStory({ isBusiness = true }) {
  return (
    <aside className="auth-story">
      <p className="eyebrow">Made for your neighbourhood</p>
      <h2>
        {isBusiness ? 'Small business.' : 'Your neighbourhood.'}
        <br />
        <em>{isBusiness ? 'Local belonging.' : 'Full of possibility.'}</em>
      </h2>
      <p>
        {isBusiness
          ? 'Share your work. Meet your neighbours. Grow together.'
          : 'Find a new favourite. Follow local makers. Feel at home.'}
      </p>
      <figure>
        <img
          src="/images/local-studio.png"
          alt="An artisan arranging handmade cups in a neighbourhood studio"
        />
        <figcaption>Good things start close to home.</figcaption>
      </figure>
    </aside>
  )
}
