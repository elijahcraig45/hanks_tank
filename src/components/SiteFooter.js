import { Link } from 'react-router-dom';
import { SPORTS } from '../config/sports';
import { LEARN_BASE } from '../config/learn';
import './styles/SiteFooter.css';

/** A quiet footer on every page: the sports, Pick'em and the Learn write-ups. */
function SiteFooter() {
  return (
    <footer className="ht-footer">
      <div className="ht-footer-inner">
        <p className="ht-footer-brand">
          Hank&rsquo;s Tank <span>&middot; model predictions for MLB, NFL and college football</span>
        </p>
        <nav className="ht-footer-links" aria-label="Footer">
          {SPORTS.map((s) => (
            <Link key={s.key} to={s.home}>{s.label}</Link>
          ))}
          <Link to="/pickem">Pick&rsquo;em</Link>
          <Link to={LEARN_BASE} className="ht-footer-learn">How the models work</Link>
        </nav>
      </div>
    </footer>
  );
}

export default SiteFooter;
