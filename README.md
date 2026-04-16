Using this design as the base, create a design system, then write it as an instructions skill for github opilot (or a set of skills), that doesn't make the AI copy 1 pecific design but gives the AI a set of design PRINCIPLES in terms fo layout, responsiveness, (on web, and even  obile on tablet devices spacing), typography, brand colors, color [sychology, color meaning...basically everything to be used in all frontend aspects of the app. i gave you 1 design, but these principles should ebexpande dina way that allows the AI to create mutlkple pages, which si why we dont' want toc oppy the deisng, but the prionciples behind ti instead, ibcluding the clean code and all tht. For native and web icons, use hugeicons, for the web, sue shadcn, for native, sue recatnativereusables component,s referencing them where possible int eh design. And thencome up with skills for code qualoty, code cleanliness, code reusability, using primitives such as hooks, functions, turborepo packageas, the middleware -router - controler archictecture, then write the design systen and this soec as a github copilot skill as doen here:
GitHub Copilot Agent Skills are specialized, reusable units of knowledge and logic that enhance the capabilities of Copilot. Unlike general custom instructions that set global coding standards, Skills are on-demand modules containing instructions, scripts, and resources for specific tasks. 
GitHub Docs
GitHub Docs
 +3
Key Characteristics
Modular & On-Demand: Skills are loaded only when relevant to your prompt, preventing "context rot" from unnecessary data.
Resource Bundling: A skill folder can include not just markdown instructions (SKILL.md), but also helper scripts (Python, Node.js), templates, and reference data.
Open Standard: They follow the Agent Skills specification, making them portable across tools like GitHub Copilot Chat in VS Code, Copilot CLI, and the Copilot cloud agent.
Automatic Discovery: Copilot uses the skill's name and description to automatically trigger it when you ask a related question. 
GitHub Docs
GitHub Docs
 +5
Common Use Cases
DevOps & SRE: Creating incident triage playbooks, Kubernetes rollback scripts, or Terraform review standards.
Standardizing Workflows: Turning internal "tribal knowledge" into a repeatable runbook for tasks like PR summaries or bug triage.
Advanced Refactoring: Defining multi-step processes for extracting logic into domain services or migrating legacy code.
Specialized Domain Knowledge: Teaching Copilot about proprietary SDKs, internal design systems, or specific framework quirks. 
GitHub Docs
GitHub Docs
 +5
How to Create and Use Skills
Storage Locations:
Project-specific: Place them in .github/skills/ within your repository.
Personal/Global: Store them in ~/.copilot/skills/ to use them across all your projects.
Structure: Each skill must be its own subfolder containing a SKILL.md file. This file uses frontmatter for metadata (name and description) and contains the core instructions.
Activation:
Manual: Use a slash command in VS Code Chat (e.g., /my-custom-skill).
Automatic: Simply prompt Copilot with keywords that match the skill's description.
Community Resources: You can find and contribute skills through community collections like github/awesome-copilot or microsoft/skills. 









Plan out what needs to be done for lernard to come to fruition feature by feature, starting with the first feature to the last one, taking into consid what neds to be done on the frontend, backend, clean code pracitces, how the code should eb structure, we're usong as turborpeo setup witb an apps and packages foldeR



Explain what eneds to be made a package fur reusability, what enedd to be made its own seperate function (not specific, write out specific guidelines for maintaining code quality)



And then write it out as a prompt file for github copilot