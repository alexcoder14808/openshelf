import { Link } from 'react-router-dom';
import './pages.css';

export default function Terms() {
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1>Terms of Service</h1>
        <p>Last updated: [DATE] — please fill in before launch.</p>
      </div>

      <div style={{ color: '#40444c', lineHeight: 1.75, fontSize: '0.95rem' }}>
        <p>
          These Terms of Service ("Terms") govern your access to and use of OpenShelf (the
          "Service"), operated by [COMPANY NAME] ("OpenShelf," "we," "us," or "our"). By creating
          an account, joining a library, or administering a library on OpenShelf, you agree to
          these Terms. If you do not agree, do not use the Service.
        </p>

        <h2>1. What OpenShelf Is</h2>
        <p>
          OpenShelf is a network platform that lets independent individuals and organizations
          ("Library Administrators") operate their own digital libraries ("Libraries") within the
          OpenShelf system. Each Library Administrator is solely responsible for the content,
          collection, membership policies, and operation of their own Library. OpenShelf provides
          the underlying software platform; it does not select, curate, review, or endorse the
          content made available by any Library.
        </p>

        <h2>2. Content Uploaded by Library Administrators</h2>
        <p>
          Library Administrators may upload audiobooks, ebooks, cover images, library logos, and
          related metadata ("Library Content") to their own Library. <strong>OpenShelf does not
          pre-screen, monitor, review, or control Library Content, and has no obligation to do
          so.</strong> Library Administrators represent and warrant that they own or have all
          necessary rights, licenses, and permissions to upload, distribute, and make available
          any Library Content they add to their Library, and that doing so does not infringe any
          copyright, trademark, privacy, publicity, or other right of any third party, and does
          not violate any applicable law.
        </p>
        <p>
          OpenShelf is not a publisher or distributor of Library Content and does not control what
          Library Administrators choose to upload to their own, independently operated Libraries.
          OpenShelf's role is limited to providing the technical platform on which Library
          Administrators store and share content with their own members.
        </p>

        <h2>3. Copyright Complaints &amp; Takedowns</h2>
        <p>
          If you believe Library Content available on OpenShelf infringes your copyright, contact
          us at [DMCA/COPYRIGHT CONTACT EMAIL] with: (a) identification of the copyrighted work
          claimed to be infringed; (b) identification of the material you claim is infringing and
          its location on the Service; (c) your contact information; (d) a statement that you have
          a good-faith belief the use is unauthorized; and (e) a statement, under penalty of
          perjury, that the information is accurate and that you are authorized to act on behalf
          of the copyright owner. We may remove or disable access to reported content and/or
          terminate the accounts of repeat infringers, at our discretion, without prior notice.
        </p>

        <h2>4. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE AND ALL LIBRARY CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT
          WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT
          LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          NON-INFRINGEMENT, OR THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
          OPENSHELF DOES NOT WARRANT OR GUARANTEE THE ACCURACY, COMPLETENESS, LEGALITY, OR
          APPROPRIATENESS OF ANY LIBRARY CONTENT.
        </p>

        <h2>5. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OPENSHELF AND ITS OFFICERS,
          DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, REVENUE, OR PROFITS,
          ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE OR ANY LIBRARY CONTENT, REGARDLESS
          OF THE THEORY OF LIABILITY, EVEN IF OPENSHELF HAS BEEN ADVISED OF THE POSSIBILITY OF
          SUCH DAMAGES. OPENSHELF'S TOTAL AGGREGATE LIABILITY FOR ANY CLAIM ARISING FROM OR
          RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID
          OPENSHELF, IF ANY, IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) [AMOUNT, e.g. $100].
        </p>

        <h2>6. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless OpenShelf and its officers, directors,
          employees, and agents from and against any claims, liabilities, damages, losses, and
          expenses (including reasonable attorneys' fees) arising out of or in any way connected
          with: (a) your use of the Service; (b) any Library Content you upload, or that is
          uploaded to a Library you administer; (c) your violation of these Terms; or (d) your
          violation of any third party's rights, including intellectual property rights. This
          indemnification obligation applies in particular to Library Administrators with respect
          to Library Content in Libraries they operate.
        </p>

        <h2>7. Account Eligibility</h2>
        <p>
          You must be at least [AGE, e.g. 13] years old, or the age of digital consent in your
          jurisdiction, to create an OpenShelf account. If you are creating a Library or acting as
          a Library Administrator, you represent that you have the legal authority to enter into
          these Terms on behalf of yourself or any organization you represent.
        </p>

        <h2>8. Suspension &amp; Termination</h2>
        <p>
          OpenShelf may suspend or terminate your account, a Library, or specific Library Content
          at any time, with or without notice, for any reason, including suspected violation of
          these Terms, suspected infringement, or conduct we believe is harmful to the Service or
          other users.
        </p>

        <h2>9. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the Service after changes
          take effect constitutes acceptance of the revised Terms.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These Terms are governed by the laws of [JURISDICTION], without regard to its conflict
          of law principles. Any disputes shall be resolved in the courts located in
          [JURISDICTION].
        </p>

        <h2>11. Contact</h2>
        <p>Questions about these Terms can be sent to [CONTACT EMAIL].</p>

        <p style={{ marginTop: 32, fontSize: '0.85rem', color: '#9aa0ab' }}>
          See also our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
