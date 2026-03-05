export default function CookiePolicy() {
  return (
    <div className="policy-page">
      <h1>Cookie Policy</h1>
      <p className="policy-date">Last updated: January 2025</p>

      <p>
        This Cookie Policy explains how Thrift Trip uses cookies and similar technologies when you visit 
        our website. We have designed Thrift Trip to use as few cookies as possible while maintaining 
        a functional, fast experience.
      </p>

      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files placed on your device when you visit a website. They allow the website 
        to remember information about your visit. Cookies can be "session cookies" (deleted when you close 
        your browser) or "persistent cookies" (stored for a defined period).
      </p>

      <h2>2. Cookies We Use</h2>
      <p>
        Thrift Trip uses only essential, functional cookies. We do not use advertising cookies, tracking 
        cookies, or social media cookies of any kind.
      </p>
      <ul>
        <li>
          <strong>Session state (essential):</strong> Your browser may store temporary session data as part 
          of normal React application behavior (e.g., maintaining your search state during your visit). 
          This data is stored in memory and is not a persistent cookie — it is cleared when you close 
          the browser tab.
        </li>
        <li>
          <strong>Vite/browser caching:</strong> Static assets (JavaScript, CSS, fonts) may be cached by 
          your browser to improve load performance on return visits. This is standard browser behavior, 
          not a cookie set by Thrift Trip.
        </li>
      </ul>

      <h2>3. Cookies We Do NOT Use</h2>
      <p>Thrift Trip explicitly does not use:</p>
      <ul>
        <li>Analytics cookies (e.g., Google Analytics, Mixpanel)</li>
        <li>Advertising or retargeting cookies (e.g., Meta Pixel, Google Ads)</li>
        <li>Social media cookies (e.g., Facebook, Twitter/X login)</li>
        <li>Persistent user preference cookies</li>
        <li>Cross-site tracking cookies</li>
      </ul>

      <h2>4. Third-Party Cookies</h2>
      <p>
        When you click "Book Flight" or "Book Hotel" and are redirected to Google Flights or Google Hotels, 
        those platforms will set their own cookies governed by Google's cookie policy. Thrift Trip has no 
        control over cookies set by third-party websites after you leave our platform.
      </p>
      <p>
        Google Fonts, used to load our display typefaces, may set cookies or log requests as part of their 
        CDN infrastructure. We use Google Fonts for performance via the preconnect directive. For details, 
        see Google's privacy documentation.
      </p>

      <h2>5. Managing Cookies</h2>
      <p>
        You can control and delete cookies through your browser settings. Most browsers allow you to:
      </p>
      <ul>
        <li>View all stored cookies and delete selected ones</li>
        <li>Block third-party cookies</li>
        <li>Block all cookies (note: this may affect website functionality)</li>
        <li>Set cookies to be cleared when you close the browser</li>
      </ul>
      <p>
        Because Thrift Trip only uses essential/session data, blocking cookies will not meaningfully impact 
        your experience on our platform.
      </p>

      <h2>6. Do Not Track</h2>
      <p>
        Thrift Trip respects Do Not Track (DNT) browser signals. Because we do not use tracking technologies, 
        our behavior is consistent regardless of your DNT setting.
      </p>

      <h2>7. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy periodically. Continued use of the service after changes are posted 
        constitutes acceptance of the revised policy.
      </p>

      <h2>8. Contact</h2>
      <p>
        For questions about our cookie practices, contact us at privacy@thrifttrip.app.
      </p>
    </div>
  );
}
