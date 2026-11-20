import { ArrowRight, Briefcase, Building2, Heart, MessageCircle, Search, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { useAccount } from '../../account/AccountContext'

export default function AboutPage() {
  const { isBusiness } = useAccount()
  const steps = [
    {
      icon: UserRound,
      label: 'People',
      title: 'Start with what you love',
      description: 'Consumers bring their interests and discover independent businesses in their city.',
    },
    {
      icon: Building2,
      label: 'Local businesses',
      title: 'Share what you make',
      description: 'Businesses tell their story through posts, promotions, and time-bound offers.',
    },
    {
      icon: Briefcase,
      label: 'Connections',
      title: 'Make something together',
      description: 'Businesses can connect and turn shared ideas into meaningful collaborations.',
    },
  ]

  return (
    <section className="about-page">
      <header className="about-hero">
        <p className="eyebrow">The Localyze ecosystem</p>
        <h1>Local discovery works better together.</h1>
        <p>
          Localyze brings people and independent businesses into one community—where discovering a place can
          lead to a follow, a conversation, or a collaboration.
        </p>
        <Link className="primary-button" to={isBusiness ? '/' : '/explore'}>
          <Search size={16} /> {isBusiness ? 'See your local network' : 'Explore local posts'}
        </Link>
        <div className="about-hero-art" role="img" aria-label="Local artisan at work" />
      </header>

      <div className="about-section-heading">
        <p className="eyebrow">How it comes together</p>
        <h2>One ecosystem, three ways to connect.</h2>
      </div>
      <div className="about-steps">
        {steps.map(({ icon: Icon, label, title, description }, index) => (
          <article className="about-step" key={label}>
            <div className="about-step-top">
              <span>0{index + 1}</span>
              <Icon size={20} />
            </div>
            <p className="eyebrow">{label}</p>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <section className="about-loop">
        <div className="about-loop-icon">
          <Heart size={20} />
          <MessageCircle size={20} />
        </div>
        <div>
          <p className="eyebrow">A community, not just a directory</p>
          <h2>Discover. Engage. Grow.</h2>
          <p>
            Find businesses through local posts, follow the ones you want to keep up with, and engage with the
            people behind them. For businesses, every post can help build an audience—and every connection can
            open the door to working together.
          </p>
        </div>
        <Link className="about-search-link" to="/search">
          Find a business <ArrowRight size={16} />
        </Link>
      </section>
    </section>
  )
}
