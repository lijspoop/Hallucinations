/**
 * @name HideElements
 * @description Позволяет скрыть некоторые HTML элементы
 * @version 0.3.0
 * @author neutron6663
 * @authorId 352076839407190016
 * @website https://github.com/lijspoop/Hallucinations/tree/master/betterdiscord/plugins/
 * @source https://raw.githubusercontent.com/lijspoop/Hallucinations/master/betterdiscord/plugins/release/HideElements.plugin.js
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
                github_username: "lijspoop"
            }
        ],
        version: "0.3.0",
        description: "Позволяет скрыть некоторые HTML элементы",
        github: "https://github.com/lijspoop/Hallucinations/tree/master/betterdiscord/plugins/",
        github_raw: "https://raw.githubusercontent.com/lijspoop/Hallucinations/master/betterdiscord/plugins/release/HideElements.plugin.js"
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
			await PluginUpdater.checkForUpdate(config.info.name, config.info.version, config.info.github_raw,
				(current, remote) => {
					// в оригинале: return remote > current
					current = current.split('.').map((str) => +str); remote = remote.split('.').map((e) => +e);
					if (current[0] < remote[0]) return true;
					else if (current[0] === remote[0] && current[1] < remote[1]) return true;
					else if (current[0] === remote[0] && current[1] === remote[1] && current[2] < remote[2]) return true;
					return false;
				});
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
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/