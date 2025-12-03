# Changelog

## [2.5.0](https://github.com/BLSQ/snt-malaria/compare/2.4.0...2.5.0) (2025-12-02)


### Features

* Remove cache duration and only keep staleTime when it makes sense ([#117](https://github.com/BLSQ/snt-malaria/issues/117)) ([549f373](https://github.com/BLSQ/snt-malaria/commit/549f373b178fd7f13b94ff3c346a1ef093419c86))
* SNT-178: Add customize button on intervention plan map ([#116](https://github.com/BLSQ/snt-malaria/issues/116)) ([3c14d38](https://github.com/BLSQ/snt-malaria/commit/3c14d381f31fbf69adb820b7833a87520af14b28))
* SNT-184 display the total budget on the scenario details page ([#128](https://github.com/BLSQ/snt-malaria/issues/128)) ([6191900](https://github.com/BLSQ/snt-malaria/commit/619190059d5add0d0c5272eb78d967151d4f01b0))
* SNT-185 Update snt_malaria_budgeting package version ([#121](https://github.com/BLSQ/snt-malaria/issues/121)) ([9b06945](https://github.com/BLSQ/snt-malaria/commit/9b0694543faea4b3c79f0fe89b4e5f32d54f9d30))
* SNT-186 endpoint for nsp csv intervention assignments ([#122](https://github.com/BLSQ/snt-malaria/issues/122)) ([25b04b4](https://github.com/BLSQ/snt-malaria/commit/25b04b41615af585d6cd1e41801ecc4dc79e41e9))
* SNT-187 users can download a csv template to manually set up an intervention plan ([c2f187a](https://github.com/BLSQ/snt-malaria/commit/c2f187a4f8c1a749a5a95d63da6a482e71641d87))
* SNT-188 users can import a csv intervention plan ([#124](https://github.com/BLSQ/snt-malaria/issues/124)) ([56c242b](https://github.com/BLSQ/snt-malaria/commit/56c242bfa6cd0d3735be3ee4ece5771800d0166a))
* SNT-189 users can see the cost breakdown per org unit ([#127](https://github.com/BLSQ/snt-malaria/issues/127)) ([330bb09](https://github.com/BLSQ/snt-malaria/commit/330bb09426ccedf5db424c08b79df5d3377779bf))


### Bug Fixes

* Add all population metrics to BurkinaFaso dummies ([#130](https://github.com/BLSQ/snt-malaria/issues/130)) ([7714570](https://github.com/BLSQ/snt-malaria/commit/7714570144b51798f7a510662d3afb451a146af1))
* Don´t break the scenario page if there are no metrics ([#119](https://github.com/BLSQ/snt-malaria/issues/119)) ([c7b80c7](https://github.com/BLSQ/snt-malaria/commit/c7b80c7f779f7587638ae049ac5bf2c68f06ab85))
* import NSP, target org units from project ([#131](https://github.com/BLSQ/snt-malaria/issues/131)) ([a5258fd](https://github.com/BLSQ/snt-malaria/commit/a5258fde15a585a10bfff2935d8b7c0cef26d847))
* Prevent infinite loop in scenario side map ([#120](https://github.com/BLSQ/snt-malaria/issues/120)) ([fee336c](https://github.com/BLSQ/snt-malaria/commit/fee336c3e432e71e075dc272307fcb596aeb01dc))

## [2.4.0](https://github.com/BLSQ/snt-malaria/compare/2.3.0...2.4.0) (2025-11-03)


### Features

* Add API endpoint to calculate budget ([#103](https://github.com/BLSQ/snt-malaria/issues/103)) ([69607f3](https://github.com/BLSQ/snt-malaria/commit/69607f39a1a0111e91ff9a3a7eed993e5abd3e57))
* create budgeting models ([#107](https://github.com/BLSQ/snt-malaria/issues/107)) (SNT-160) ([65a3b4f](https://github.com/BLSQ/snt-malaria/commit/65a3b4f2e8cd3abf24fe0edafe2f68fe870a64ca))
* SNT-121 Add run budget button no action yet ([#75](https://github.com/BLSQ/snt-malaria/issues/75)) ([98323f3](https://github.com/BLSQ/snt-malaria/commit/98323f3ef5be9eba585ac29354f05ee388b68292))
* SNT-122, SNT-123, SNT-124 metric selection per intervention ([#104](https://github.com/BLSQ/snt-malaria/issues/104)) ([82f4828](https://github.com/BLSQ/snt-malaria/commit/82f4828e48714677aa238c8b999a45136913ac73))
* SNT-127 Edit detailed cost per intervention ([#92](https://github.com/BLSQ/snt-malaria/issues/92)) ([26ce277](https://github.com/BLSQ/snt-malaria/commit/26ce2778f9a58f35de012d47e19a62a9f7faab36))
* SNT-147 Validate name and show error ([#98](https://github.com/BLSQ/snt-malaria/issues/98)) ([5cc1654](https://github.com/BLSQ/snt-malaria/commit/5cc1654d0d1122e7677509bed3935257e040792a))
* SNT-152 manage year for costing ([#110](https://github.com/BLSQ/snt-malaria/issues/110)) ([6661f8e](https://github.com/BLSQ/snt-malaria/commit/6661f8ea17a625f9c1e2b5f3bd2814c55f809250))
* SNT-154 increase map sizes ([#101](https://github.com/BLSQ/snt-malaria/issues/101)) ([9b9c3b9](https://github.com/BLSQ/snt-malaria/commit/9b9c3b94b39fc214a944b50c1d569350519761ac))
* SNT-156 Use the budget function package in the backend ([#108](https://github.com/BLSQ/snt-malaria/issues/108)) ([7ece984](https://github.com/BLSQ/snt-malaria/commit/7ece984ad76bed8d112d743ad7b6effa12626b34))
* SNT-157 define a period for a scenario ([#106](https://github.com/BLSQ/snt-malaria/issues/106)) ([6bc3140](https://github.com/BLSQ/snt-malaria/commit/6bc3140b9c348fac3d8b6c67f427de577061ce69))
* SNT-159 Replace open field for unit by a select ([#105](https://github.com/BLSQ/snt-malaria/issues/105)) ([77969f3](https://github.com/BLSQ/snt-malaria/commit/77969f35636e122187e8092ebe262f00497ad1a6))
* SNT-171 update fe response and request for budgeting ([#112](https://github.com/BLSQ/snt-malaria/issues/112)) ([51a03ce](https://github.com/BLSQ/snt-malaria/commit/51a03ce6d5b7ea5b86fb95d84f3f3b5e26daaa36))
* SNT-172 select unselect org units from intervention plan map ([#113](https://github.com/BLSQ/snt-malaria/issues/113)) ([892c8c1](https://github.com/BLSQ/snt-malaria/commit/892c8c1b50891e20c2250b3eb6c50ed7ebb8fdbb))
* SNT-173 refinements on budgets ([#115](https://github.com/BLSQ/snt-malaria/issues/115)) ([3317105](https://github.com/BLSQ/snt-malaria/commit/3317105a830e4fba1ff994f8fe7e06d355731b93))


### Bug Fixes

* Fix migration ([#114](https://github.com/BLSQ/snt-malaria/issues/114)) ([9e055fa](https://github.com/BLSQ/snt-malaria/commit/9e055fad076fc4bf2e24a841d1776fb479ba2233))

## [2.3.0](https://github.com/BLSQ/snt-malaria/compare/2.2.0...2.3.0) (2025-09-23)


### Features

* SNT-125 setting page for costs ([b7a3182](https://github.com/BLSQ/snt-malaria/commit/b7a3182fe3e58eb388a38ff06647b7b3105dd276))
* SNT-126 Edit cost per intervention covers only total cost for now ([3a9e657](https://github.com/BLSQ/snt-malaria/commit/3a9e657d2c900bcf32b8784437ed8426e2105f5d))
* SNT-134 Show intervention plan map by default & SNT-136: Improve tooltip on main map when data is missing ([b2a18bc](https://github.com/BLSQ/snt-malaria/commit/b2a18bccdc5c3b89a0653548b786f2199dbd2dcb))
* SNT-145: Share state between map and list ([#91](https://github.com/BLSQ/snt-malaria/issues/91)) ([9aafe16](https://github.com/BLSQ/snt-malaria/commit/9aafe161402213c3b10bc47109709540e1aea720))
* SNT-146: Display amount of districts added to plan ([#93](https://github.com/BLSQ/snt-malaria/issues/93)) ([529cd37](https://github.com/BLSQ/snt-malaria/commit/529cd378e3158f8862b14c3573059e06d37933f3))
* SNT-149 refine map zoom step size ([#94](https://github.com/BLSQ/snt-malaria/issues/94)) ([c16f49a](https://github.com/BLSQ/snt-malaria/commit/c16f49aeb00332d1c4626aecfd73fee8fda9588e))
* SNT-150: Allow query less or equal ([#95](https://github.com/BLSQ/snt-malaria/issues/95)) ([3ecfd35](https://github.com/BLSQ/snt-malaria/commit/3ecfd35d81959e1c37b149046081d17011d11871))
* SNT-151 Empty selection when filter doesn't return anything ([#96](https://github.com/BLSQ/snt-malaria/issues/96)) ([b621fd2](https://github.com/BLSQ/snt-malaria/commit/b621fd24461a9cbde6bfa6643154d8e987f1355d))


### Bug Fixes

* SNT-133 Clean up setuper script ([ea93448](https://github.com/BLSQ/snt-malaria/commit/ea934484fa2f8989e71597875f86ce31d36d66ff))
* SNT-138: Improve logs when importing metrics ([ed5e776](https://github.com/BLSQ/snt-malaria/commit/ed5e7760f966836e416a4a7ab0aff2d70f59e256))
* SNT-141 fix ordinal string legend map color ([5e9d66b](https://github.com/BLSQ/snt-malaria/commit/5e9d66bfc3c4dae8c1c6e187249a0d7b9f6e6fc1))
* SNT-142: re-fetch scenario on title change ([#97](https://github.com/BLSQ/snt-malaria/issues/97)) ([c6e5f3c](https://github.com/BLSQ/snt-malaria/commit/c6e5f3ca19544eea4350c3475b8f664f8bc3498b))
* Update dummy datasets to correctly display data ([#88](https://github.com/BLSQ/snt-malaria/issues/88)) ([7c1ddc9](https://github.com/BLSQ/snt-malaria/commit/7c1ddc9217711abc5ffd553e9073e5a33ebedf3e))

## [2.2.0](https://github.com/BLSQ/snt-malaria/compare/2.1.0...2.2.0) (2025-08-29)


### Features

* [Front] As a user I can see the details of an org unit when clicking it's shape ([6829311](https://github.com/BLSQ/snt-malaria/commit/68293111763ad14cb93f49efefc6bd3e21e5fed3))
* [Front] Improve the design of the Intervention Mix + Plan + Budget sections ([6dca537](https://github.com/BLSQ/snt-malaria/commit/6dca537cdcbc034a4cb4d6799a5808b010c10e90))
* Add a admin page to manually launch metrics... ([ebf1810](https://github.com/BLSQ/snt-malaria/commit/ebf1810c096d014d0bfb688bf0cf7b886d9a4f0f))
* Add API endpoint for Scenarios ([b5f840f](https://github.com/BLSQ/snt-malaria/commit/b5f840fa11d1701f556313935a5ea7e46380bfa9))
* Add API endpoints for Intervention and InterventionCategory ([9874612](https://github.com/BLSQ/snt-malaria/commit/987461258b93ab35ec391eab75036edacdb4f057))
* Add coloring and legends for all metrics ([28c7c5a](https://github.com/BLSQ/snt-malaria/commit/28c7c5a6baf587616659a4798222584d7ad5b97b))
* Add scale and legend type when importing metrics ([8bafb3c](https://github.com/BLSQ/snt-malaria/commit/8bafb3cf12041abde726cad6cc472e769f9f06dd))
* Add side maps ([aa51986](https://github.com/BLSQ/snt-malaria/commit/aa5198663488e6536e5d9a31aff727a7411e0b0f))
* Add the budget part ([ada2dbc](https://github.com/BLSQ/snt-malaria/commit/ada2dbc8c4f9bf465cd849951b1f6ce8667832bc))
* As a user I can select multiple interventions from the same category ([add0796](https://github.com/BLSQ/snt-malaria/commit/add079674e93ce29594d396d3b21bb04a3ea8d11))
* Create a "default" scenario for Burkina Faso ([fe63ef6](https://github.com/BLSQ/snt-malaria/commit/fe63ef6dc0922ae653d66f4fa2fa5af013705d22))
* custom drawer style ([ce3c622](https://github.com/BLSQ/snt-malaria/commit/ce3c622b3c6ab31a684379ee763c334a12869373))
* Fetch datasets from OpenHEXA v1 ([d40b06a](https://github.com/BLSQ/snt-malaria/commit/d40b06a5bc49d3bc3cb287cd8096b203951928d3))
* Implement the "Apply intervention mix" button with the API that goes with it ([b696854](https://github.com/BLSQ/snt-malaria/commit/b696854c9fcd237bf65a2be52982d0c23f189b04))
* Implement the "Intervention plan" section ([ee1e411](https://github.com/BLSQ/snt-malaria/commit/ee1e411b51a3dc4be3df28fd4bb652a88edbf8f5))
* Import all other metrics for BFA + SNT-31 Allow filtering of OUs on multiple filter rules ([2db7b96](https://github.com/BLSQ/snt-malaria/commit/2db7b96ceaa99ebfa831fda6a30e6cc96975221c))
* Import metrics form OpenHEXA ([f21cfc9](https://github.com/BLSQ/snt-malaria/commit/f21cfc9fbfc4be3dfe004db26688f50d51da7953))
* Improve map legends (align with designs) ([614257c](https://github.com/BLSQ/snt-malaria/commit/614257c7f7d6504e07677c88801d23a3e613cea7))
* Improvement of LayersDrawer + allow selection of OUs based on rule ([7f43723](https://github.com/BLSQ/snt-malaria/commit/7f43723c3a83efed710bed48e57a394a283dcfe7))
* Override interventions mix for a selected orgUnit when mix applied ([cc0dfea](https://github.com/BLSQ/snt-malaria/commit/cc0dfeae7f0b9ac8f674b9b584ec661abc3af013))
* Skeleton of the planning page ([f72ab4e](https://github.com/BLSQ/snt-malaria/commit/f72ab4e2bf868cb147e58e632b570a50331358c3))
* Snt 106 merge branch snt malario to iaso codebase ([78020f6](https://github.com/BLSQ/snt-malaria/commit/78020f669e6801a76b56b6f6b6c2c22c94d90795))
* update colors for covariants and layouts on map ([a0fd460](https://github.com/BLSQ/snt-malaria/commit/a0fd4607feaef7df52dc90cc384ed0fe5632a92f))
* Update the intervention seed script with correct data ([a86d578](https://github.com/BLSQ/snt-malaria/commit/a86d57831b01e9052bda163bb9675f59965724b2))


### Bug Fixes

* [Front] As a user I can manage scenarios ([b9dfabd](https://github.com/BLSQ/snt-malaria/commit/b9dfabd506a3835193cf432d9dd9e6bbc3e0af2a))
* [Front] As a user I can see the list of possible interventions ([2cc6169](https://github.com/BLSQ/snt-malaria/commit/2cc61699466971a2df528acde3be260726279a8c))
* Add trailing / to avoid redirects ([6c1caab](https://github.com/BLSQ/snt-malaria/commit/6c1caabc7a14546ae4f66078dc59bdfe69c63486))
* Black ([0b9839a](https://github.com/BLSQ/snt-malaria/commit/0b9839affcd5c1ebad6968d37fe437755341fa77))
* Black formatting ([a7df4e6](https://github.com/BLSQ/snt-malaria/commit/a7df4e63c90675135b8e30a44066003b445833ff))
* Change SNT web app layout ([cc9e226](https://github.com/BLSQ/snt-malaria/commit/cc9e22634c6f68fa49344476af5f421fbe7eb0a9))
* Correctly use Django Rest Framework's destroy action ([ea66a3f](https://github.com/BLSQ/snt-malaria/commit/ea66a3fad0a0ca63f5bc7793d37b73d8ea5e2092))
* Deploy script ([0a4adde](https://github.com/BLSQ/snt-malaria/commit/0a4addee64e40d4584156caa8860ba36c3a6aa1b))
* Display a list of selected districts and be able to remove one or clear the selection ([fac9265](https://github.com/BLSQ/snt-malaria/commit/fac9265cdac4d6b7d51d852d1c7d0704627978b3))
* Don't round anything in the script ([8444d78](https://github.com/BLSQ/snt-malaria/commit/8444d78c8a1863e2e650911e6d579d164dcedaee))
* Fix PR reviews ([f651fdd](https://github.com/BLSQ/snt-malaria/commit/f651fdd8a40daff0beb154134e630355ecca7d04))
* import_openhexa_metrics Django command ([cbf1326](https://github.com/BLSQ/snt-malaria/commit/cbf1326af2fcd3a2648713af1683bbe44d1aa324))
* LayersDrawer maxHeight ([336a61d](https://github.com/BLSQ/snt-malaria/commit/336a61db377a6b75677ee68282ab3ef7cc17ed65))
* Move release-please.yml to correct location ([#78](https://github.com/BLSQ/snt-malaria/issues/78)) ([3c980bf](https://github.com/BLSQ/snt-malaria/commit/3c980bfa74732ff975b4fe7e6e2b3d99215b26ed))
* typo ([6f825d1](https://github.com/BLSQ/snt-malaria/commit/6f825d1a471860c5a2d381f8f1e6188f6ae817d4))
* typo ([04a5255](https://github.com/BLSQ/snt-malaria/commit/04a5255261deb6d6e495d5c2601c98e395e94e2e))
