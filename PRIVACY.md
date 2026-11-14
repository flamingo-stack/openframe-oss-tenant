# Flamingo AI Privacy Policy

**Version:** 2.2  
**Effective date:** December 1, 2026  
**Applies to:** All Flamingo AI products, including OpenFrame, OpenFrame SaaS, OpenMSP, and the Flamingo Website


## 1. Definitions

**“Flamingo Software”** means all software products developed and released by Flamingo AI, Inc., including but not limited to OpenFrame, OpenFrame SaaS, OpenMSP, related agents, integrations, orchestration layers, user interfaces, binaries, and documentation.  

**“OpenFrame”** refers to the self-hosted remote monitoring and management (RMM) platform released by Flamingo AI.  

**“OpenFrame SaaS”** refers to the hosted version of OpenFrame operated by Flamingo AI at openframe.ai, where Flamingo AI processes customer data on the customer’s behalf. This is distinct from self-hosted OpenFrame deployments, which Flamingo AI does not operate and cannot access.  

**“OpenMSP”** refers to the community knowledge base, documentation, and related collaborative content contributed by users and curated by Flamingo AI.  

**“Flamingo Website”** refers to flamingo.run, openframe.ai, openmsp.ai and related domains controlled by Flamingo AI.  


## 2. Scope

This Privacy Policy explains how Flamingo AI, Inc. (“Flamingo AI”) collects, uses, and protects personal data in connection with Flamingo Software, including OpenFrame, OpenFrame SaaS, OpenMSP, and the Flamingo Website.  


## 3. Data Collection

- **Self-Hosted Deployments (OpenFrame):** Flamingo AI does not access or collect customer data. All data remains fully under customer control. This applies to self-hosted deployments only; for the hosted service, see section 4.  
- **OpenMSP (Community):** Flamingo AI collects account registration details (username, email), and any content you voluntarily submit (posts, documentation, comments). For signed-in users we record each page viewed, with IP address, and keep that record for 365 days for security, fraud prevention, and moderation.  
- **Website:** See section 3.1.  
- **Support Engagements:** Customers may voluntarily provide logs or diagnostic files for troubleshooting. See section 10.  

### 3.1 Flamingo Website

- **Analytics and advertising measurement.** The Website loads Google Tag Manager when you open a page. It loads Google Analytics, PostHog, HubSpot tracking, the Meta pixel, the Reddit pixel, the LinkedIn Insight tag, Ahrefs Analytics and Snitcher. They collect IP address, device and browser data, the pages you view, your clicks and scrolling, the referring page and campaign parameters, and they set cookies or similar identifiers (section 16). A booked meeting is also reported to Google Ads.  
- **Session recording.** PostHog records visits to the Website: pages, mouse movement, clicks, what is shown on the screen, and messages in the browser console. It also builds heatmaps.  
- **Company identification.** Snitcher (on flamingo.run) and Leadsy (on openmsp.ai) use your IP address to identify the company you are visiting from.  
- **Sign-up pages.** When you type an email address on a sign-up or sign-in page, we link it to your earlier visits in PostHog, including when you do not submit the form.  
- **Identifiers passed between our sites.** When you follow a link from one of our sites to another, we pass analytics and advertising identifiers in the link so that the visit is counted as one.  
- **Forms.** When you submit a form (contact, demo or meeting booking, waitlist, community sign-up) we collect what you enter: typically name, work email, company, job title, company size, LinkedIn URL, phone number if you give one, and your message. We also record your IP address, country, browser user agent, the referring page, campaign parameters and advertising click identifiers. We store the submission, share it with our team and may send it to HubSpot, our customer relationship system.  
- **Information from public sources.** We may add publicly available information about you and your company to the record, such as your professional profile, your employer and its size. We use an automated web search through Anthropic (Claude API) for this.  
- **Unfinished forms.** While you fill in a form, the Website saves what you have entered. Only identifying fields are saved (name, email, company, job title, company size, LinkedIn URL); for free-text and phone fields we record only that they were filled. Passwords and payment details are never saved. If you gave an email address and left before submitting, we handle what was saved in the same way as a submission, so that our team can follow up.  
- **Meeting bookings.** When you book a meeting from a landing page we send the booking event to Meta's Conversions API with your email address and name in hashed (SHA-256) form, the Meta browser identifiers if present, and your IP address and browser user agent, to measure advertising.  
- **Website chat.** The assistant on the Website stores the messages you send and its answers, together with your IP address, country, browser user agent, the page you were on and, if you are signed in, your email address. Visitors who are not signed in receive a cookie holding a random identifier so that earlier conversations can be shown to them again. Your messages are sent to Anthropic (Claude API) to generate the answer and to OpenAI to search our documentation.  
- **Calls and meetings.** Calls and video meetings with our team may be recorded and transcribed with Google Meet, which shows every participant that recording is on, or with Fireflies, a notetaker that joins the meeting visibly. Recordings and transcripts are stored by us and processed by the providers listed in section 15 to transcribe, summarize and edit them. Tell us at the start of the call if you do not want it recorded.  
- **Abuse prevention.** We use automated bot detection on forms, which processes IP address and browser signals, and we limit how many chat and form requests one IP address can make.  


## 4. OpenFrame SaaS

Where a customer uses OpenFrame SaaS, Flamingo AI processes the data below. Operational data, remote session recordings, AI requests and connected directory data are processed on the customer’s behalf. Account, sign-up, customer relationship, product analytics and billing data are also used by Flamingo AI for its own purposes: managing accounts and billing, communicating with customers, measuring advertising and understanding how the product is used.

- **Account data** — for each user: name, email address, role, account status and the time of the most recent sign-in. For a user who signs in through Google, Microsoft or Apple: the identifier that provider uses for the account and whether the provider reported the address as verified. Where a user signs in with Google, we also store the profile picture URL that Google supplies. Where a user signs in with Apple, we store the refresh token Apple issues, in encrypted form. Where a user signs in with a password, we store a bcrypt hash of it. Where a user installs the mobile app, we store the device's push notification token.  
- **Sign-up data** — when an organization first registers we record the IP address and browser user agent used, how you heard about us, the page you arrived on, campaign parameters and advertising click identifiers (Google, Meta, Reddit, LinkedIn), the Meta and Reddit browser identifiers, and the HubSpot visitor cookie. We send the sign-up to Meta's and Reddit's Conversions APIs with the email address in hashed (SHA-256) form (and, for Meta, the name in hashed form), a hashed user identifier, the IP address, the browser user agent and those browser and click identifiers, to measure advertising. Reddit also receives the identifier of the new workspace. We send Meta a further event when the status of the account in our sales records changes.  
- **Customer relationship records** — we keep in HubSpot each user's name, email address and status, the sign-up data above, the organization's name, workspace address, billing email, subscription and device counts, and events such as a device being added or the dashboard being used.  
- **Operational data** — data collected by the OpenFrame agent from the customer’s managed endpoints (device identity and inventory, installed software, vulnerabilities, query results, script and command output, agent logs), remote access session events, support conversations, tickets, and records of administrative actions performed in the product.  
- **Remote session recordings** — where recording is on, the screen of each remote desktop session is recorded. Recordings are kept for 90 days unless a user of the customer places a hold on one.  
- **AI requests** — the content of each request an OpenFrame user makes to the AI assistant, the data the assistant retrieves to answer it, and the response, sent to AI providers as described in section 5. We keep a count of the tokens used for billing. We store the conversations, and for the technician assistant we also store facts derived from them so that later conversations can use them. Flamingo AI records and reviews requests and responses as described in section 5.  
- **Notifications** — push notifications are delivered through Google Firebase Cloud Messaging and Apple. A notification can contain up to the first 200 characters of a message.  
- **Product analytics** — the OpenFrame SaaS web and desktop applications load Google Tag Manager and PostHog, on sign-in pages and inside the signed-in product. They receive the user's identifier and email address and record how the product is used.  
- **Billing data** — the plan, the daily count of managed devices, token purchases and usage, and invoices. Payments are processed by Stripe, which also collects and holds the billing address, any tax ID and the card details; Flamingo AI does not store them.  
- **Email** — account email (verification, password reset, invitations, billing) is sent through HubSpot.  
- **Connected directory data** — where a customer connects a Google Workspace tenant, the data described in section 5; where a customer connects a Microsoft 365 tenant, the data described in section 6.  

Each customer's data is logically separated from other customers' data, and customer records are scoped to that customer.

Data is encrypted in transit and at rest. Connections over the internet use TLS. OpenFrame SaaS runs on Google Cloud, which encrypts traffic between servers inside its network and encrypts stored data.

Flamingo AI does not sell customer data and does not use it to train artificial intelligence or machine learning models.


## 5. Google User Data

**What we access.** When a Google Workspace super administrator grants consent for their tenant, we access data through Google's Admin SDK Directory, Reports and Licensing APIs:

- users: name, email addresses, job title, department, phone numbers, locations, manager, organizational unit, account state, creation date, last sign-in time, 2-Step Verification status and whether the user is an administrator;  
- users deleted within Google's restore period (identifier, email address, deletion time);  
- groups and group memberships, organizational units, domains, mobile devices, administrative roles and who holds them, and licence assignments;  
- the third-party applications a user has authorised, read when an OpenFrame user asks about that user;  
- audit activity from Google's Admin and Google Groups activity reports, which includes the acting account's email address, IP address and the details of each event.  

The consent request also includes the OpenID and email scopes, so that we can confirm which administrator granted it, and write permissions for users, groups and group members. Two of the permissions Google grants are wider than our use of them: the licensing permission and the user security permission both allow changes, and OpenFrame uses them only to read. We do not request or access Gmail, Google Drive, Google Calendar, Google Chat, Google Meet, or Google Photos data.

**How we use it.** To provide IT administration features to the administrators who manage that tenant, including through OpenFrame's AI assistant when an administrator asks it to retrieve or act on that data.

**Actions we take on the customer's behalf.** OpenFrame can make no change unless the super administrator has granted the write permissions. An administrator can also switch write-back off for a connection, which stops OpenFrame making any change while directory data continues to synchronize. Where write-back is on, OpenFrame can:

- create a user account, with a generated temporary password that must be changed at first sign-in;  
- update a user's first name, last name, job title, department, phone numbers or manager;  
- suspend or restore a user's account;  
- move a user to another organizational unit;  
- create, update or delete a group;  
- add a group member as member, manager or owner, or remove a group member.  

OpenFrame does not assign or remove licences, delete user accounts, grant administrative roles, or perform any action on a device. It does not reset the password of an existing account. Google may assign a licence itself when a user is created or moved, under the customer's own settings. Changes are made only in response to a request from an OpenFrame user: no scheduled or background process modifies your users, groups, group memberships or organizational units. Where OpenFrame registers notification channels with Google to receive directory updates, a background job maintains them; those channels are OpenFrame's own subscriptions, and they are stopped when the connection is deleted. OpenFrame records each change with the identity of the OpenFrame user who requested it. Google's own administrative audit log records the same action under the administrator who granted consent.

**Who we share it with.** To generate a response to an administrator's request, the relevant data is sent to the AI provider selected for the assistant: Anthropic (Claude API) or OpenAI. Whichever provider is selected, some supporting functions use a fixed provider. Anthropic is used to shorten long conversations, to name conversations and to search the web. OpenAI is used to extract facts the assistant should remember, to review the quality of the assistant's answers, to check commands before they run, and to decide when an end-user conversation should be handed to a technician. Conversation content, which can include directory data the assistant retrieved, is therefore sent to both providers. Under those providers' commercial API terms, customer content is not used to train their models. Each provider may retain requests and responses for up to 30 days to detect abuse and misuse, and OpenAI may review retained content for that purpose.

Flamingo AI records AI requests and responses in its operational logs for up to 90 days. Flamingo AI engineers read those logs only where it is necessary to investigate a bug or abuse, or to comply with applicable law. They read a specific conversation for any other reason only after an administrator of that customer has agreed to it, for example in a support request. To find faults in the assistant, an automated review reads technician conversations and sends findings to an internal Flamingo AI Slack channel. A finding contains a description of the problem written by the AI model and a link to the conversation, which only users of that customer can open; the description is not anonymized. We may also publish anonymized descriptions of how the AI assistant is used, including in our Slack community, with customer, client and personal identifiers removed by our team. We do not sell Google Workspace data, and we do not transfer it to advertising platforms, data brokers, or resellers. Apart from the AI providers and the internal channel described above, it is not shared with any third party, except where an administrator asks us to include information in a support request.

**How we protect it.** Google user data is encrypted in transit between Google and OpenFrame. The OAuth refresh token issued for a connected tenant is encrypted with Google Cloud Key Management Service under a key created for the OpenFrame customer that owns the connection, and is stored only in encrypted form.

**How long we keep it, and how it is deleted.** Directory data is retained for as long as the connection exists. A connection can be disconnected or deleted. When it is disconnected, we delete the stored refresh token and keep the synchronized directory data. When it is deleted, we delete the stored refresh token and the directory data synchronized through it. Audit events already received remain in our logs for up to 90 days. In neither case do we revoke the grant at Google: to end OpenFrame's access, remove it in the Google Admin console or in your Google Account's third-party access settings. Conversations with the AI assistant, facts derived from them and review findings are kept until the customer's data is deleted (section 10). You can request deletion by contacting privacy@flamingo.run. Copies remain in backups for the periods in section 10.

**Limited Use.** OpenFrame's use of information received from Google Workspace APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) and the [Google Workspace API User Data and Developer Policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy), including the Limited Use requirements. Data received from Google Workspace APIs is not used to develop, improve, or train non-personalized artificial intelligence or machine learning models, whether by Flamingo AI or by any third party.


## 6. Microsoft 365 Data

**What we access.** When a Global Administrator grants tenant-wide admin consent, we access data through the Microsoft Graph API. Consent is granted separately for each set of permissions we use, and each set is a separate OpenFrame application in your Entra directory.

- Always: the users in your directory (names, user principal name, email addresses, job title, department, office location, usage location, phone numbers, manager, whether the account is enabled, whether it is a guest, creation date, the licences assigned and the groups and directory roles the user is a member of); deleted users (identifier and deletion time); your groups and group memberships; your organization and its verified domains; the subscriptions your tenant holds and how many seats are in use; the devices registered in Entra ID (name, operating system, make and model, compliance and management state, registered owners, registration and last sign-in dates); and the enterprise applications in your tenant together with the app role assignments that grant people access to them.  
- Where audit synchronization is enabled: your directory audit activity, the date each user last signed in, and whether each user has registered multi-factor authentication.  
- Where administrative role synchronization is enabled: the full list of active directory roles and everyone who holds each of them.  

We do not access Exchange Online mailboxes, OneDrive or SharePoint files, calendars, Teams chats or meetings, or Intune device management. We do not read sign-in log records; we read only the date of each user's last sign-in.

**How we use it.** To provide IT administration features to the administrators who manage that tenant, including through OpenFrame's AI assistant when an administrator asks it to retrieve or act on that data.

**Actions we take on the customer's behalf.** Making changes requires a further, separate admin consent for the write permissions, and write-back must be on for the connection; otherwise OpenFrame attempts no change. Where both hold, OpenFrame can:

- create a user account, with a generated temporary password that must be changed at first sign-in;  
- update a user's display name, first name, last name, job title, department, office location, usage location, phone numbers or manager;  
- enable or disable a user's sign-in;  
- create, update or delete a group;  
- add or remove group members.  

OpenFrame does not change licence assignments, reset passwords for existing accounts, delete user accounts, perform any action on a device, or assign administrative roles. Changes are made only in response to a request from an OpenFrame user; no scheduled or background process modifies your users, groups or group memberships. Where OpenFrame registers change-notification subscriptions with Microsoft to receive directory updates, a background job maintains them. OpenFrame records each change with the identity of the OpenFrame user who requested it. Microsoft's own audit log records the same action under the OpenFrame application.

**Who we share it with.** As described in section 5 for Google Workspace data: the relevant data is sent to the AI providers named there, is retained by them and recorded in Flamingo AI's operational logs as described there, and is not sold, transferred to advertising platforms, data brokers or resellers, or otherwise shared with any third party except where an administrator asks us to include information in a support request.

**How we protect it.** Microsoft 365 data is encrypted in transit between Microsoft and OpenFrame. We store no credential of yours: access is granted as service principals of OpenFrame's own applications inside your Entra directory, and OpenFrame's own application credentials are held in our secret store, never in the customer database.

**How long we keep it, and how it is deleted.** Directory data is retained for as long as the connection exists. When the connection is disconnected, we remove the change-notification subscriptions and keep the synchronized directory data. When the connection is deleted, we remove the subscriptions and delete the directory data synchronized through it. Audit events already received remain in our logs for up to 90 days. Because the authorization lives in your own directory rather than as a token held by us, access ends fully when you remove the OpenFrame applications from your Entra portal.


## 7. Legal Basis for Processing (GDPR)

Flamingo AI processes personal data only when:  
- You have given consent (e.g., submitting community contributions to OpenMSP).  
- Processing is necessary for the performance of a contract (e.g., account creation, support requests).  
- Processing is required by law.  
- Processing is necessary for legitimate interests (e.g., community moderation, improving security and services, following up on enquiries, measuring how the Website and our advertising perform).  


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

Requests can be submitted to **privacy@flamingo.run**.  

An OpenFrame SaaS user can delete their own account in Settings. We then remove the user's name, email address, password, profile picture and sign-in links from the account. Tickets, conversations and activity records the user created remain with the customer's workspace, and the user's contact record remains in HubSpot until you ask us to delete it.


## 9. Data Transfers

- Flamingo AI does not transfer customer data from self-hosted deployments.  
- For OpenFrame SaaS, customer data may be transmitted to the AI providers named in section 5 and may be retained by them for up to 30 days to detect abuse and misuse.  
- If personal data must cross borders (e.g., for support or OpenMSP account services), Flamingo AI uses safeguards such as Standard Contractual Clauses.  


## 10. Data Retention

- Customer-controlled data in OpenFrame remains under customer control.  
- For OpenFrame SaaS, customer data is kept until it is deleted as described below, with these shorter periods: operational logs, including AI requests and responses, 90 days; logs from managed devices, 30 days or 90 days depending on the device; remote session recordings, 90 days unless a hold is placed on one; notifications, 30 days.  
- Conversations with the AI assistant, facts derived from them, review findings and tickets have no fixed period and are kept until the customer's data is deleted.  
- A customer can ask us to delete its data at any time, including after the subscription ends. Invoices and records of purchases and usage are kept for as long as tax and accounting law requires, including after an account is closed.  
- Support requests, and any logs or files sent with them, are kept in our support system for as long as needed to handle the request and to keep a record of it. You can ask us to delete them.  
- Website analytics data is held by the analytics providers listed in section 15 and is kept no longer than necessary for the purposes in section 3.1.  
- Form submissions, unfinished-form data, waitlist entries, Website chat conversations and recordings of calls with our team are kept until you ask us to delete them. The chat cookie expires after one year.  
- Backups: database backups of OpenFrame SaaS are kept for up to 120 days, and backups of the device management database for 30 days. Deleted remote session recordings can be restored for 30 days. Data deleted from the service remains in backups until those periods end.  
- OpenMSP contributions remain public unless removed by you or as part of community moderation. Account data may be deleted upon request. The record of pages viewed by signed-in OpenMSP users is kept for 365 days.  


## 11. Children’s Privacy

Flamingo AI products are not directed to children under 16 in the EU/UK or under 13 in the US. Flamingo AI does not knowingly collect data from minors.  


## 12. Security

Flamingo AI implements reasonable technical and organizational safeguards, but **customers remain fully responsible for the security of their own infrastructure**.  


## 13. Responsibility Disclaimer

Use of Flamingo AI products is entirely at your own risk. Customers are solely responsible for compliance with applicable data protection laws when deploying Flamingo AI software or participating in OpenMSP.  


## 14. Text Messaging Opt-In Data

Text messaging originator opt-in data and consent will not be shared with any third parties, excluding aggregators and providers of the Text Message services.


## 15. Service Providers

We use service providers that process personal data on our behalf, each under a contract that limits what it may do with the data. Advertising and visitor-identification providers also use the data they receive for their own purposes, under their own terms:

| Purpose | Provider |
| --- | --- |
| Hosting of OpenFrame SaaS, encryption key management | Google Cloud |
| Single sign-on | Google, Microsoft, Apple |
| Push notifications | Google Firebase, Apple |
| Hosting and database of the Website and of the OpenFrame help centre | Vercel, Supabase |
| AI responses, AI supporting functions, web search | Anthropic, OpenAI |
| Payments and invoicing | Stripe |
| Customer relationship management, marketing and account email, support tickets, meeting booking | HubSpot |
| Product and Website analytics, session recording | PostHog, Google Analytics, Ahrefs |
| Tag management | Google |
| Advertising measurement | Google Ads, Meta, Reddit, LinkedIn |
| Identifying the company a Website visitor comes from | Snitcher, Leadsy |
| Internal notifications; community | Slack |
| Meeting recording | Google Workspace (Google Meet), Fireflies |
| Transcription and video processing of recorded calls | AssemblyAI, Shotstack, Vizard |
| Video hosting | Mux |

The current list of subprocessors is published in our [Trust Center](https://www.flamingo.run/trust-center).


## 16. Cookies

- **Necessary cookies** keep you signed in, hold the random identifier for the Website chat described in section 3.1, and remember a meeting you booked. The chat cookie is not readable by scripts and expires after one year.  
- **Analytics and advertising cookies** are set by PostHog, HubSpot, Google, Meta, Reddit, LinkedIn, Ahrefs, Snitcher and Leadsy, as described in section 3.1. The Website also keeps advertising attribution data in your browser's local storage for 90 days.  

Analytics and advertising cookies are set when you open the Website. You can block or delete cookies in your browser settings or through the opt-out tools each provider offers. Blocking necessary cookies may stop sign-in or chat history from working.


## 17. Changes to this Policy

The version and effective date of this Privacy Policy are stated at the top. When we make a change that materially affects how we use personal data, we announce it on the Website or by email before it takes effect.


## 18. Contact Information

**Privacy Inquiries:** privacy@flamingo.run  
**General Information:** hello@flamingo.run  

---

*By using Flamingo AI products, you acknowledge and agree to this Privacy Policy.*  
