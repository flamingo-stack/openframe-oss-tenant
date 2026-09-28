# Flamingo AI Privacy Policy

**Effective Date: 2025**  
**Applies to: All Flamingo AI products, including OpenFrame, OpenFrame SaaS, OpenMSP, and the Flamingo Website**


## 1. Definitions

**“Flamingo Software”** means all software products developed and released by Flamingo AI, Inc., including but not limited to OpenFrame, OpenFrame SaaS, OpenMSP, related agents, integrations, orchestration layers, user interfaces, binaries, and documentation.  

**“OpenFrame”** refers to the self-hosted remote monitoring and management (RMM) platform released by Flamingo AI.  

**“OpenFrame SaaS”** refers to the hosted version of OpenFrame operated by Flamingo AI at openframe.ai, where Flamingo AI processes customer data on the customer’s behalf. This is distinct from self-hosted OpenFrame deployments, which Flamingo AI does not operate and cannot access.  

**“OpenMSP”** refers to the community knowledge base, documentation, and related collaborative content contributed by users and curated by Flamingo AI.  

**“Flamingo Website”** refers to flamingo.cx and related domains controlled by Flamingo AI.  


## 2. Scope

This Privacy Policy explains how Flamingo AI, Inc. (“Flamingo AI”) collects, uses, and protects personal data in connection with Flamingo Software, including OpenFrame, OpenFrame SaaS, OpenMSP, and the Flamingo Website.  


## 3. Data Collection

- **Self-Hosted Deployments (OpenFrame):** Flamingo AI does not access or collect customer data. All data remains fully under customer control. This applies to self-hosted deployments only; for the hosted service, see section 4.  
- **OpenMSP (Community):** Flamingo AI collects account registration details (username, email), and any content you voluntarily submit (posts, documentation, comments). Metadata (such as IP addresses and logs) may be collected for security, fraud prevention, and moderation.  
- **Website:** Limited analytics (IP addresses, device/browser data, cookies) are collected for performance, security, and improvements.  
- **Support Engagements:** Customers may voluntarily provide logs or diagnostic data for troubleshooting. Such data is deleted promptly after resolution.  


## 4. OpenFrame SaaS

Where a customer uses OpenFrame SaaS, Flamingo AI processes the following on the customer’s behalf:

- **Account data** — for each user who signs in, including through Google or Microsoft single sign-on: name, email address, the identifier that identity provider uses for the account, whether the provider reported the address as verified, and the time of the most recent sign-in. Where a user signs in with Google, we also store the profile picture URL that Google supplies; Microsoft does not supply one. When an organization first registers, we also record the IP address and browser user agent used.  
- **Operational data** — data collected by the OpenFrame agent from the customer’s managed endpoints, together with support conversations, tickets, and records of administrative actions performed in the product.  
- **Connected directory data** — where a customer connects a Google Workspace tenant, the data described in section 5; where a customer connects a Microsoft 365 tenant, the data described in section 6.  

Each customer’s environment runs with its own service instances and its own namespace, and customer records are scoped to that customer. Data is encrypted in transit.

Flamingo AI does not sell customer data and does not use it to train artificial intelligence or machine learning models.


## 5. Google User Data

**What we access.** When a Google Workspace super administrator grants consent for their tenant, we access data through Google's Admin SDK Directory, Reports and Licensing APIs: users, groups and group memberships, organizational units, domains, mobile devices, administrative roles, licence assignments, the third-party applications users have authorised in the tenant, and audit activity from Google's Admin and Google Groups activity reports, which includes the acting account's email address, IP address and the details of each event. The consent request also includes the OpenID and email scopes, so that we can confirm which administrator granted it, and the Directory write permissions described below. We do not request or access Gmail, Google Drive, Google Calendar, Google Chat, Google Meet, or Google Photos data.

**How we use it.** To provide IT administration features to the administrators who manage that tenant, including through OpenFrame's AI assistant when an administrator asks it to retrieve or act on that data.

**Actions we take on the customer's behalf.** The Directory write permissions listed above form part of the consent a Google Workspace super administrator grants when connecting a tenant, and OpenFrame can make no change unless that consent has been granted. An administrator can also switch write-back off for a connection, which stops OpenFrame making any change while directory data continues to synchronize. Where write-back is on, OpenFrame can create a user account, update a user's first name, last name or job title, suspend or restore a user's account, move a user to another organizational unit, create, update or delete a group, and add or remove group members. OpenFrame does not change licence assignments, delete user accounts, or perform any action on a device. It does not reset the password of an existing account. Changes are made only in response to a request from an OpenFrame user: no scheduled or background process modifies your users, groups, group memberships or organizational units. OpenFrame does run a background job that maintains the notification channels it registers with Google in order to receive directory updates; those channels are OpenFrame's own subscriptions, and they are removed when the connection is deleted. Each change is recorded against the identity of the OpenFrame user who requested it, and Google's own administrative audit log records the same action independently.

**Who we share it with.** To generate a response to an administrator's request, the relevant data is sent to the AI provider configured for that customer — Anthropic (Claude API) or OpenAI — solely to produce that response. Under those providers' commercial API terms, customer content is not used to train their models. We do not sell Google Workspace data, and we do not transfer it to advertising platforms, data brokers, or resellers. It is not shared with any other third party, except where an administrator asks us to include information in a support request.

**How we protect it.** Google user data is encrypted in transit. The OAuth refresh token issued for a connected tenant is encrypted with Google Cloud Key Management Service under a key created for that customer, and is never stored or transmitted by us in unencrypted form.

**How long we keep it, and how it is deleted.** Directory data is retained for as long as the connection exists. When the connection is deleted, we revoke the OAuth grant with Google and delete the directory data synchronized through it; if the revocation cannot be completed, you can remove the grant yourself from your Google Account's third-party access settings. Other records are retained for as long as needed to provide the service, and you can request deletion by contacting privacy@flamingo.so. Copies may remain in backups for a limited period after deletion.

**Limited Use.** OpenFrame's use of information received from Google Workspace APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) and the [Google Workspace API User Data and Developer Policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy), including the Limited Use requirements. Data received from Google Workspace APIs is not used to develop, improve, or train non-personalized artificial intelligence or machine learning models, whether by Flamingo AI or by any third party.


## 6. Microsoft 365 Data

**What we access.** When a Global Administrator grants tenant-wide admin consent, we access data through the Microsoft Graph API. Consent is granted separately for each set of permissions we use. Always: the users in your directory together with their names, job titles, departments and the licences assigned to them; your groups and group memberships; your organization and its verified domains; the subscriptions your tenant holds and how many seats are in use; the devices registered in Entra ID; and the enterprise applications in your tenant together with the app role assignments that grant people access to them. Where audit synchronization is enabled, we additionally read your directory audit activity. Where administrative role synchronization is enabled, we read which directory roles exist and who holds them. We do not access Exchange Online mailboxes, OneDrive or SharePoint files, calendars, Teams chats or meetings, Intune device management, or sign-in logs.

**How we use it.** To provide IT administration features to the administrators who manage that tenant, including through OpenFrame's AI assistant when an administrator asks it to retrieve or act on that data.

**Actions we take on the customer's behalf.** Making changes requires a further, separate admin consent for the write permissions; until a Global Administrator grants it, Microsoft refuses every change we attempt. Where write-back is enabled, OpenFrame can create a user account, update a user's display name, first name, last name or job title, enable or disable a user's sign-in, create, update or delete a group, and add or remove group members. OpenFrame does not change licence assignments, reset passwords for existing accounts, delete user accounts, perform any action on a device, or assign administrative roles. Changes are made only in response to a request from an OpenFrame user; no scheduled or background process modifies your users, groups or group memberships. OpenFrame does run a background job that maintains the change-notification subscriptions it registers with Microsoft in order to receive directory updates.

**Who we share it with.** As described in section 5 for Google Workspace data: the relevant data is sent to the AI provider configured for that customer solely to generate a response, and is not sold, transferred to advertising platforms, data brokers or resellers, or shared with any other third party except where an administrator asks us to include information in a support request.

**How we protect it.** Microsoft 365 data is encrypted in transit. We store no credential of yours: access is granted as a service principal of OpenFrame's own application inside your Entra directory, and OpenFrame's own application credentials are held in our secret store, never in the customer database.

**How long we keep it, and how it is deleted.** Directory data is retained for as long as the connection exists. When the connection is deleted, we remove the change-notification subscriptions and delete the directory data synchronized through it. Because the authorization lives in your own directory rather than as a token held by us, access ends fully when you remove the OpenFrame application from your Entra portal.


## 7. Legal Basis for Processing (GDPR)

Flamingo AI processes personal data only when:  
- You have given consent (e.g., submitting community contributions to OpenMSP, website cookies).  
- Processing is necessary for the performance of a contract (e.g., account creation, support requests).  
- Processing is required by law.  
- Processing is necessary for legitimate interests (e.g., community moderation, improving security and services).  


## 8. Data Subject Rights

Depending on your location (EU/UK under GDPR, California under CCPA, or similar laws), you may have the right to:  
- Access your personal data.  
- Rectify inaccurate data.  
- Request deletion (“right to be forgotten”).  
- Restrict or object to processing.  
- Request portability of your data.  
- Withdraw consent at any time.  
- Opt out of sale or sharing of personal data (CCPA).  
- Lodge a complaint with a supervisory authority (for EU/UK residents).  

Requests can be submitted to **privacy@flamingo.so**.  


## 9. Data Transfers

- Flamingo AI does not transfer customer data from self-hosted deployments.  
- For OpenFrame SaaS, customer data may be transmitted to the AI providers named in section 5, solely to generate responses to the customer’s own requests.  
- If personal data must cross borders (e.g., for support or OpenMSP account services), Flamingo AI uses safeguards such as Standard Contractual Clauses.  


## 10. Data Retention

- Customer-controlled data in OpenFrame remains under customer control.  
- For OpenFrame SaaS, see sections 4, 5 and 6.  
- Support data is retained only for resolution, typically deleted within 24 hours.  
- Website analytics are retained no longer than necessary for stated purposes.  
- OpenMSP contributions remain public unless removed by you or as part of community moderation. Account data may be deleted upon request.  


## 11. Children’s Privacy

Flamingo AI products are not directed to children under 16 in the EU/UK or under 13 in the US. Flamingo AI does not knowingly collect data from minors.  


## 12. Security

Flamingo AI implements reasonable technical and organizational safeguards, but **customers remain fully responsible for the security of their own infrastructure**.  


## 13. Responsibility Disclaimer

Use of Flamingo AI products is entirely at your own risk. Customers are solely responsible for compliance with applicable data protection laws when deploying Flamingo AI software or participating in OpenMSP.  


## 14. Text Messaging Opt-In Data

Text messaging originator opt-in data and consent will not be shared with any third parties, excluding aggregators and providers of the Text Message services.


## 15. Contact Information

**Privacy Inquiries:** privacy@flamingo.so  
**General Information:** info@flamingo.so  

---

*By using Flamingo AI products, you acknowledge and agree to this Privacy Policy.*  

