import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          ✈ Thrift<span>Trip</span>
        </Link>
        <ul className="navbar__nav">
          <li><Link to="/privacy">Privacy</Link></li>
          <li><Link to="/terms">Terms</Link></li>
          <li><Link to="/cookies">Cookies</Link></li>
        </ul>
      </div>
    </nav>
  );
}
