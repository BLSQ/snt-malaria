# Changelog

## [2.8.0](https://github.com/BLSQ/snt-malaria/compare/2.7.1...2.8.0) (2026-02-20)


### Features

* `ScenarioRule` endpoint for GET ([#193](https://github.com/BLSQ/snt-malaria/issues/193)) ([904c640](https://github.com/BLSQ/snt-malaria/commit/904c640fbc67e4f81feeea7d66f39bf90f504070))
* add `ScenarioRule` to admin + fix serializers ([#196](https://github.com/BLSQ/snt-malaria/issues/196)) ([d54db04](https://github.com/BLSQ/snt-malaria/commit/d54db04de5654379a99226e974c84938b68e7ffb))
* add models for rule-based scenarios ([#190](https://github.com/BLSQ/snt-malaria/issues/190)) ([c2f7548](https://github.com/BLSQ/snt-malaria/commit/c2f7548d28bfb330076f2f74553e6783acb923d3))
* add SNT permissions - backend ([#179](https://github.com/BLSQ/snt-malaria/issues/179)) ([5a544cc](https://github.com/BLSQ/snt-malaria/commit/5a544cc990f2f5d6aef3a5c1249fac93542d765a))
* SNT-269 when creating a scenario we should force users to give the scenario a name ([#182](https://github.com/BLSQ/snt-malaria/issues/182)) ([17bfe6d](https://github.com/BLSQ/snt-malaria/commit/17bfe6d9cd4384b5ef9ffa689b3715ad39484e5c))
* SNT-275 Don't display N/A if value is 0 ([#183](https://github.com/BLSQ/snt-malaria/issues/183)) ([c65a726](https://github.com/BLSQ/snt-malaria/commit/c65a726a1968b3309710cbb3f538f2a1b05321f5))
* SNT-285 i can create a assignment rule ([#191](https://github.com/BLSQ/snt-malaria/issues/191)) ([ec959f0](https://github.com/BLSQ/snt-malaria/commit/ec959f0b17d2d53521e72914ae47f4bf60a9a40a))
* SNT-301: Add population data to budget ([#189](https://github.com/BLSQ/snt-malaria/issues/189)) ([b52598b](https://github.com/BLSQ/snt-malaria/commit/b52598b68878593c120a56679a3f4fd0158c56b2))


### Bug Fixes

* Demo account recreate script ([3ab68c9](https://github.com/BLSQ/snt-malaria/commit/3ab68c993a29ec18592ab074d2d1dd9f1a43572a))

## [2.7.1](https://github.com/BLSQ/snt-malaria/compare/2.7.0...2.7.1) (2026-02-11)


### Bug Fixes

* **core:** Fix release pipeline ([#184](https://github.com/BLSQ/snt-malaria/issues/184)) ([2a09a38](https://github.com/BLSQ/snt-malaria/commit/2a09a380db40d73a13f53d2a13a6f50c9bc49627))

## [2.7.0](https://github.com/BLSQ/snt-malaria/compare/2.6.0...2.7.0) (2026-02-05)


### Features

* SNT-261 i can create a new metric layer ([#176](https://github.com/BLSQ/snt-malaria/issues/176)) ([26ea6c5](https://github.com/BLSQ/snt-malaria/commit/26ea6c51f2a73d910ffacb7c100d4f949ac95f82))

## [2.6.0](https://github.com/BLSQ/snt-malaria/compare/2.5.0...2.6.0) (2026-01-27)


### Features

* Add dummy population for DRC ([#138](https://github.com/BLSQ/snt-malaria/issues/138)) ([baf7766](https://github.com/BLSQ/snt-malaria/commit/baf7766195055de732afe9b66acc5cfb15af9018))
* Allow to override interventions for an account ([#137](https://github.com/BLSQ/snt-malaria/issues/137)) ([dcbec33](https://github.com/BLSQ/snt-malaria/commit/dcbec339f673b87aef8da11f8e2541461d5b6ed9))
* **data:** SNT-268 Update demo dummy data for BFA ([#171](https://github.com/BLSQ/snt-malaria/issues/171)) ([a774321](https://github.com/BLSQ/snt-malaria/commit/a774321cd76f546307821cfadacb84f75d7d5578))
* **frontend:** SNT-230 use short name for intervention map tooltip ([#161](https://github.com/BLSQ/snt-malaria/issues/161)) ([5d0e292](https://github.com/BLSQ/snt-malaria/commit/5d0e29277efa624db97b185de60a42aeb4a104ce))
* Snt 203 apply cost overrides ([#142](https://github.com/BLSQ/snt-malaria/issues/142)) ([1f0f04d](https://github.com/BLSQ/snt-malaria/commit/1f0f04d4cd504d151e6e55f8d18d12c1510ff4b5))
* SNT-170: Import population metadata ([#144](https://github.com/BLSQ/snt-malaria/issues/144)) ([c5c6aca](https://github.com/BLSQ/snt-malaria/commit/c5c6acaeb8d9a4a839c985db22b64363425b805a))
* SNT-179 lock a scenario ([#158](https://github.com/BLSQ/snt-malaria/issues/158)) ([235326e](https://github.com/BLSQ/snt-malaria/commit/235326e909f48d088e336b251434ec329e392a56))
* SNT-198 import nsp fine tunnings ([#132](https://github.com/BLSQ/snt-malaria/issues/132)) ([ec32e18](https://github.com/BLSQ/snt-malaria/commit/ec32e18e36ed4bb89e866fe781d54d5414214d31))
* SNT-201 show cost override settings panel ([#134](https://github.com/BLSQ/snt-malaria/issues/134)) ([a596fe7](https://github.com/BLSQ/snt-malaria/commit/a596fe7112a38b24565d2a6f52bd9da78a3a30c2))
* SNT-210 Add a cron job to recreate "demo" account every night ([#140](https://github.com/BLSQ/snt-malaria/issues/140)) ([7384d34](https://github.com/BLSQ/snt-malaria/commit/7384d34494d3d40beb5633c54f749fabe5357c59))
* SNT-211 improve data for burkina faso demo account ([#135](https://github.com/BLSQ/snt-malaria/issues/135)) ([5fca75a](https://github.com/BLSQ/snt-malaria/commit/5fca75add2bcea23f30d6f32823d461819495897))
* SNT-218: UI overflow improvement ([#141](https://github.com/BLSQ/snt-malaria/issues/141)) ([0d78ac3](https://github.com/BLSQ/snt-malaria/commit/0d78ac3106873d83d13bb23a21fa4fdfa696ff7f))
* SNT-220 improve charts legend display ([#143](https://github.com/BLSQ/snt-malaria/issues/143)) ([5a5ffb5](https://github.com/BLSQ/snt-malaria/commit/5a5ffb534fa306c174b50e9c77ba1d3bb6989d64))
* SNT-224: User can view the cost configuration on the cost settings page ([#154](https://github.com/BLSQ/snt-malaria/issues/154)) ([b405c83](https://github.com/BLSQ/snt-malaria/commit/b405c837ecc508d0a42c9cc6ab0d66e1e9836acf))
* SNT-234 intervention plan editable map per category ([#165](https://github.com/BLSQ/snt-malaria/issues/165)) ([2ff13f0](https://github.com/BLSQ/snt-malaria/commit/2ff13f0446db958ce2ab5cba3edb03a5ba4468f3))
* SNT-236: Set intervention id when saving intervention costs ([#159](https://github.com/BLSQ/snt-malaria/issues/159)) ([e723981](https://github.com/BLSQ/snt-malaria/commit/e723981ae0a6276963adf65264fd7d0bbf0ea9bf))
* SNT-238 Add utility to dummy metadata and handle when importing ([#160](https://github.com/BLSQ/snt-malaria/issues/160)) ([04768f3](https://github.com/BLSQ/snt-malaria/commit/04768f38b5cae1f027cd7bd524291ffac87a80ed))
* SNT-241: update BFA dummy scenario plan ([#162](https://github.com/BLSQ/snt-malaria/issues/162)) ([8d185ec](https://github.com/BLSQ/snt-malaria/commit/8d185eca7b5d668b713cbd9d02de52cd371fbdc2))
* SNT-260 As a user i can access a list of available layers ([#167](https://github.com/BLSQ/snt-malaria/issues/167)) ([2ed36c2](https://github.com/BLSQ/snt-malaria/commit/2ed36c2e8c13284411cd00c7b91dcfbff561ab9f))
* SNT-267: Use roboto font ([#166](https://github.com/BLSQ/snt-malaria/issues/166)) ([f25944c](https://github.com/BLSQ/snt-malaria/commit/f25944cd3945f0be3aec89254ca228b39750d7d7))
* SNT-279 Hide metric type settings behind dev feature flag ([#177](https://github.com/BLSQ/snt-malaria/issues/177)) ([651cebe](https://github.com/BLSQ/snt-malaria/commit/651cebe1a46f91c1a6bcc9685b2ef4bb656a85f1))
* SNT-64: Import metric type update, add or create instead of destructive ([#174](https://github.com/BLSQ/snt-malaria/issues/174)) ([04533f5](https://github.com/BLSQ/snt-malaria/commit/04533f59ae0b27813b63b3265180ef58f15c392b))


### Bug Fixes

* **deploy:** Update deployment python deploy version ([#172](https://github.com/BLSQ/snt-malaria/issues/172)) ([b2b4259](https://github.com/BLSQ/snt-malaria/commit/b2b42590e241b7231f686ea2469d67b6d3e944b6))
* SNT-121 Improve NSP Import ([#136](https://github.com/BLSQ/snt-malaria/issues/136)) ([f3b7473](https://github.com/BLSQ/snt-malaria/commit/f3b7473183c7ce21be0510319604a443fc65adf9))
* SNT-217 Setup scripts fine tuning ([#139](https://github.com/BLSQ/snt-malaria/issues/139)) ([cf87b1c](https://github.com/BLSQ/snt-malaria/commit/cf87b1cd3b323643a36ba750d55f5e036ec52aa9))
* SNT-246 Round numbers on hover to 2 decimales ([#169](https://github.com/BLSQ/snt-malaria/issues/169)) ([a737302](https://github.com/BLSQ/snt-malaria/commit/a7373025f1003373a86260503d3c0b877135a335))
* SNT-248: Accept strictly greater and smaller than ([#170](https://github.com/BLSQ/snt-malaria/issues/170)) ([4ccd756](https://github.com/BLSQ/snt-malaria/commit/4ccd75674cbf345decf6237f0e98fe7980d947c6))
* SNT-255: Use short name in legend and tooltip of intervention plan map ([#168](https://github.com/BLSQ/snt-malaria/issues/168)) ([a261e17](https://github.com/BLSQ/snt-malaria/commit/a261e17a9de5124af9ddb6449bebc2491e0140f7))
* SNT-273: Update message when adding assignment to plan ([#173](https://github.com/BLSQ/snt-malaria/issues/173)) ([2c9eba0](https://github.com/BLSQ/snt-malaria/commit/2c9eba08bb88e89d221549cf07965f96ef1a3711))
* Some typos, store cost input on the budget ([#148](https://github.com/BLSQ/snt-malaria/issues/148)) ([0b0c693](https://github.com/BLSQ/snt-malaria/commit/0b0c69333cc1a0530d861e595c95d9012eecb850))

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
