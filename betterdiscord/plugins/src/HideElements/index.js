module.exports = (Plugin, Library) => {
	const {
		DOMTools,
		DiscordClasses,
		WebpackModules,
		Patcher,
		Filters,
		PluginUpdater,
		ReactTools,
		Settings
	} = Library;

	function findClass() {
		return WebpackModules.getByProps(...arguments);
	}

	return class HideElements extends Plugin {
		constructor() {
			super();
			this.defaultSettings = {};
			this.defaultSettings.elements = [];
			this.defaultSettings.sections = [];
		}

		classes = {
			settings: {
				...findClass('standardSidebarView'),
				sectionContent: {
					...findClass('children', 'sectionTitle'),
					...findClass('h1', 'title', 'defaultColor'),
					...DiscordClasses.Dividers,
					empty: findClass('settings', 'container')
				}
			},
			_privateChannels: {
				...findClass('privateChannels'),
				...findClass('privateChannelsHeaderContainer'),
				...findClass('channel', 'linkButton')
			}
		};

		classHidden = this.classes.settings.hidden ?? 'hidden';

		getSideBar() {
			const viewClass = findClass(
				'standardSidebarView'
			).standardSidebarView.split(' ')[0];
			return document.querySelector(`.${viewClass}`);
		}
		/**
		 *
		 * @param { (elements: Element[] | [], settings: [boolean, string][] | []) => {} } cb
		 * @returns { [ Element[] | undefined, [boolean, string][] | undefined ] }
		 */
		getElements(cb = () => {}) {
			/**
			 * @type { Element[] | []}
			 */
			let elements = [];
			/**
			 * @type { [boolean, string][] }
			 */
			let settings = this.settings.elements;
			let element = document.querySelector(
				`.${this.classes._privateChannels.privateChannelsHeaderContainer}`
			);
			if (!element) return [undefined, settings];
			for (
				element = element.previousElementSibling;
				element && element.ariaHidden != 'true';
				element = element.previousElementSibling
			) {
				elements.unshift(element);
			}

			settings
				.filter(
					([, textContent]) =>
						!elements.some((element) => textContent == element.textContent)
				)
				.forEach(([, text]) =>
					settings.splice(
						settings.findIndex(([, removedText]) => removedText == text),
						1
					)
				);
			elements
				.map(({ textContent }, index) =>
					!settings.some(([, text]) => textContent == text)
						? [index, textContent]
						: undefined
				)
				.filter((arr) => arr)
				.forEach(([index, textContent]) =>
					settings.splice(index, 0, [!!0, textContent])
				);
			this.saveSettings({ elements: settings });

			if (!!settings.length || !!elements.length) cb(elements, settings);
			return [!!elements.length ? elements : undefined, settings];
		}

		async onStart() {
			PluginUpdater.checkForUpdate(
				this._config.info.name,
				this._config.info.version,
				this._config.info.github_raw
			);
			this.$ = Object.setPrototypeOf(this.$, {
				toggle: (indicator) => {
					const changes = [];
					const elements = this.getElements((elements, settings) => {
						for (let index = 0; index < settings.length; index++) {
							if (!settings[index][0]) continue;
							changes.push([elements[index], indicator]);
							DOMTools.toggleClass(
								elements[index],
								this.classHidden,
								indicator
							);
						}
					});
					return [...elements, changes];
				}
			});
			this.$.toggle(!0);

			// https://github.com/BetterDiscord/BetterDiscord/tree/main/renderer/src/ui/settings.js#L69
			const UserSettings = await BdApi.Webpack.waitForModule(
				Filters.byPrototypeFields(['getPredicateSections'])
			);
			Patcher.after(
				UserSettings.prototype,
				'getPredicateSections',
				(thisObject, args, returnValue) => {
					if (!this._enabled) return;
					// returnValue.splice(
					// 	returnValue.findIndex(
					// 		({ label }) => label == 'Настройки выставления счетов'
					// 	),
					// 	7
					// );
					let location =
						returnValue.findIndex(
							(s) => s.section.toLowerCase() == 'changelog'
						) - 1;
					if (location < 0) return;
					const insert = (section) => {
						returnValue.splice(location, 0, section);
						location++;
					};
					insert({ section: 'DIVIDER' });
					insert({
						section: 'HEADER',
						label: this.name.match(/[A-Z][a-z]+/g).join(' ')
					});

					let [elements, settings] = this.getElements();
					insert({
						section: 'Hidden Elements',
						label: 'Скрытые элементы',
						element: () =>
							this.renderSectionContent(
								'Скрытые элементы',
								...(elements ?? settings).map((node) => {
									const textContent = node.textContent ?? node[1];
									const indexFound = settings.findIndex(
										(set) => set[1] == textContent
									);
									return ReactTools.createWrappedElement(
										new Settings.Switch(
											textContent,
											'',
											!!settings.length ? settings[indexFound][0] : !!0,
											(state) => {
												if (indexFound != -1) settings[indexFound][0] = state;
												else if (settings)
													settings.push([state, node.textContent]);
												else settings = [[state, node.textContent]];
												this.saveSettings({
													elements: settings
												});
												if (node.textContent) this.$(node).toggle(state);
											}
										).getElement()
									);
								})
							)
					});
				}
			);
			// https://github.com/BetterDiscord/BetterDiscord/tree/main/renderer/src/ui/settings.js#L100
			ReactTools.getStateNodes(this.getSideBar())[0]?.forceUpdate();
		}

		onStop() {
			Patcher.unpatchAll();
			ReactTools.getStateNodes(this.getSideBar())[0]?.forceUpdate();
			this.$.toggle(!!0);
		}

		/**
		 * https://docs.betterdiscord.app/plugins/introduction/structure#observer
		 *
		 * https://github.com/BetterDiscord/BetterDiscord/blob/main/renderer/src/modules/pluginmanager.js#L204
		 *
		 * https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
		 * @param {MutationRecord} mutation https://developer.mozilla.org/en-US/docs/Web/API/MutationRecord
		 */
		observer({ addedNodes }) {
			if (
				!addedNodes?.length ||
				!(addedNodes[0] instanceof Element) ||
				!DOMTools.hasClass(
					addedNodes[0],
					this.classes._privateChannels.channel
				) ||
				!addedNodes[0]?.nextElementSibling ||
				!DOMTools.hasClass(
					addedNodes[0].nextElementSibling,
					this.classes._privateChannels.privateChannelsHeaderContainer
				)
			)
				return;
			this.$.toggle(!0);
		}

		onSwitch() {
			this.$.toggle(!0);
		}

		/**
		 * Ну типа пародия на jquery, поняли отсылку, да?
		 * @param {Element | undefined} element
		 * @returns
		 */
		$(element) {
			console.log(arguments);
			return Object.create(element, {
				/**
				 * @param { boolean? } indicator
				 * @returns { Element[] | [Element, boolean]}
				 */
				toggle: (indicator) =>
					DOMTools.toggleClass(element, this.classHidden, indicator),
				elements: this.getElements
			});
		}

		renderSectionContent(parent, ...reactNodes) {
			const React = BdApi.React;
			const divProps = {};
			let childNodes = [
				React.createElement(
					'div',
					{
						className: this.classes.settings.sectionContent.sectionTitle
					},
					React.createElement(
						'h2',
						{
							className: [
								this.classes.settings.sectionContent.h1,
								this.classes.settings.sectionContent.defaultColor,
								this.classes.settings.sectionContent.defaultMarginh1
							].join(' ')
						},
						parent.textContent ?? parent
					)
				),
				React.createElement(
					'div',
					{
						className: this.classes.settings.sectionContent.children
					},
					...reactNodes
				)
			];

			if (!reactNodes.length || !this._enabled) {
				divProps.className = [
					'no-hidden-elements',
					this.classes.settings.sectionContent.empty.container,
					this.classes.settings.sectionContent.empty.settings
				].join(' ');
				childNodes = [
					React.createElement(
						'h2',
						{
							className: [
								this.classes.settings.sectionContent.defaultColor,
								this.classes.settings.sectionContent['heading-xl/semibold']
							].join(' ')
						},
						this._enabled
							? 'Отсуствуют элементы, которые можно скрыть'
							: 'Плагин выключен'
					)
				];
			}

			return React.createElement('div', divProps, ...childNodes);
		}
	};
};
