/**
 * @param Plugin
 * @param {import('zerespluginlibrary').BoundAPI} Library
 */
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
			this.defaultSettings = {
				elements: []
			}
		}

		classes = {
			custom: {
				hidden: 'lijs-he-hidden'
			},
			settings: {
				...findClass('children', 'sectionTitle'),
				...findClass('h1', 'title', 'defaultColor'),
				...DiscordClasses.Dividers,
				empty: findClass('settings', 'container')
			},
			_privateChannels: {
				...findClass('privateChannels'),
				...findClass('privateChannelsHeaderContainer'),
				...findClass('channel', 'linkButton')
			}
		};

		getSideBar = () => document.querySelector(
			`.${findClass('standardSidebarView').standardSidebarView.split(' ')[0]}`
		);
		/**
		 *
		 * @param  { (elements: Element[] | [], settings: [boolean, string][] | []) => {} } cb
		 * @returns
		 */
		getElements = (cb = () => {}) => {
			/**
			 * @type { Element[] | []}
			 */
			let elements = undefined;
			/**
			 * @type { [boolean, string][] }
			 */
			let settings = this.settings.elements;
			let element = document.querySelector(
				`.${this.classes._privateChannels.privateChannelsHeaderContainer}`
			);
			if (!element) return [elements, settings];
			else elements = [];

			for (
				element = element.previousElementSibling;
				element && element.ariaHidden !== 'true';
				element = element.previousElementSibling
			) {
				elements.unshift(element);
			}
			settings
				.filter(
					([, textContent]) =>
						!elements.some((element) => textContent === element.textContent)
				)
				.forEach(([, text]) =>
					settings.splice(
						settings.findIndex(([, removedText]) => removedText === text),
						1
					)
				);
			elements
				.map(({ textContent }, index) =>
					!settings.some(([, text]) => textContent === text)
						? [index, textContent]
						: undefined
				)
				.filter((arr) => arr)
				.forEach(([index, textContent]) =>
					settings.splice(index, 0, [false, textContent])
				);
			this.saveSettings({ elements: settings });

			if (!!elements.length || !!settings.length) cb(elements, settings);
			return [!!elements.length ? elements : undefined, settings];
		};

		$ = (element) => {
			return {
				/**
				 * @param { boolean? } indicator
				 * @returns {Element}
				 */
				toggle: (indicator) =>
					DOMTools.toggleClass(element, this.classes.custom.hidden, indicator),
				elements: this.getElements
			};
		};

		onStart = async () => {
			await PluginUpdater.checkForUpdate(config.info.name, config.info.version, config.info.github_raw);
			(new BdApi(config.info.name)).DOM.addStyle(`.${this.classes.custom.hidden} {display: none;}`);
			this.$ = Object.setPrototypeOf(this.$, {
				toggle: (indicator) => {
					const changes = [];
					const elements =
						this.getElements((elements, settings) => {
						for (let index = 0; index < settings.length; index++) {
							if (!settings[index][0]) continue;
							changes.push([elements[index], indicator]);
							DOMTools.toggleClass(
								elements[index],
								this.classes.custom.hidden,
								indicator
							);
						}
					});
					return [...elements, changes];
				}
			});
			void this.$.toggle(true);

			// https://github.com/BetterDiscord/BetterDiscord/tree/main/renderer/src/ui/settings.js#L69
			const UserSettings = await BdApi.Webpack.waitForModule(
				Filters.byPrototypeFields(['getPredicateSections'])
			);
			Patcher.after(
				UserSettings.prototype,
				'getPredicateSections',
				(thisObject, args, returnValue) => {
					if (!this._enabled) return;
					let location =
						returnValue.findIndex(
							(s) => s.section.toLowerCase() === 'changelog'
						) - 1;
					if (location < 0) return;
					const insert = (section) => {
						returnValue.splice(location, 0, section);
						location++;
					};
					insert({ section: 'DIVIDER', canHidden: false });
					insert({
						section: 'HEADER',
						label: this.name.match(/[A-Z][a-z]+/g).join(' '),
						canHidden: false
					});
					let [elements, settings] = this.getElements();
					insert({
						section: 'Hidden Elements',
						label: 'Скрытые элементы',
						element: () => this.renderSectionContent('Скрытые элементы',
								...(elements || settings).map((node) => {
									const textContent = node.textContent || node[1];
									const indexFound = settings.findIndex(
										(set) => set[1] === textContent
									);
									return ReactTools.createWrappedElement(
										new Settings.Switch(
											textContent,
											'',
											!!settings.length ? settings[indexFound][0] : false,
											(state) => {
												if (indexFound !== -1) settings[indexFound][0] = state;
												else if (settings)
													settings.push([state, node.textContent]);
												else settings = [[state, node.textContent]];
												this.saveSettings({
													elements: settings
												});
												if (node.textContent) void this.$(node).toggle(state);
											}
										).getElement()
									);
								})
							),
						canHidden: false
					});
				}
			);
			// https://github.com/BetterDiscord/BetterDiscord/tree/main/renderer/src/ui/settings.js#L100
			ReactTools.getStateNodes(this.getSideBar())[0]?.forceUpdate();
		}

		onStop = () => {
			ReactTools.getStateNodes(this.getSideBar())[0]?.forceUpdate();
			Patcher.unpatchAll();
			(new BdApi(config.info.name)).DOM.removeStyle();
			void this.$.toggle(false);
		}

		/**
		 * https://docs.betterdiscord.app/plugins/introduction/structure#observer
		 *
		 * https://github.com/BetterDiscord/BetterDiscord/blob/main/renderer/src/modules/pluginmanager.js#L204
		 *
		 * https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
		 * @param {MutationRecord} mutation https://developer.mozilla.org/en-US/docs/Web/API/MutationRecord
		 */
		observer = ({ addedNodes }) => {
			if (
				!addedNodes.length ||
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
			void this.$.toggle(true);
		}

		onSwitch = ()=> {
			void this.$.toggle(true);
		}

		renderSectionContent = (header, ...reactNodes) => {
			const React = BdApi.React;
			const divProps = {};
			let childNodes = [
				React.createElement(
					'div',
					{
						className: this.classes.settings.sectionTitle
					},
					React.createElement(
						'h2',
						{
							className: [
								this.classes.settings.h1,
								this.classes.settings.defaultColor,
								this.classes.settings.defaultMarginh1
							].join(' ')
						},
						header.textContent ||
						header ||
						this.name.match(/[A-Z][a-z]+/g).join(' ')
					)
				),
				React.createElement(
					'div',
					{
						className: this.classes.settings.children
					},
					...reactNodes
				)
			];

			if (!reactNodes.length || !this._enabled) {
				divProps.className = [
					'no-hidden-elements',
					this.classes.settings.empty.container,
					this.classes.settings.empty.settings
				].join(' ');
				childNodes = [
					React.createElement(
						'h2',
						{
							className: [
								this.classes.settings.defaultColor,
								this.classes.settings['heading-xl/semibold']
							].join(' ')
						},
						this._enabled
							? 'Отсутствуют элементы, которые можно скрыть'
							: 'Плагин выключен'
					)
				];
			}

			return React.createElement('div', divProps, ...childNodes);
		}
	};
};
