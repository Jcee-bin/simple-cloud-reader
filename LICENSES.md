# Licensing

This repository is a mixed-license monorepo. There is intentionally no single
root `LICENSE` file claiming that every directory uses the same terms.

## Android

`apps/android` is derived from KOReader and is covered by the GNU Affero
General Public License v3.0. See:

- `apps/android/COPYING`
- `UPSTREAMS.md`

Changes to and distribution of that derivative must satisfy the applicable
AGPL-3.0 obligations.

## Windows

`apps/windows` is derived from Thorium Reader and preserves its BSD-3-Clause
license and notices. See:

- `apps/windows/LICENSE`
- `UPSTREAMS.md`

Retain required copyright and attribution notices when modifying or
redistributing this component.

## Original Project Code

The backend, shared contracts, project documentation, infrastructure files,
and integration code do not currently have an explicit root license.

That means public source visibility should not be interpreted as blanket
permission to copy, modify, or redistribute original code. The repository
owner must choose and add explicit terms before broad external contribution or
distribution.

## Dependencies and Assets

Third-party packages, fonts, icons, covers, and other assets keep their own
licenses. Before a public application release:

- Generate a dependency license inventory.
- Confirm every shipped visual asset permits redistribution.
- Preserve upstream notices in installers and source distributions.
- Do not copy ReadEra branding, source, screenshots, icons, or assets.

Pinned upstream revisions and update commands are recorded in `UPSTREAMS.md`.
