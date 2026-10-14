# Flamingo AI Security Policy

**Version:** 1.0  
**Effective date:** October 14, 2026  
**Applies to:** OpenFrame (self-hosted), OpenFrame SaaS, OpenMSP, the Flamingo Website and every repository of the flamingo-stack organization


## 1. Introduction

Flamingo AI, Inc. ("Flamingo AI") is committed to protecting the systems and data of its customers. This policy tells security researchers and customers how to report a vulnerability to us, what we ask of them, and what they can expect from us in return.

For how we protect customer data, our controls and our compliance status, see the Trust Center at https://www.flamingo.run/trust-center. For how we handle personal data, see the Privacy Policy at https://www.flamingo.run/privacy-policy.


## 2. Reporting a Vulnerability

Email **security@flamingo.run**.

Do not open a public GitHub issue, pull request or discussion for a security problem, and do not post it in a community channel. A public report puts every user at risk before a fix exists.

Please include:

- The product, repository or address where you found the issue, and the version or commit if you know it.
- What the issue is and what an attacker could do with it.
- The steps to reproduce it. A proof of concept, script or screenshots help us confirm it quickly.
- Whether you have told anyone else, and whether you plan to publish.

You may report without giving your name. If you want a reply, give us an address we can write to.


## 3. What You Can Expect From Us

- **Acknowledgement** within 3 business days of your report.
- **An initial assessment** within 10 business days: whether we could confirm the issue, and how severe we judge it.
- **Progress updates** at least every 30 days until the issue is closed.
- **Notice when it is fixed**, and credit in the release notes or advisory if you want it.

We rate severity with the Common Vulnerability Scoring System (CVSS) and fix the most severe issues first. Where a vulnerability affected customer data, we notify the affected customers as our agreements with them and the law require.


## 4. Coordinated Disclosure

Give us a reasonable time to fix an issue before you make it public. We aim to fix confirmed vulnerabilities within 90 days of the report and ask you not to publish before the fix is released or that period has ended, whichever comes first. If we need longer, we will tell you why and agree a date with you.


## 5. Authorization

If you make a good-faith effort to follow this policy during your research, we consider your research authorized. We will work with you to understand and resolve the issue quickly, and Flamingo AI will not recommend or pursue legal action against you for that research. If a third party brings legal action against you for activities carried out under this policy, we will make this authorization known.


## 6. Guidelines

Under this policy, "research" means activities in which you:

- Tell us as soon as possible after you discover a real or potential security issue.
- Make every effort to avoid privacy violations, degradation of user experience, disruption to production systems, and destruction or manipulation of data.
- Use an exploit only as far as needed to confirm that a vulnerability exists. Do not use it to compromise or copy data, to keep access, or to move to other systems.
- Test only against accounts, organizations and devices you own or have explicit permission to use.
- Stop and tell us immediately if you encounter personal data, credentials, financial information or another customer's data. Do not keep it and do not disclose it to anyone else.

The following are not authorized:

- Denial of service tests, or any test that degrades a service or exhausts its resources.
- Social engineering of our employees, customers or suppliers, including phishing.
- Physical testing of offices or equipment.
- Testing a customer's own OpenFrame deployment or their managed devices without that customer's permission.
- Automated scanning that generates a significant volume of traffic against production services.


## 7. Scope

In scope:

- The source code in the public repositories of https://github.com/flamingo-stack, including the OpenFrame agent and installers.
- OpenFrame SaaS at openframe.ai and the addresses under it that Flamingo AI operates.
- The Flamingo Websites: flamingo.run, openframe.ai and openmsp.ai.

Out of scope:

- Services run by third parties, including our suppliers. Report those to the supplier.
- Self-hosted OpenFrame deployments operated by someone else. Report those to their operator. If the cause is in our code, report the code issue to us.
- Vulnerabilities in the upstream projects OpenFrame includes (for example Fleet, MeshCentral and osquery) that are not caused by how we use them. Report those to the upstream project; tell us too if OpenFrame users are affected.
- Findings with no practical security impact, such as missing best-practice headers without a working attack, reports from automated scanners that were not verified, and issues that require a device or account that is already compromised.

If you are unsure whether something is in scope, ask us at security@flamingo.run before you test.


## 8. Supported Versions

| Product | Versions that receive security fixes |
| --- | --- |
| OpenFrame SaaS | The running service. Fixes are deployed by Flamingo AI; customers do nothing. |
| OpenFrame (self-hosted) | The latest release. Operators should upgrade to the latest release to receive fixes. |
| OpenFrame agent and desktop and mobile apps | The latest release. |

Security fixes are announced in the release notes at https://www.flamingo.run/releases.


## 9. Rewards

Flamingo AI does not run a paid bug bounty program. We thank reporters publicly, with their consent.


## 10. Questions

Questions about this policy go to **security@flamingo.run**. We welcome suggestions for improving it.


## 11. Document History

| Version | Effective date | Change |
| --- | --- | --- |
| 1.0 | October 14, 2026 | First version. |
