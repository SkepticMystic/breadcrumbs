# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
