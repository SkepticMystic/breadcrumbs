# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.6.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.5.3...1.6.0) (2021-11-20)


### Features

* **DucksView:** :sparkles: Filter nodes with regex ([ec65f68](https://github.com/SkepticMystic/breadcrumbs/commit/ec65f689e46d1ed3305fea5a892236dd9c45fedd))
* **Stats View:** :sparkles: Button to refresh stats view ([5eb8830](https://github.com/SkepticMystic/breadcrumbs/commit/5eb8830ad8f5d007d6d07c1cd15d765d6e4c03b6))


### Bug Fixes

* **Stats View:** :bug: Fix stats view for mainG ([56736d5](https://github.com/SkepticMystic/breadcrumbs/commit/56736d53cc5aa7ee2e2e2268663d138dcc85bdef))

### [1.5.3](https://github.com/SkepticMystic/breadcrumbs/compare/1.5.2...1.5.3) (2021-11-20)

### [1.5.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.5.1...1.5.2) (2021-11-19)


### Bug Fixes

* :bug: Fail safe on adding all nodes to main ([8435b5a](https://github.com/SkepticMystic/breadcrumbs/commit/8435b5ae3dd7d67f9051c5ce07a06a0acb52b0c7))

### [1.5.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.5.0...1.5.1) (2021-11-19)


### Bug Fixes

* **Juggl:** :bug: Fix juggl links. Wasn't adding all files ([3f2b460](https://github.com/SkepticMystic/breadcrumbs/commit/3f2b460c66a54a33d8c976ddbec28f3d8802adbf))

## [1.5.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.4.0...1.5.0) (2021-11-19)


### Features

* **Hierarchy Note:** :sparkles: Much better reliability + indicate field before link (fix [#102](https://github.com/SkepticMystic/breadcrumbs/issues/102)) ([1cedf22](https://github.com/SkepticMystic/breadcrumbs/commit/1cedf226a853a5f039fe5465b867a3e5d2cc4778))
* **Vis View:** :sparkles: Cmd to open (fix [#145](https://github.com/SkepticMystic/breadcrumbs/issues/145)) ([74992ad](https://github.com/SkepticMystic/breadcrumbs/commit/74992adfe692eb396a8841a450825229770199a2))

## [1.4.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.3.1...1.4.0) (2021-11-19)


### Features

* **DucksView:** :sparkles: Add Duck view to show notes which don't have any breadcrumbs ([2d0b2b2](https://github.com/SkepticMystic/breadcrumbs/commit/2d0b2b2dea721f05a537bac4fa512aa35f9caab0))


### Bug Fixes

* :bug: Add all nodes to `main` ([fa24115](https://github.com/SkepticMystic/breadcrumbs/commit/fa241157343a31e9d519cb88877325e8df263beb))

### [1.3.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.3.0...1.3.1) (2021-11-19)


### Bug Fixes

* **CSV Crumbs:** :bug: Fix CSV crumbs ([08a3fab](https://github.com/SkepticMystic/breadcrumbs/commit/08a3fab1813492f61d688299735baa1ff649b90a))

## [1.3.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.2.0...1.3.0) (2021-11-19)


### Features

* **Stats View:** :sparkles: Option to wrap copied cell content in wikiLinks (fix [#101](https://github.com/SkepticMystic/breadcrumbs/issues/101)) ([a6cdeab](https://github.com/SkepticMystic/breadcrumbs/commit/a6cdeabf7e5f3ea6a3ca22ba5f270fd511487306))
* **WriteBCToFile:** :sparkles: Option to write as inline fields (fix [#140](https://github.com/SkepticMystic/breadcrumbs/issues/140)) ([dded0df](https://github.com/SkepticMystic/breadcrumbs/commit/dded0df48db1d86fd31520f48b4e9659cf03cbdf))

## [1.2.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.1.2...1.2.0) (2021-11-19)


### Features

* **List/Matrix View:** :sparkles: Metadata field to sort items in L/M view! ([#92](https://github.com/SkepticMystic/breadcrumbs/issues/92)) ([d6452c3](https://github.com/SkepticMystic/breadcrumbs/commit/d6452c3cdc1f3a0a00bbee06936f8b65cf71006f))
* **Stats View:** :sparkles: Simplifications + add next/prev directions ([1d55d6a](https://github.com/SkepticMystic/breadcrumbs/commit/1d55d6a6e626d93d211ff3892b223dd7ec183678))

### [1.1.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.1.1...1.1.2) (2021-11-19)


### Bug Fixes

* :bug: Check if nodes exist before setting edges ([0111eec](https://github.com/SkepticMystic/breadcrumbs/commit/0111eecd347208cb8e59462757a41a6a619f2f66))
* :bug: Don't index an array using Object.keys :yum: ([79dd8b1](https://github.com/SkepticMystic/breadcrumbs/commit/79dd8b1c6a800051a95692cb17c90ed45bf0160b))
* :bug: I don't think it has to be a breaking change... ([5524c29](https://github.com/SkepticMystic/breadcrumbs/commit/5524c2981ee10d925f7b8f5630aa6e7195b2df2f))

### [1.1.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.1.0...1.1.1) (2021-11-18)


### Bug Fixes

* :bug: More safety checks if no next/prev yet ([918b3e0](https://github.com/SkepticMystic/breadcrumbs/commit/918b3e0bd97cf98899132ac0a1e480063579ff2f))
* **List/Matrix View:** :bug: Unmerge next/prev items ([58691c4](https://github.com/SkepticMystic/breadcrumbs/commit/58691c4241cfccf417c8b34a71fcf63d7a834262))

## [1.1.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.5...1.1.0) (2021-11-18)


### Features

* **nextPrev:** :sparkles: Show fieldName ([b2e10d4](https://github.com/SkepticMystic/breadcrumbs/commit/b2e10d4b9886ecf56e73e17eb2cfc963bc352795))


### Bug Fixes

* :bug: Fix "Show Hierarchies" button ([141b4f9](https://github.com/SkepticMystic/breadcrumbs/commit/141b4f90c404b4134fe1b9f21007fcf5581a7b3b))
* **nextPrev:** :bug: Remove duplicate implied ([8fc11e9](https://github.com/SkepticMystic/breadcrumbs/commit/8fc11e9131cad2afb4e2688afabc319493ae252b))

### [1.0.5](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.4...1.0.5) (2021-11-18)

### [1.0.4](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.3...1.0.4) (2021-11-18)


### Bug Fixes

* **nextPrev:** :bug: Fix overflowing next/prev item ([eec41a7](https://github.com/SkepticMystic/breadcrumbs/commit/eec41a745684bd114d409557a850c949fbb58c56))
* **nextPrev:** :bug: Still show nextPrev (if there are any) even in no parents ([b1b4c25](https://github.com/SkepticMystic/breadcrumbs/commit/b1b4c25ff5e119abb7cc7540563f3ddc28aa8933))

### [1.0.3](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.2...1.0.3) (2021-11-18)


### Bug Fixes

* :bug: Properly save hierarchies ([b271fc0](https://github.com/SkepticMystic/breadcrumbs/commit/b271fc06528793941b1f65d93490e8786771c460))

### [1.0.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.1...1.0.2) (2021-11-18)


### Bug Fixes

* :bug: More silent fails if no next/prev yet ([489c3c3](https://github.com/SkepticMystic/breadcrumbs/commit/489c3c338819eafd23c97e032fffb055bfd315f7))

### [1.0.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.0...1.0.1) (2021-11-18)


### Bug Fixes

* :bug: Fail silently if hier.next/prev is undefined ([d76d5b2](https://github.com/SkepticMystic/breadcrumbs/commit/d76d5b20f3081bbe3e1191fece09f446c1a6800b))

## [1.0.0](https://github.com/SkepticMystic/breadcrumbs/compare/0.12.1...1.0.0) (2021-11-18)


### Features

* New directions! Show the next/previous note ([e3e56d6](https://github.com/SkepticMystic/breadcrumbs/commit/e3e56d6de5ba465d0e96eed10e7920602b5fc905))


### Bug Fixes

* :bug: Prev/Next in MatrixView ([dbec2f5](https://github.com/SkepticMystic/breadcrumbs/commit/dbec2f52edc9f46a135698a509b2cad131507b1c))

### [0.12.1](https://github.com/SkepticMystic/breadcrumbs/compare/0.12.0...0.12.1) (2021-11-17)


### Bug Fixes

* Safety check on in/outNeighbors ([f616a5a](https://github.com/SkepticMystic/breadcrumbs/commit/f616a5aa882640fd723c40153ad08d36b59f7eab))

## [0.12.0](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.9...0.12.0) (2021-11-17)


### Features

* :sparkles: Use Svelte for Hierarchy Note settings ([3c891ea](https://github.com/SkepticMystic/breadcrumbs/commit/3c891ea85375209ccc33913a0be42e4966301921))


### Bug Fixes

* **Grid View:** :bug: Closing gs in wrong direction ([8cfa81e](https://github.com/SkepticMystic/breadcrumbs/commit/8cfa81e2250ae4f1a5652c825a0c344382bb30ce))

### [0.11.9](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.8...0.11.9) (2021-11-17)

### [0.11.8](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.7...0.11.8) (2021-11-10)

### [0.11.7](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.6...0.11.7) (2021-11-10)


### Bug Fixes

* **getFieldValues:** :bug: Handle DataArrays (dv proxies) ([63e57d7](https://github.com/SkepticMystic/breadcrumbs/commit/63e57d785dc28ea846bf22243be759177bf61ff1))

### [0.11.6](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.5...0.11.6) (2021-11-09)


### Bug Fixes

* **getFieldValues:** :bug: Be more explicit with dvLinks ([db9c259](https://github.com/SkepticMystic/breadcrumbs/commit/db9c25956ec848a0d30143a789defc0be2fa5e36))

### [0.11.5](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.76...0.11.5) (2021-11-09)

### [0.10.76](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.4...0.10.76) (2021-11-09)


### Bug Fixes

* :bug: Properly reset back to old version ([cd95a47](https://github.com/SkepticMystic/breadcrumbs/commit/cd95a4795b73ff555f07b245d6c8c21f1079d0c0))

### [0.10.75](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.74...0.10.75) (2021-10-09)


### Bug Fixes

* **CSV Crumbs:** :bug: fixes [#142](https://github.com/SkepticMystic/breadcrumbs/issues/142) CSV File shouldn't be needed to show regular BCs ([df3de06](https://github.com/SkepticMystic/breadcrumbs/commit/df3de06683c03ec8c213931ee8d468d2f2c1cf12))

### [0.10.74](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.73...0.10.74) (2021-10-08)


### Features

* **CSV Crumbs:** :sparkles: Use a CSV file to add Breadcrumbs ([d794db9](https://github.com/SkepticMystic/breadcrumbs/commit/d794db91498acd48acc445f9893614a4228f1187))

### [0.10.73](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.72...0.10.73) (2021-10-04)


### Bug Fixes

* **List/Matrix View:** :bug: Remove duplicate implied siblings ([0d0a187](https://github.com/SkepticMystic/breadcrumbs/commit/0d0a18714473a64a440336b2f67725fafbd5dc74))

### [0.10.72](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.71...0.10.72) (2021-09-29)


### Bug Fixes

* **Grid View:** :bug: .internal-link was a level too high ([e971c8e](https://github.com/SkepticMystic/breadcrumbs/commit/e971c8e80404ba35e46d182fd1cd8e970be6aa90))

### [0.10.71](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.70...0.10.71) (2021-09-10)


### Bug Fixes

* **List/Matrix View:** :bug: Display alt link names for implied siblings, too ([075d8a0](https://github.com/SkepticMystic/breadcrumbs/commit/075d8a05cc19605238d930394474312d7ef768c4))

### [0.10.70](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.69...0.10.70) (2021-09-10)


### Features

* **List/Matrix View:** :sparkles: Setting to list field names to check for alternate link text ([52f0321](https://github.com/SkepticMystic/breadcrumbs/commit/52f0321248f5e72c198ed5bd7e422833ef12ac0e))

### [0.10.69](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.68...0.10.69) (2021-09-10)


### Features

* **WriteBCToFile:** :sparkles: Setting to limit which fields are written to files ([258343f](https://github.com/SkepticMystic/breadcrumbs/commit/258343f4c4a4a6cb5ed710cbdda5b88c6a6a660a))

### [0.10.68](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.67...0.10.68) (2021-09-09)


### Features

* **WriteBCToFile:** :sparkles: Setting to show `Write Breadcrumbs to ALL Files` cmd. Off by default ([7ff2d06](https://github.com/SkepticMystic/breadcrumbs/commit/7ff2d062b31f1dc1ca3872271ba8f04394f27e32))

### [0.10.67](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.66...0.10.67) (2021-09-08)


### Features

* **WriteBCToFile:** :sparkles: Write Breadcrumbs to All files ([289b701](https://github.com/SkepticMystic/breadcrumbs/commit/289b701158a5f8e832d98672be39d8cf8e2ffd9b))

### [0.10.66](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.65...0.10.66) (2021-09-08)


### Features

* **LimitTrailFields:** :sparkles: Ability to limit which fields are shown in the trail/grid view ([ba08396](https://github.com/SkepticMystic/breadcrumbs/commit/ba083960abd68d0555070a50ea4a6bfc70d9d140))

### [0.10.65](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.64...0.10.65) (2021-09-08)

### [0.10.64](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.63...0.10.64) (2021-09-08)


### Bug Fixes

* :bug: Open link in new pane if Mac `cmd` is pressed ([29abbc3](https://github.com/SkepticMystic/breadcrumbs/commit/29abbc3faee80443872fad5bcc58608e3883e330))

### [0.10.63](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.62...0.10.63) (2021-09-07)

### [0.10.62](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.61...0.10.62) (2021-09-07)


### Bug Fixes

* **CreateIndex:** :bug: Check if currFile is null ([c1c8f17](https://github.com/SkepticMystic/breadcrumbs/commit/c1c8f17f8d09b11285e2eaa8265e305df5fee7f1))

### [0.10.61](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.60...0.10.61) (2021-09-06)

### [0.10.60](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.59...0.10.60) (2021-09-06)


### Bug Fixes

* **WriteBCToFile:** :bug: Notice wasn't showing if MetaEdit wasn't enabled ([649c379](https://github.com/SkepticMystic/breadcrumbs/commit/649c3791518f03ad7fcb0f7d36dc170408ea3a51))

### [0.10.59](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.58...0.10.59) (2021-09-05)

### [0.10.58](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.57...0.10.58) (2021-09-05)

### [0.10.57](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.56...0.10.57) (2021-09-05)


### Bug Fixes

* **Vis View:** :bug: Tidy Tree: Importing non-existient function ([628afc4](https://github.com/SkepticMystic/breadcrumbs/commit/628afc4fec9b4b144ccf396c83a944c3987a7b48))

### [0.10.56](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.55...0.10.56) (2021-09-04)

### [0.10.55](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.54...0.10.55) (2021-09-04)

### [0.10.54](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.53...0.10.54) (2021-09-04)

### [0.10.53](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.52...0.10.53) (2021-09-04)

### [0.10.52](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.51...0.10.52) (2021-09-03)


### Features

* **WriteBCToFile:** :sparkles: New Command: Write Breadcrumbs to current file ([c46c95d](https://github.com/SkepticMystic/breadcrumbs/commit/c46c95d08d7bfb46075c5b88ed67552ac58941b6))

### [0.10.51](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.50...0.10.51) (2021-08-29)

### [0.10.50](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.49...0.10.50) (2021-08-29)


### Features

* **Path View:** :sparkles: Option to hide trail in specific notes using custom metadata field ([f5d96bf](https://github.com/SkepticMystic/breadcrumbs/commit/f5d96bfe40d876ea645b47295ccf80c863046447))

### [0.10.49](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.48...0.10.49) (2021-08-28)

### [0.10.48](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.47...0.10.48) (2021-08-28)

### [0.10.47](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.46...0.10.47) (2021-08-28)


### Bug Fixes

* :bug: Check for Apple CMD key in openOrSwitch ([5ea29ac](https://github.com/SkepticMystic/breadcrumbs/commit/5ea29ac95fdef5e1777642364283988328f9ef38))
* **Path View:** :bug: Add trailDiv before markdown-preview-sizer instead of prepending to markdown-preview-view ([bc51e85](https://github.com/SkepticMystic/breadcrumbs/commit/bc51e85f60fe029b74cf65a8cf8440ada4d7c173))

### [0.10.46](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.45...0.10.46) (2021-08-22)


### Features

* :sparkles: Create note if it doesn't exist ([44485db](https://github.com/SkepticMystic/breadcrumbs/commit/44485dbeff1bb17126d9537a9d10c351ba1d6ce2))


### Bug Fixes

* :bug: More intuitive text inputs on hierarchies settings ([14aaebe](https://github.com/SkepticMystic/breadcrumbs/commit/14aaebe991c69519a0328670f4e9bdfbb79b58db))

### [0.10.45](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.44...0.10.45) (2021-08-21)


### Bug Fixes

* **Hierarchy Note:** :bug: Forget to check for different delimiters in depth() ([7d54b88](https://github.com/SkepticMystic/breadcrumbs/commit/7d54b881b067560f5a3098155a9b4ac98f58697e))

### [0.10.44](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.43...0.10.44) (2021-08-21)


### Features

* **Hierarchy Note:** :sparkles: Allow any list delimiter `-`, `*`, `+` ([e307696](https://github.com/SkepticMystic/breadcrumbs/commit/e3076967fde061be5f2f36dbaa007ef208fb1e31))
* **Hierarchy Note:** :sparkles: Allow yaml frontmatter ([88f0499](https://github.com/SkepticMystic/breadcrumbs/commit/88f04997833252bb0498f409a67d57360110cedc))

### [0.10.43](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.42...0.10.43) (2021-08-21)


### Features

* **Hierarchy Note:** :sparkles: Option to have hierarchy note fill in real parents, or real children, or both ([ea31f64](https://github.com/SkepticMystic/breadcrumbs/commit/ea31f643915a89a47492fbe9b8f5658c2f108fc7))

### [0.10.42](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.41...0.10.42) (2021-08-21)

### [0.10.41](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.40...0.10.41) (2021-08-21)

### [0.10.40](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.39...0.10.40) (2021-08-21)


### Features

* :sparkles: Much better debugging. Now grouped by function ([48a2f03](https://github.com/SkepticMystic/breadcrumbs/commit/48a2f03a92ca0bfc6bcf007081b1799f11a8b3ce))

### [0.10.39](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.38...0.10.39) (2021-08-21)


### Bug Fixes

* **Vis View:** :bug: Force Directed Graph: Current note doesn't have to have breadcrumbs for fdg to show ([fc66973](https://github.com/SkepticMystic/breadcrumbs/commit/fc669734727582fc923fa5c92c455fd2869ba8d4)), closes [#93](https://github.com/SkepticMystic/breadcrumbs/issues/93)

### [0.10.38](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.37...0.10.38) (2021-08-21)


### Bug Fixes

* **Hierarchy Note:** :bug: Forgot to initialise hierarchyNotesArr as [] ([ffe6877](https://github.com/SkepticMystic/breadcrumbs/commit/ffe687719eef2fa96c4c4eb9d0b105cf54e4e14f))

### [0.10.37](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.36...0.10.37) (2021-08-21)


### Bug Fixes

* **Hierarchy Note:** :bug: Any indentation allowed. For real this time ([7d5c596](https://github.com/SkepticMystic/breadcrumbs/commit/7d5c5964bdd3ea1937ca8b685d06f6fcc5657428))

### [0.10.36](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.35...0.10.36) (2021-08-21)


### Bug Fixes

* **Hierarchy Note:** :bug: Any consistent depth should be allowed, not just tabs ([a738e39](https://github.com/SkepticMystic/breadcrumbs/commit/a738e39415cf89391509c8bbc2e7953073980082))
* **Hierarchy Note:** :bug: Send Notice if a note in hierarchyNotes has been deleted ([49540e8](https://github.com/SkepticMystic/breadcrumbs/commit/49540e8d99841da10161f9176a5fbaca71079cc4))

### [0.10.35](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.34...0.10.35) (2021-08-20)


### Bug Fixes

* **Hierarchy Note:** :bug: Blanks line allowed ([596bd64](https://github.com/SkepticMystic/breadcrumbs/commit/596bd6445deb21480de7a6347ba203796f00aeb4))

### [0.10.34](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.33...0.10.34) (2021-08-20)


### Bug Fixes

* **Hierarchy Note:** :bug: Don't push children if !noteUp ([841f7bf](https://github.com/SkepticMystic/breadcrumbs/commit/841f7bf9e8950873b39dce43e60e37cb85bfaa0a))

### [0.10.33](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.32...0.10.33) (2021-08-20)


### Features

* **Hierarchy Note:** :sparkles: Adds Hierarchy Notes to Breadcrumbs ([816d847](https://github.com/SkepticMystic/breadcrumbs/commit/816d847e1016a84e0060e805b3900e9948c08a36))

### [0.10.32](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.31...0.10.32) (2021-08-18)


### Features

* **Stats View:** :sparkles: Total row ([628e47a](https://github.com/SkepticMystic/breadcrumbs/commit/628e47ae9bf9f8f1617d40604911a5031985b435))


### Bug Fixes

* :bug: Register active-leaf-change event if it wasn't registered onLoad ([96aa5f4](https://github.com/SkepticMystic/breadcrumbs/commit/96aa5f41924ddd2c344277774f7d892fd52606c7))

### [0.10.31](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.30...0.10.31) (2021-08-15)


### Bug Fixes

* **getFieldValues:** :bug: Some pretty big bugs that I hadn't noticed... I think it works now ([6e98456](https://github.com/SkepticMystic/breadcrumbs/commit/6e98456f4607d7ad40694b2a18ab5ddaf18e50c8))

### [0.10.30](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.29...0.10.30) (2021-08-15)


### Bug Fixes

* **Vis View:** :bug: Force Directed Graph: Colour reset to defaultNodeColour when setting new nodeToGetTo ([dd1d41e](https://github.com/SkepticMystic/breadcrumbs/commit/dd1d41e5909f781b6d1dda0bb501e528a6be9b55))

### [0.10.29](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.28...0.10.29) (2021-08-15)


### Features

* **Vis View:** :sparkles: Force Directed Graph: Right click node to set that as the starting point for path finding ([095fb25](https://github.com/SkepticMystic/breadcrumbs/commit/095fb25e9d2193758eabf67a3a6c7d8442c9c55e))

### [0.10.28](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.27...0.10.28) (2021-08-15)


### Bug Fixes

* **Vis View:** :bug: Force Directed Graph: Path finding wasn't working correctly, oops ([4d6a6f0](https://github.com/SkepticMystic/breadcrumbs/commit/4d6a6f0fd58f25070a7cf819be8cb46d3ee83719))

### [0.10.27](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.26...0.10.27) (2021-08-15)


### Features

* **Vis View:** :sparkles: Force Directed Graph: Customisable node colour ([e83d9ee](https://github.com/SkepticMystic/breadcrumbs/commit/e83d9ee599062a64a918d9fd4b4f7e276e709d50))
* **Vis View:** :sparkles: Force Directed Graph: Highlight current note on graph ([5d437c0](https://github.com/SkepticMystic/breadcrumbs/commit/5d437c088bfa631b563265e8f43e3db8777f8199))
* **Vis View:** :sparkles: Force Directed Graph: Highlight path from current note to hovered node ([0773919](https://github.com/SkepticMystic/breadcrumbs/commit/077391919da06f05cfda722d8612df1bd43f4f3c))
* **Vis View:** :sparkles: Force Directed Graph: Transition to hovering node fade-out ([f4bb083](https://github.com/SkepticMystic/breadcrumbs/commit/f4bb0836296741229b5a29b8715e166624ed32fa))

### [0.10.26](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.25...0.10.26) (2021-08-15)


### Features

* **Vis View:** :sparkles: Customisable colour on Force Directed Graph nodes ([94e2947](https://github.com/SkepticMystic/breadcrumbs/commit/94e294792d3333e75ebb8abb81837b0b5a0278ca))
* **Vis View:** :sparkles: Hovering a node unfocusses any non-connected nodes and edges ([fb6e3a8](https://github.com/SkepticMystic/breadcrumbs/commit/fb6e3a83928b73a3897aba2ce76a6ceb479f4733))

### [0.10.25](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.24...0.10.25) (2021-08-15)


### Features

* **List/Matrix View:** :sparkles: Setting: Filter implied siblings of different types ([5e528b7](https://github.com/SkepticMystic/breadcrumbs/commit/5e528b752b37b890d8c9b2421ef3db6efd3e13bb))


### Bug Fixes

* **getFieldValues:** :bug: If using Obs cache, it sees number-only links as number[][], not string[][] ([3250462](https://github.com/SkepticMystic/breadcrumbs/commit/3250462e726702006f63e36af484c4197cad35fc))

### [0.10.24](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.23...0.10.24) (2021-08-14)


### Bug Fixes

* :bug: Previously checking for plugins.dataview.api, which won't exist if !dataview ([5bc7cc5](https://github.com/SkepticMystic/breadcrumbs/commit/5bc7cc54f7f736d77b49522708815d2175d546fb))

### [0.10.23](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.22...0.10.23) (2021-08-14)


### Features

* **Juggl:** :sparkles: Parse for Juggl links even if Juggl isn't installed ([e1a8f39](https://github.com/SkepticMystic/breadcrumbs/commit/e1a8f395c907587768b801f6290df115e3ea31ea))
* **Juggl:** :sparkles: Use only Juggl links ([09d8d98](https://github.com/SkepticMystic/breadcrumbs/commit/09d8d98f93ee9e36ac1f8a01f3d2126f0cffe80a))


### Bug Fixes

* **Juggl:** :bug: Use typedLinkPrefix from Juggl if installed, fall back on '-' otherwise ([16af4dc](https://github.com/SkepticMystic/breadcrumbs/commit/16af4dc2f64d9ec7c2ab36d0c800ce1657e91be0))

### [0.10.22](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.21...0.10.22) (2021-08-13)


### Bug Fixes

* **CreateIndex:** :bug: I had the graphs being closed the wrong way ([91f742c](https://github.com/SkepticMystic/breadcrumbs/commit/91f742ce03b4df27aa45925550c1c0addf597db4))

### [0.10.21](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.20...0.10.21) (2021-08-13)


### Features

* :sparkles: Setting to change Dataview wait time ([9d7650f](https://github.com/SkepticMystic/breadcrumbs/commit/9d7650fa68a050a4ee65342a575d9d45fbcec9aa))
* **List/Matrix View:** :sparkles: Custom sorting of userHierachies ([1ec10f6](https://github.com/SkepticMystic/breadcrumbs/commit/1ec10f6d987ccbfb03b9eb5401aa96c86c96d5d8))

### [0.10.20](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.19...0.10.20) (2021-08-13)


### Bug Fixes

* **Juggl:** :bug: Fix Juggl links ([23da652](https://github.com/SkepticMystic/breadcrumbs/commit/23da652e0e273b135afc51f96474613db9bf1b08))

### [0.10.19](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.18...0.10.19) (2021-08-13)


### Bug Fixes

* **Juggl:** :bug: Get Juggl syntax working again ([579bd14](https://github.com/SkepticMystic/breadcrumbs/commit/579bd141d9903deba4c5e248d958f4969725ce72))
* **Stats View:** :goal_net: Error handling in wordCounts ([6ff5c3e](https://github.com/SkepticMystic/breadcrumbs/commit/6ff5c3e6183fe5d7fb619c633454b70b526ad2a6))

### [0.10.18](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.17...0.10.18) (2021-08-13)

### [0.10.17](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.16...0.10.17) (2021-08-13)


### Bug Fixes

* :bug: mergeGs was trying to copy the first graph in an arr of graphs, but that arr could be empty ([c3c23ea](https://github.com/SkepticMystic/breadcrumbs/commit/c3c23ea16a35658ac59a866bd18cf0a4420a0053))

### [0.10.16](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.15...0.10.16) (2021-08-13)

### [0.10.15](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.14...0.10.15) (2021-08-13)


### Features

* :lipstick: Labels for hierarchy input boxes ([0323edf](https://github.com/SkepticMystic/breadcrumbs/commit/0323edf74ef4675d0a1c7f9d818526a52f9aee10))

### [0.10.14](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.13...0.10.14) (2021-08-12)


### Features

* :sparkles: Get multiple hierarchies working with l/m view! ([558ae67](https://github.com/SkepticMystic/breadcrumbs/commit/558ae670eb050e945ef053199d31838fdf099861))
* :sparkles: Multiple field names for each direction in a hierarchy ([0f3babb](https://github.com/SkepticMystic/breadcrumbs/commit/0f3babbb3f507f5e48c06ade14de2435f8976f36))
* :sparkles: Multiple hierarchies setting! ([2eda709](https://github.com/SkepticMystic/breadcrumbs/commit/2eda7095c4b28d3fc28c847412646cbd1eebbf38))
* **Stats View:** :sparkles: Progress on new stats view ([5389720](https://github.com/SkepticMystic/breadcrumbs/commit/53897209aec532376c15e0e6bc1e8e9dee5896ba))
* **Stats View:** :sparkles: Update stats view for multiple hierarchies ([24f5dae](https://github.com/SkepticMystic/breadcrumbs/commit/24f5dae5aa3d2b454f46069dba0719142224759e))


### Bug Fixes

* :bug: Everything on the front-end works as it used to ([ea0e8ff](https://github.com/SkepticMystic/breadcrumbs/commit/ea0e8ff3beac9befeba75932b8c5fac51ec562be))

### [0.10.13](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.12...0.10.13) (2021-08-10)


### Features

* **Vis View:** :sparkles: Basic zoom on tidyTree ([935d8fc](https://github.com/SkepticMystic/breadcrumbs/commit/935d8fcd2fcfda65046112e986e894a7c659b0d5))
* **Vis View:** :sparkles: Better dfsFlatAdjList ([cbe3182](https://github.com/SkepticMystic/breadcrumbs/commit/cbe31827e75fac17bcbd1bfa881888da0c8e0ffb))

### [0.10.12](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.11...0.10.12) (2021-08-10)


### Features

* **List/Matrix View:** :sparkles: Setting to open matrixView in left or right side onLoad ([c56d3dc](https://github.com/SkepticMystic/breadcrumbs/commit/c56d3dc897c3ee8183d35dda42d3fb8303fb55eb))


### Bug Fixes

* **Path View:** :bug: Redraw path after updating settings ([fa323b8](https://github.com/SkepticMystic/breadcrumbs/commit/fa323b86caa82e6de149e403fcbf2e792c09c293))

### [0.10.11](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.10...0.10.11) (2021-08-09)


### Features

* **Vis View:** :sparkles: Functional zooming on arcDiagram ([27a22bf](https://github.com/SkepticMystic/breadcrumbs/commit/27a22bf4470acbd9eaa606782aff3cba99272059))
* **Vis View:** :sparkles: Progress on radialTree ([aa6d990](https://github.com/SkepticMystic/breadcrumbs/commit/aa6d990f7102453ab8532ed53b5ab3b2e1e397d8))

### [0.10.10](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.9...0.10.10) (2021-08-09)


### Features

* **Vis View:** :sparkles: Functional Tree Map! ([5489e94](https://github.com/SkepticMystic/breadcrumbs/commit/5489e948f7659ea13d5125f060c584dac34f6be5))
* **Vis View:** :sparkles: Much better tidy tree ([8a3a9a3](https://github.com/SkepticMystic/breadcrumbs/commit/8a3a9a38472ce531107c0d64962b22a1cbcac507))
* **Vis View:** :sparkles: Proof of Concept of hierarchy!!! ([b47f849](https://github.com/SkepticMystic/breadcrumbs/commit/b47f849cb7393ce26029439bb82b29d9b6a58627))

### [0.10.9](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.8...0.10.9) (2021-08-06)


### Features

* **Vis View:** :sparkles: Working Arc Diagram! ([71dd61b](https://github.com/SkepticMystic/breadcrumbs/commit/71dd61bd858916b5b57ebf5d82975539f4dc49b3))

### [0.10.8](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.7...0.10.8) (2021-08-06)


### Features

* **Vis View:** :sparkles: Add height property to adjList Items ([2f27bf4](https://github.com/SkepticMystic/breadcrumbs/commit/2f27bf43cc038ce36a2c69951232349cf7eee4cb))
* **Vis View:** :sparkles: Better Circle Packing ([14ee9d0](https://github.com/SkepticMystic/breadcrumbs/commit/14ee9d074c7457c46ee4c02ecb25a4ee73689b34))

### [0.10.7](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.6...0.10.7) (2021-08-05)


### Features

* **Vis View:** :sparkles: Lots more work on view view. Upgrade forceDirectedG, functional Circle Packing + TidyTree ([9769d9b](https://github.com/SkepticMystic/breadcrumbs/commit/9769d9b55251c5073d6c190ff9f29a4eaf36d537))

### [0.10.6](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.5...0.10.6) (2021-08-05)


### Features

* **Vis View:** :sparkles: Default visualisation type ([3dd2906](https://github.com/SkepticMystic/breadcrumbs/commit/3dd29068fd46e591d95f9086d9bf7d2e203bd737))
* **Vis View:** :sparkles: Working Zoom & Pan on Force Directed Graph! ([0b49359](https://github.com/SkepticMystic/breadcrumbs/commit/0b49359014d804160aad129fffba4bcb721a1187))


### Bug Fixes

* **Stats View:** :bug: Remove old styles from data-tooltip ([973bed2](https://github.com/SkepticMystic/breadcrumbs/commit/973bed209a05007318f24b37f4d3ffa7e267f85a))

### [0.10.5](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.4...0.10.5) (2021-08-05)


### Bug Fixes

* **getFieldValues:** :bug: splitAndDrop regex was => null when the link didn't have [[]] ([37083df](https://github.com/SkepticMystic/breadcrumbs/commit/37083dfc1aca536017615118fc6dba645e19fba9))

### [0.10.4](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.3...0.10.4) (2021-08-04)


### Features

* **Vis View:** :sparkles: Lots of new code (alot of it copied) to get started with various visualisations ([a98ac6a](https://github.com/SkepticMystic/breadcrumbs/commit/a98ac6a7aa3a8530caacf8a450c4b4908e480293))

### [0.10.3](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.2...0.10.3) (2021-08-04)

### [0.10.2](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.1...0.10.2) (2021-08-04)


### Features

* **Vis View:** :sparkles: Show node name on hover ([4c2ad5d](https://github.com/SkepticMystic/breadcrumbs/commit/4c2ad5dd80ce3b8a450de504f8a02ebcec642945))


### Bug Fixes

* **Vis View:** Center graph in Vis View ([56ee243](https://github.com/SkepticMystic/breadcrumbs/commit/56ee2434e70c791404a75ffd91d6bb1870cadbd8))

### [0.10.1](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.0...0.10.1) (2021-08-03)

### [0.9.27](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.26...0.9.27) (2021-08-03)


### Features

* **Stats View:** :sparkles: Custom Tooltip + Copyable td info ([bedc5fd](https://github.com/SkepticMystic/breadcrumbs/commit/bedc5fd9801580e4e06647a889ce946b9b518f52))


### Bug Fixes

* **Path View:** :bug: Fix extra arrows showing on shorter paths ([8c71661](https://github.com/SkepticMystic/breadcrumbs/commit/8c716610cb7b43ba0c48f1d0b030c0a21b298542))
* **Stats View:** :bug: Close stats view on unload ([6931256](https://github.com/SkepticMystic/breadcrumbs/commit/69312563f5e6c4c6b20483ff3da5a04f9c293701))

### [0.9.26](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.25...0.9.26) (2021-08-03)


### Bug Fixes

* **getFieldValues:** :bug: Better falsey checking on rawValues ([ec717bc](https://github.com/SkepticMystic/breadcrumbs/commit/ec717bcef5acb0b075eec7cb4d802fa5df0ee3ef))

### [0.9.25](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.24...0.9.25) (2021-08-02)


### Features

* **Vis View:** :sparkles: Functional Vis Modal! ([ac59f6f](https://github.com/SkepticMystic/breadcrumbs/commit/ac59f6ffa11edf82388995efd9e4e239dc23e986))

### [0.9.24](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.23...0.9.24) (2021-08-02)


### Features

* **Stats View:** :sparkles: Initial Stats View set up, no content yet ([bfe0227](https://github.com/SkepticMystic/breadcrumbs/commit/bfe02278d18da1b3da596b24645e158cb817cb27))
* **Stats View:** :sparkles: Node, Real Edge, Implied Edge counts ([c89de64](https://github.com/SkepticMystic/breadcrumbs/commit/c89de64dc57b2f17ce3a5270d1a866b6395cf34b))


### Bug Fixes

* **List/Matrix View:** :bug: Draw l/m view onLoad, not onOpen ([7f4078d](https://github.com/SkepticMystic/breadcrumbs/commit/7f4078d7314fd942e354df43f684efbe80d39a67))

### [0.9.23](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.22...0.9.23) (2021-08-01)


### Bug Fixes

* :bug: less harsh falsey checking on rawValues content ([2e20b1e](https://github.com/SkepticMystic/breadcrumbs/commit/2e20b1e2977228c04c38c4e3eb127daf5ccce7c0))

### [0.9.22](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.21...0.9.22) (2021-08-01)


### Bug Fixes

* :bug: Initialise jugglLinks as empty array so that it always has .length ([96d32af](https://github.com/SkepticMystic/breadcrumbs/commit/96d32afa51b54d03dca391407f96e5c4882e78a3))

### [0.9.21](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.20...0.9.21) (2021-08-01)


### Bug Fixes

* **Grid View:** :bug: Forgot to change dotsColour instead of heatmapColour ([6e47621](https://github.com/SkepticMystic/breadcrumbs/commit/6e47621f07455a6a3194c012f2a271d621853624))
* **Juggl:** :bug: Fix Juggl links not showing ([b02377f](https://github.com/SkepticMystic/breadcrumbs/commit/b02377f3138136ef21b47b764dd4bd06bc4e2e41))

### [0.9.20](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.19...0.9.20) (2021-08-01)


### Bug Fixes

* :bug: Add debug logs to getFields and getFrontmatter functions ([193eb46](https://github.com/SkepticMystic/breadcrumbs/commit/193eb4603183581df71b70aabee4345ab1f819e2))
* :bug: Forgot to add default for aliasesInIndex setting ([1135617](https://github.com/SkepticMystic/breadcrumbs/commit/11356177167d062ad70308d2a60167e8083db022))

### [0.9.19](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.18...0.9.19) (2021-07-31)


### Features

* **CreateIndex:** :sparkles: Setting to show aliases in index ([670ae39](https://github.com/SkepticMystic/breadcrumbs/commit/670ae39b430eb5c8eb93f2d5b5951090add7f30f))

### [0.9.18](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.17...0.9.18) (2021-07-31)


### Features

* **Grid View:** :sparkles: Add dots visualisation to grid view ([146e126](https://github.com/SkepticMystic/breadcrumbs/commit/146e12632010a5899680b9e4703a3ba54cd0b22c))

### [0.9.17](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.16...0.9.17) (2021-07-31)


### Features

* **CreateIndex:** :sparkles: add Global Index command ([b12cf4b](https://github.com/SkepticMystic/breadcrumbs/commit/b12cf4bfd32e12552a03300e95fd42ad4cb21a7c))

### [0.9.16](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.15...0.9.16) (2021-07-21)


### Features

* **CreateIndex:** :lipstick: Add a notice when index is copied to clipboard ([a275f6f](https://github.com/SkepticMystic/breadcrumbs/commit/a275f6f685dbf56bd70396b5007cab76f93a92d3))

### [0.9.15](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.14...0.9.15) (2021-07-21)


### Bug Fixes

* **CreateIndex:** :bug: deep clone allPaths to mutate the copy instead ([664db77](https://github.com/SkepticMystic/breadcrumbs/commit/664db7752f0d7d8476785e4701896f3d1b2f3da0))

### [0.9.14](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.13...0.9.14) (2021-07-21)


### Features

* **CreateIndex:** Add setting to toggle wikilinks in index ([b76f919](https://github.com/SkepticMystic/breadcrumbs/commit/b76f919741042fd56dd24951261f02935e21d153))
* **CreateIndex:** CreateIndex Button now copies to clipboard ([3b9fa72](https://github.com/SkepticMystic/breadcrumbs/commit/3b9fa729ab918b6e977683f1a4744c417ed5c8fb))


### Bug Fixes

* :bug: closeImpliedLinks was mutating the input graphs ([5898872](https://github.com/SkepticMystic/breadcrumbs/commit/58988725d1a9343b6fb421df05b0ca1195ffaa5e))

### [0.9.13](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.12...0.9.13) (2021-07-21)


### Features

* **CreateIndex:** :sparkles: Improve CreateIndexButton Functionality ([6a60509](https://github.com/SkepticMystic/breadcrumbs/commit/6a6050983831f87e9476ebcc4bb1deca62abc4ac))

### 0.9.1 (2021-07-20)


### Bug Fixes

* "normal" bug. Cannot destructure gParents ([00901ae](https://github.com/SkepticMystic/breadcrumbs/commit/00901ae87790f9f8ec9a8042331fc8b071463b19))
* "Not path to..." was a link ([3d8e237](https://github.com/SkepticMystic/breadcrumbs/commit/3d8e237dea0dbfd58823cfe4d579ce3f6dce03ad))
* breacrumb trail with multiple parent fields ([ab3a2a5](https://github.com/SkepticMystic/breadcrumbs/commit/ab3a2a562f8da3da5a66966d60f7c68631af3b57))
* **conventional commits:** add standard-version to project ([8863074](https://github.com/SkepticMystic/breadcrumbs/commit/8863074f83362eba8de9d524a5666f165c936dbb))
* don't show current note when `indexNote?` ([5cd032c](https://github.com/SkepticMystic/breadcrumbs/commit/5cd032c72cf3a1f990a86ca8a90e36ad34504daf))
* don't show trail on kanbans ([eb8fefc](https://github.com/SkepticMystic/breadcrumbs/commit/eb8fefcde6ae57e487ca547d90c04abd6cd29b21))
* drop alias for Juggl Links ([011f7ad](https://github.com/SkepticMystic/breadcrumbs/commit/011f7add7c73ba4a69927e348e0f3713f099e448))
* empty pane ([119a680](https://github.com/SkepticMystic/breadcrumbs/commit/119a68046a70ebc1e49447b1530553193beb048c))
* indexNote arr ([9800573](https://github.com/SkepticMystic/breadcrumbs/commit/98005734073269e9c77bfba339990fd74c5925a2))
* inefficient removeDuplicateImplied ([3d2b88e](https://github.com/SkepticMystic/breadcrumbs/commit/3d2b88edeb252da3acf583d1e080911ef9e71c20))
* links now have real href and data-href ([1f6b61c](https://github.com/SkepticMystic/breadcrumbs/commit/1f6b61cf558b3176dedd0482fa64de65f71f00f6))
* list view numbers "resetting" at 0 ([fc32d66](https://github.com/SkepticMystic/breadcrumbs/commit/fc32d667ba24456af80a685e1b359d770cc3074d))
* rather focus leaf if item.to is already open ([4757999](https://github.com/SkepticMystic/breadcrumbs/commit/4757999894c0d408767a4d79526e865594f63258))
* real sibling implies a sibling ([a9eefb5](https://github.com/SkepticMystic/breadcrumbs/commit/a9eefb57a3a4284047ba9c3c23a72ec6add440da))
* removeDuplicateImplied ([c6379c2](https://github.com/SkepticMystic/breadcrumbs/commit/c6379c2564d02670c00a5bec30c3f0b2abcb8c77))
* removeDupliedImplied ([82409d7](https://github.com/SkepticMystic/breadcrumbs/commit/82409d7499e62cbefcbe5d1fac0af87f5821c88b))
* show multiple paths if `indexNote?` ([e302a97](https://github.com/SkepticMystic/breadcrumbs/commit/e302a97e01e8861d49eb624dae24282af2e08b36))
* Trail stays open ([b665927](https://github.com/SkepticMystic/breadcrumbs/commit/b66592781024485aa38435d70bdfa5eb59b9a251))
* TrailGrid overlap ([627c64d](https://github.com/SkepticMystic/breadcrumbs/commit/627c64d856a2cf9d152c6205eaa660faabcbd8e7))
* trailOrTable ([ceb61cd](https://github.com/SkepticMystic/breadcrumbs/commit/ceb61cd4fdc4b7789ac52369d66541d109b4d878))
