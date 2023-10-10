/**
 * @name HideElements
 * @description Позволяет скрыть некоторые html элементы
 * @version 0.2.6
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
        version: "0.2.6",
        description: "Позволяет скрыть некоторые html элементы",
        github: "https://github.com/neutron6663/Hallucinations/tree/master/betterdiscord/plugins/",
        github_raw: "https://neutron6663.github.io/Hallucinations/betterdiscord/plugins/release/HideElements.plugin.js",
        changelog: [
            {
                title: "Новое",
                items: [
                    "Говно-код теперь стал открытым говно-кодом",
                    "Добавлено автоматическое обновление",
                    "Добавлен список изменений"
                ]
            },
            {
                title: "Изменения",
                type: "improved",
                items: [
                    "Теперь используется Patcher для настроек плагина",
                    "Удален лишний код связанный с работой секций настроек"
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
		ReactTools
	} = Library;

	const classes = {
		settings: {
			...WebpackModules.getByProps('contentRegionScroller'),
			sectionContent: {
				...WebpackModules.getByProps('children', 'sectionTitle'),
				...WebpackModules.getByProps('h1', 'title', 'defaultColor'),
				...DiscordClasses.Dividers,
				empty: WebpackModules.getByProps('settings', 'container')
			}
		},
		_privateChannels: {
			...WebpackModules.getByProps('privateChannels'),
			...WebpackModules.getByProps('privateChannelsHeaderContainer'),
			...WebpackModules.getByProps('channel', 'linkButton')
		}
	};

	const getSideBar = () => {
		const viewClass = WebpackModules.getByProps(
			'standardSidebarView'
		)?.standardSidebarView.split(' ')[0];
		return document.querySelector(`.${viewClass}`);
	};

	return class HideElements extends Plugin {
		constructor() {
			super();
			this.defaultSettings = {};
			this.defaultSettings.elements = {};
			this.sections = [];
		}

		async onStart() {
			PluginUpdater.checkForUpdate(
				this._config.info.name,
				this._config.info.version,
				this._config.info.github_raw
			);

			// https://github.com/BetterDiscord/BetterDiscord/tree/main/renderer/src/ui/settings.js#L69
			const UserSettings = await BdApi.Webpack.waitForModule(
				Filters.byPrototypeFields(['getPredicateSections'])
			);
			this.#visibilityToggle.all(true);
			Patcher.after(
				UserSettings.prototype,
				'getPredicateSections',
				(thisObject, args, returnValue) => {
					let location =
						returnValue.findIndex(
							(s) => s.section.toLowerCase() == 'changelog'
						) - 1;
					if (location < 0 || !this._enabled) return;
					this.#hidePluginSections(false);
					const insert = (section) => {
						returnValue.splice(location, 0, section);
						location++;
					};
					insert({ section: 'DIVIDER' });
					insert({
						section: 'HEADER',
						label: this.name.match(/[A-Z][a-z]+/g).join(' ')
					});

					const elements =
						this.#getElements() ?? Object.entries(this.settings.elements);
					let nodes = [];
					if (elements?.length) {
						elements.forEach((node, index) => {
							const setting = {
								type: 'switch',
								// node.textContent ?? [index] - ключ; [1] элемент массива [ false, "Друзья" ])
								name: node.textContent ?? this.settings.elements[index][1],
								id: index
							};

							setting.value = this.settings.elements[index][0] ?? false;
							setting.onChange = (state) => {
								this.settings.elements[index][0] = state;
								this.saveSettings({
									elements: { [index]: this.settings.elements[index] }
								});
								this.#visibilityToggle.element(node, state);
							};
							nodes.push(
								ReactTools.createWrappedElement(
									this.buildSetting(setting).getElement()
								)
							);
						});
					}

					insert({
						section: 'Hidden Elements',
						label: 'Скрытые элементы',
						element: () =>
							this.#createSectionContent('Скрытые элементы', ...nodes)
					});
				}
			);
			// https://github.com/BetterDiscord/BetterDiscord/tree/main/renderer/src/ui/settings.js#L100
			ReactTools.getStateNodes(getSideBar())[0].forceUpdate();
		}

		onStop() {
			Patcher.unpatchAll();
			this.#visibilityToggle.all();
			this.#hidePluginSections();
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
			if (!addedNodes?.length || !(addedNodes[0] instanceof Element)) return;
			const element = addedNodes[0];
			const privateChannelsElement = DOMTools.hasClass(
				element,
				classes._privateChannels.channel
			)
				? element
				: null;
			if (privateChannelsElement?.nextElementSibling) {
				const privateChannelsHeaderContainer = DOMTools.hasClass(
					privateChannelsElement.nextElementSibling,
					classes._privateChannels.privateChannelsHeaderContainer
				)
					? privateChannelsElement.nextElementSibling
					: null;
				if (!privateChannelsHeaderContainer) return;
				this.#hideElements();
			}
		}

		onSwitch() {
			this.#hideElements();
		}

		#visibilityToggle = {
			all: (hide = false) => {
				this.#hideElements(hide);
			},
			element: (node, hide = false) => {
				if (!node) return false;
				const args = [node, classes.settings.hidden];
				if (hide && !DOMTools.hasClass(...args)) {
					DOMTools.addClass(...args);
					return true;
				} else if (!hide && DOMTools.hasClass(...args)) {
					DOMTools.removeClass(...args);
					return true;
				}
				return false;
			}
		};

		#createSectionContent(parent, ...nodes) {
			const React = BdApi.React;
			const divProps = {};
			let h2 = React.createElement(
				'h2',
				{
					className: [
						classes.settings.sectionContent.h1,
						classes.settings.sectionContent.defaultColor,
						classes.settings.sectionContent.defaultMarginh1
					].join(' ')
				},
				parent.textContent ?? parent
			);
			let sectionTitle = React.createElement(
				'div',
				{
					className: classes.settings.sectionContent.sectionTitle
				},
				h2
			);
			let children = React.createElement(
				'div',
				{
					className: classes.settings.sectionContent.children
				},
				...nodes
			);
			let childNodes = [sectionTitle, children];

			if (!nodes.length || !this._enabled) {
				h2 = React.createElement(
					'h2',
					{
						className: [
							classes.settings.sectionContent.defaultColor,
							classes.settings.sectionContent['heading-xl/semibold']
						].join(' ')
					},
					this._enabled
						? 'Отсуствуют элементы, которые можно скрыть'
						: 'Плагин выключен'
				);
				divProps.className = [
					'no-hidden-elements',
					classes.settings.sectionContent.empty.container,
					classes.settings.sectionContent.empty.settings
				].join(' ');
				childNodes = [h2];
			}

			return React.createElement('div', divProps, ...childNodes);
		}

		#getElements(
			parent = document.querySelector(
				`.${classes._privateChannels.privateChannels}`
			)
		) {
			let elements = [];
			const privateChannelsHeaderContainer = parent?.querySelector(
				`.${classes._privateChannels.privateChannelsHeaderContainer}`
			)
			if (
				!parent ||
				!privateChannelsHeaderContainer
			)
				return null;
			for (
				let item = privateChannelsHeaderContainer.previousElementSibling;
				item && item.ariaHidden != 'true';
				item = item.previousElementSibling
			) {
				elements.push(item);
			}
			elements = elements.reverse();

			for (let index = 0; index < elements.length; index++) {
				if (
					this.settings.elements.hasOwnProperty(index) &&
					this.settings.elements[index][1] == elements[index].textContent
				)
					continue;
				this.settings.elements[index] = [false, elements[index].textContent];
			}
			this.settings.elements = Object.assign(
				{},
				Object.entries(this.settings.elements)
					.slice(0, elements.length)
					.map((entry) => entry[1])
			);
			this.saveSettings({
				elements: this.settings.elements
			});
			return elements;
		}

		#hideElements(hide = true) {
			const settingsElement = this.settings.elements;
			const elements = this.#getElements();
			if (!Object.keys(settingsElement).length || !elements || !elements.length)
				return null;
			for (
				let index = 0;
				index < Object.keys(settingsElement).length;
				index++
			) {
				const setting = settingsElement[index];
				if (!setting[0]) continue;
				this.#visibilityToggle.element(elements[index], hide);
			}
		}

		#hidePluginSections(hide = true) {
			let sidebar = getSideBar();
			if (sidebar) {
				const sidebarNodes = sidebar.querySelector('nav > div').childNodes;
				const hideelements = Array.prototype.filter.call(
					sidebar.querySelectorAll('[data-text-variant="eyebrow"]'),
					(node) => {
						return (
							node.textContent == this.name.match(/[A-Z][a-z]+/g).join(' ')
						);
					}
				);
				if (!hideelements[0]) return;
				const index = Array.prototype.indexOf.call(
					sidebarNodes,
					hideelements[0]?.parentElement
				);
				Array.prototype.slice
					.call(sidebarNodes, index, index + 3)
					.forEach((element) => this.#visibilityToggle.element(element, hide));
			}
		}
	};
};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/