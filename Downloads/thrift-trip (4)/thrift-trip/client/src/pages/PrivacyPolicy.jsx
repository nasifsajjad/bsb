export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <h1>Privacy Policy</h1>
      <p className="policy-date">Last updated: January 2025</p>

      <p>
        Thrift Trip ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
        how we collect, use, and handle information when you use our service at thrifttrip.app.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        Thrift Trip is designed with privacy in mind. We do not create user accounts, require registration, or 
        store personal data. The only information processing that occurs is:
      </p>
      <ul>
        <li><strong>IP Address (temporary):</strong> When you first load the application, your IP address is 
        used to detect your approximate location and suggest a nearby departure airport. This is processed 
        in real-time and is not stored or logged by Thrift Trip.</li>
        <li><strong>Search parameters:</strong> Your search criteria (origin airport, travel dates, trip length, 
        and number of travelers) are sent to our server to retrieve flight and hotel results. These are not 
        associated with any identifier and are not stored after the response is delivered.</li>
        <li><strong>Server logs:</strong> Our hosting provider may retain standard server access logs (IP address, 
        request timestamp, and response status) for up to 30 days for security and debugging purposes.</li>
      </ul>

      <h2>2. Third-Party Services</h2>
      <p>
        Thrift Trip integrates with the following third-party services to provide search results. Each has its 
        own privacy policy that governs their data practices:
      </p>
      <ul>
        <li><strong>SerpApi</strong> — Used to search Google Flights and Google Hotels. Search queries include 
        origin/destination codes and dates. No personal identifiers are shared. See SerpApi's privacy policy 
        at serpapi.com/privacy.</li>
        <li><strong>Google AI (Gemini)</strong> — Used to generate estimated activity costs and travel itineraries. 
        Destination name and stay length are shared; no personal data is included. See Google's privacy policy 
        at policies.google.com/privacy.</li>
        <li><strong>ipapi.co</strong> — Used for IP-based geolocation to suggest your nearest airport. Your IP 
        address is sent to their service. See their privacy policy at ipapi.co/privacy.</li>
        <li><strong>Google Flights / Google Hotels</strong> — When you click "Book Flight" or "Book Hotel," you 
        are redirected to Google's travel platforms, which have their own terms and privacy policies.</li>
      </ul>

      <h2>3. Cookies and Tracking</h2>
      <p>
        Thrift Trip does not use tracking cookies, advertising cookies, or third-party analytics cookies. 
        We use only essential session cookies required for the application to function. We do not track 
        your activity across other websites. For full details, see our Cookie Policy.
      </p>

      <h2>4. How We Use Information</h2>
      <p>The minimal data processed is used solely to:</p>
      <ul>
        <li>Return relevant flight and hotel search results for your query</li>
        <li>Detect your location to suggest a nearby departure airport</li>
        <li>Generate AI-powered travel cost estimates and itineraries</li>
        <li>Maintain application security and prevent abuse</li>
      </ul>
      <p>We do not use your information for advertising, profiling, or sale to third parties.</p>

      <h2>5. Data Retention</h2>
      <p>
        Search results are cached server-side for up to 6 hours to reduce API calls and improve performance. 
        This cache contains only travel data (flight prices, hotel rates) keyed by a hash of the search 
        parameters — no personal identifiers are stored. Cache entries are automatically deleted after 6 hours.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Because we do not store personal data linked to identifiers, there is no personal profile to access, 
        correct, or delete. If you have questions about data processed by our third-party providers, please 
        refer to their respective privacy policies.
      </p>
      <p>
        If you are located in the European Economic Area (EEA), United Kingdom, or California, and have 
        specific privacy requests related to any data our hosting provider may retain, contact us at 
        privacy@thrifttrip.app.
      </p>

      <h2>7. Children's Privacy</h2>
      <p>
        Thrift Trip is not directed at children under the age of 13. We do not knowingly collect information 
        from children. If you believe a child has used our service in a way that raises privacy concerns, 
        please contact us.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy periodically. Continued use of the service after changes are 
        posted constitutes acceptance of the revised policy. The "last updated" date at the top of this 
        page will reflect any changes.
      </p>

      <h2>9. Contact</h2>
      <p>
        For privacy-related questions or concerns, contact us at privacy@thrifttrip.app.
      </p>
    </div>
  );
}
