# @fortify/setup 


<!-- START-INCLUDE:p.marketing-intro.md -->

[Fortify Application Security](https://www.microfocus.com/en-us/solutions/application-security) provides your team with solutions to empower [DevSecOps](https://www.microfocus.com/en-us/cyberres/use-cases/devsecops) practices, enable [cloud transformation](https://www.microfocus.com/en-us/cyberres/use-cases/cloud-transformation), and secure your [software supply chain](https://www.microfocus.com/en-us/cyberres/use-cases/securing-the-software-supply-chain). As the sole Code Security solution with over two decades of expertise and acknowledged as a market leader by all major analysts, Fortify delivers the most adaptable, precise, and scalable AppSec platform available, supporting the breadth of tech you use and integrated into your preferred toolchain. We firmly believe that your great code [demands great security](https://www.microfocus.com/cyberres/application-security/developer-security), and with Fortify, go beyond 'check the box' security to achieve that.

<!-- END-INCLUDE:p.marketing-intro.md -->



<!-- START-INCLUDE:repo-intro.md -->

## Introduction

The `@fortify/setup` npm package provides a lightweight utility with minimal dependencies for bootstrapping [fcli](https://github.com/fortify/fcli) and running `fcli tool env` commands for initializing the Fortify tools environment and generating corresponding environment variables in any environment.

**Key Features:**

* Bootstrap fcli automatically from GitHub releases or custom URL with signature verification, or use pre-installed fcli version
* Minimal runtime dependencies (tar, undici, unzipper) for secure archive handling
* Multi-platform support (Linux, macOS, Windows)
* Three-tier configuration (file, environment variables, CLI arguments)
* CI/CD tool cache integration (GitHub Actions, Azure DevOps, GitLab)
* Simple command structure: `bootstrap-config`, `bootstrap-cache`, `env`
* **TypeScript library API** for building custom integrations
* **Complete examples** for GitHub Actions, Azure DevOps, and GitLab CI

**Use Cases:**

* **CI/CD Pipelines**: Automatically set up Fortify tools in GitHub Actions, Azure DevOps, GitLab CI
* **Custom Integrations**: Build platform-specific wrappers using the TypeScript API
* **Local Development**: Configure once, use cached fcli for fast repeated runs
* **Docker**: Bootstrap fcli in containerized environments
* **Air-gapped Environments**: Use pre-installed fcli or custom download locations

<!-- END-INCLUDE:repo-intro.md -->


## Resources


<!-- START-INCLUDE:repo-resources.md -->

* **Release Notes**: https://github.com/fortify/fortify-setup-js/releases
* **GitHub Repository**: https://github.com/fortify/fortify-setup-js
* **Online Documentation**: https://github.com/fortify/fortify-setup-js/blob/main/USAGE.md
* **Fcli Documentation**: https://fortify.github.io/fcli/v3
* **Contributing Guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md)
* **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
* **License**: [LICENSE.txt](LICENSE.txt)

<!-- END-INCLUDE:repo-resources.md -->



<!-- START-INCLUDE:h2.support.md -->

## Support

For general assistance, please join the [Fortify Community](https://community.opentext.com/cybersec/fortify/) to get tips and tricks from other users and the OpenText team.
 
OpenText customers can contact our world-class [support team](https://www.opentext.com/support/opentext-enterprise/) for questions, enhancement requests and bug reports. You can also raise questions and issues through your OpenText Fortify representative like Customer Success Manager or Technical Account Manager if applicable.

You may also consider raising questions or issues through the [GitHub Issues page](https://github.com/fortify/fortify-setup-js/issues) (if available for this repository), providing public visibility and allowing anyone (including all contributors) to review and comment on your question or issue. Note that this requires a GitHub account, and given public visibility, you should refrain from posting any confidential data through this channel. 

<!-- END-INCLUDE:h2.support.md -->


---

*[This document was auto-generated from README.template.md; do not edit by hand](https://github.com/fortify/shared-doc-resources/blob/main/USAGE.md)*
