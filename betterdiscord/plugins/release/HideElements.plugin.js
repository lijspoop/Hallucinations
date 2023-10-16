/**
 * @name HideElements
 * @description Позволяет скрыть некоторые HTML элементы
 * @version 0.2.9
 * @author neutron6663
 * @authorId 352076839407190016
 * @website https://github.com/neutron6663/Hallucinations/tree/master/betterdiscord/plugins/
 * @source https://neutron6663.github.io/Hallucinations/betterdiscord/plugins/release/HideElements.plugin.js
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    main: "index.js",
    info: {
        name: "HideElements",
        authors: [
            {
                name: "neutron6663",
                discord_id: "352076839407190016",
                github_username: "neutron6663"
            }
        ],
        version: "0.2.9",
        description: "Позволяет скрыть некоторые HTML элементы",
        github: "https://github.com/neutron6663/Hallucinations/tree/master/betterdiscord/plugins/",
        github_raw: "https://neutron6663.github.io/Hallucinations/betterdiscord/plugins/release/HideElements.plugin.js",
        changelog: [
            {
                title: "Изменения",
                type: "improved",
                items: [
                    "Для красоты увеличил код",
                    "Сделал свой jQuery называется"
                ]
            }
        ]
    }
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
}
 
if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}
 
module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
     const plugin = (Plugin, Library) => {
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
					console.log(returnValue);

					returnValue.splice(
						returnValue.findIndex(
							({ label }) => label == 'Настройки выставления счетов'
						),
						7
					);
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

					// console.log(
					// 	returnValue.map((sec) => {
					// 		const mySection = { section: sec.section };
					// 		if ('label' in sec) mySection.label = sec.label;
					// 		return mySection;
					// 	})
					// );
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
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/