import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">✈ Thrift<span>Trip</span></div>
          <div className="footer__copy">
            © {new Date().getFullYear()} Thrift Trip. All rights reserved.
          </div>
        </div>
        <ul className="footer__links">
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/terms">Terms of Service</Link></li>
          <li><Link to="/cookies">Cookie Policy</Link></li>
        </ul>
      </div>
    </footer>
  );
}
