import { Link } from 'react-router-dom';
import './pages.css';

export default function Privacy() {
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1>Privacy Policy</h1>
        <p>Last updated: September 15, 2026</p>
      </div>

      <div style={{ color: '#40444c', lineHeight: 1.75, fontSize: '0.95rem' }}>
        <p>
          This Privacy Policy explains what information OpenShelf ("we," "us," "our") collects,
          how we use it, and your choices, when you use the OpenShelf platform (the "Service"). We
          aim to handle personal information in accordance with the Australian Privacy Principles
          under the Privacy Act 1988 (Cth).
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following categories of information:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Account information:</strong> email address, display name, and password (stored securely, hashed, never in plain text).</li>
          <li><strong>Library membership information:</strong> which Libraries you join, your card number, and an encrypted copy of your chosen PIN.</li>
          <li><strong>Usage information:</strong> books borrowed, held, or returned; audiobook listening position and ebook reading progress; bookmarks.</li>
          <li><strong>Content you or a Library Administrator upload:</strong> book covers, audio files, ebook files, and library logos, if you administer a Library.</li>
          <li><strong>Technical information:</strong> basic log and device information collected automatically to operate and secure the Service.</li>
        </ul>

        <h2>2. How We Use Information</h2>
        <p>We use the information above to:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Operate core features — accounts, library membership, borrowing, holds, and the audiobook/ebook readers.</li>
          <li>Save your reading and listening progress across sessions.</li>
          <li>Enforce lending limits, hold queues, and library-specific policies set by Library Administrators.</li>
          <li>Maintain the security and integrity of the Service, including detecting misuse.</li>
          <li>Communicate with you about your account, such as email verification.</li>
        </ul>

        <h2>3. How Information Is Shared</h2>
        <p>
          We do not sell your personal information. Information is shared only in these
          circumstances:
        </p>
        <ul style={{ paddingLeft: 20 }}>
          <li>
            <strong>With Library Administrators:</strong> a Library's Administrators can see who
            holds a card at their Library, and its membership/lending status, but never your
            plaintext PIN or password.
          </li>
          <li>
            <strong>With service providers:</strong> OpenShelf is built on Supabase, which
            provides authentication, database, storage, and hosting infrastructure and processes
            data on our behalf under its own data processing terms.
          </li>
          <li>
            <strong>For legal reasons:</strong> if required to comply with a legal obligation, or
            to protect the rights, property, or safety of OpenShelf, our users, or the public.
          </li>
        </ul>

        <h2>4. Data Storage &amp; Security</h2>
        <p>
          Card PINs are stored encrypted, not in plain text. Passwords are hashed by our
          authentication provider and never stored or visible to OpenShelf staff. Access to
          Library data is restricted using database-level row security so that members and
          administrators can only see what they're entitled to see.
        </p>

        <h2>5. Local Storage &amp; Cookies</h2>
        <p>
          The Service uses your browser's local storage to remember your active Library,
          in-progress playback position, and similar preferences on your device. This is not used
          for cross-site tracking or advertising.
        </p>

        <h2>6. Your Choices</h2>
        <p>
          You may update your display name at any time. You may leave a Library, which removes
          your membership and card for that Library. You can request access to, or correction of,
          the personal information we hold about you, or delete your OpenShelf account entirely,
          by contacting us at pixelpetshelter@gmail.com.
        </p>

        <h2>7. Children's Privacy</h2>
        <p>
          The Service is not directed at children under 16, and we do not knowingly collect
          personal information from children under that age. If you believe a child has provided
          us personal information, contact us at pixelpetshelter@gmail.com.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Continued use of the Service after
          changes take effect constitutes acceptance of the revised policy.
        </p>

        <h2>9. Contact</h2>
        <p>Questions about this Privacy Policy can be sent to pixelpetshelter@gmail.com.</p>

        <p style={{ marginTop: 32, fontSize: '0.85rem', color: '#9aa0ab' }}>
          See also our <Link to="/terms">Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}
