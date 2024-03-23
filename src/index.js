() => {
	/**
	 * Dyna plugin information, should contain latest version to compare against
	 * @typedef {Object} DynaPluginInformation
	 * @property {string} version - Latest version of the plugin
	 * @property {string} [target="plugin.json"] - Optional target to download the plugin
	 */

	/**
	 * Information about a currently loaded plugin
	 * @typedef {Object} DynaPlugin
	 * @property {string} author- Namespace of the plugin, usually the author's username.
	 * @property {string} id- Id of the plugin.
	 * @property {number} repo - Location of the plugin's repository.
	 * @property {int} version - Currently loaded version.
	 * @property {boolean} [dev=false] - Whether the plugin is currently running in developer mode.
	 * @property {boolean} [shouldRestart=false] - Whether the manager should reload the client when the plugin is updated.
	 */

	class UpdateIndicator extends HTMLElement {
		constructor() {
			super();
			this._template = `
				<div class="dyna popup updateInfo">
					<progress id="updateProgress" max=1 value=.5></progress>
					<div class="information">
						<h2 id="progressText">Please wait...</h2>
						<header>
							<span>dyna</span>
						</header>
					</div>
				</div>
			`

			this._styles = `
				.dyna.popup {
					--offset: 10px;

					font-family: sans-serif;

					position: absolute;
					top: var(--offset);
					right: var(--offset);
					display: flex;
					flex-flow: column nowrap;
					border-radius: 10px;
					overflow: clip;

					background: rgba(var(--primary-background-rgb), .5);
					backdrop-filter: blur(5px);
					color: var(--foreground);
				}

				.dyna.popup.updateInfo .information {
					padding: 10px;
				}

				.dyna.popup.updateInfo progress {
					-webkit-appearance: none;
					appearance: none;

					width: 100%;
				}


				.dyna.popup.updateInfo progress::-webkit-progress-value {
					background: var(--accent);
					transition: all 1s ease-in-out;
				}

				.dyna.popup.updateInfo progress::-webkit-progress-bar {
					background: transparent;
				}

				.dyna.popup.updateInfo h2 {
					margin: 0 0 10px 0;
				}

				.dyna.popup.updateInfo header>span {
					color: var(--tertiary-foreground);
					font-style: italic;
				}

				.slidein {
					animation-name: slide;
					animation-fill-mode: forwards;
					animation-duration: 1s;
					animation-timing-function: ease-in-out;
				}

				.slideout {
					animation-name: slide;
					animation-direction: reverse;
					animation-duration: 1s;
					animation-timing-function: ease-in-out;
				}

				@keyframes slide {
					from {
						transform: translateX(500px);
					}

					to {
						transform: translateX(0px);
					}
				}
			`
		}

		connectedCallback() {
			const shadow = this.attachShadow({ mode: "open" })
			const style = new CSSStyleSheet()
			style.replaceSync(this._styles);
			shadow.innerHTML = this._template
			shadow.adoptedStyleSheets = [style]
		}

		updateProgress(int) {
			const shadowDOM = this.shadowRoot
			shadowDOM.getElementById("updateProgress").value = int
		}

		updateProgressInformation(amount) {
			const shadowDom = this.shadowRoot
			shadowDom.getElementById("progressText").innerText = `Updating ${amount} plugins`
		}

		slide(dir) {
			const shadowDom = this.shadowRoot
			shadowDom.querySelector('.dyna.popup.updateInfo').classList.add(`slide${dir}`)

			setTimeout(() => shadowDom.querySelector('.dyna.popup.updateInfo').classList.remove(`slide${dir}`), 1000);
		}

		finished() {
			const shadowDom = this.shadowRoot
			shadowDom.getElementById("progressText").innerText = `All plugins have been updated!`
		}
	}

	if (!customElements.get('dyna-indicator')){
		customElements.define('dyna-indicator', UpdateIndicator)
	}

	/** Dyna */
	window.dyna = {};

	/**
	 * Dyna's store. It stores currently loaded plugins and the interval on which the plugins should be updated
	 * Default interval is 1h
	 * @type {{ dynaplugins: DynaPlugin[], updateInterval: number }}
	 */
	window.dyna.store = { dynaplugins: [], updateInterval: 3600 }

	/** Convert the interval from seconds to milliseconds */
	const CALCULATED_INTERVAL = window.dyna.store.updateInterval * 1000;

	/** Used for the loading indicator, which is not implemented yet */
	let updateProgress = 0;


	/**
	 * Internal API - Fetch a remote resourse whilst logging it's progress.
	 * Percentage streaming is planned
	 */
	async function fetchWithProgress(url) {
		const xhr = new XMLHttpRequest();
		return await new Promise((resolve) => {
			xhr.addEventListener("progress", (event) => {
				if (event.lengthComputable) {
					console.log("Downloading:", `${(event.loaded / event.total) * 100}%`);
				}
			});
			xhr.addEventListener("loadend", () => {
				if (xhr.readyState === 4 && xhr.status === 200) {
					resolve(xhr.responseText);
				}
			});
			xhr.open("GET", url);
			xhr.send();
		});
	}

	/**
	 * Internal API - Update dyna's plugin store
	 */
	function gatherPluginsFromState() {
		// Reset store because it's going to be recalculated
		if (window.dyna.store.dynaplugins.length > 0) {
			window.dyna.store.dynaplugins.length = 0
		}

		const data = state.plugins.plugins.data_; // map of K=name+instance, V=plugin
		for (const [key, value] of data.entries()) {
			if (value.value_.dyna) {
				if (value.value_.namespace === "amycatgirl" && (value.value_.id === "dyna-devel" || value.value_.id === "dyna") && value.value_.dyna.dev) {
					allowDebugging()
				}

				window.dyna.store.dynaplugins.push({
					...value.value_.dyna,
					version: value.value_.version,
					author: value.value_.namespace,
					id: value.value_.id
				});
			}
		}

		console.log("Plugins using dyna:", window.dyna.store.dynaplugins.length)
	}

	/**
	 * Not implemented - Show a modal prompting the user to restart their client
	 */
	function restartWithModalWarning() {
		console.log("TODO")
	}

	/**
	 * Internal API - Fetch plugin information from Github
	 * @param {string} repo - Plugin's repository
	 * @returns {DnyaPluginInformation}
	 */
	async function fetchPluginInformation(repo) {
		try {
			const res = fetch(`https://raw.githubusercontent.com/${repo}/main/dyna.json`).then(async (res) => await res.json())

			return res
		} catch (err) {
			console.error("Error getting plugin information for repo:", repo)
		}
	}

	/**
	 * Internal API - Parse and load plugins, also handle syntax errors/plugin errors
	 * @param {string} pl - Plugin manifest, in the form of a stringified json object
	 */
	function parseAndLoadPlugin(pl) {
		try {
			const plugin = JSON.parse(pl)
			console.log("PARSED", plugin)
			window.state.plugins.add(plugin)
		} catch(err) {
			console.error("Could not load plugin:", err)
		}
	}

	/**
	 * Internal API - Update all installed plugins.
	 */
	async function updateAllPlugins() {
		// Check if the store isn't empty or was initialized incorrectly
		if (window.dyna.store.dynaplugins.length == 0) {
			gatherPluginsFromState()
		}

		const indicator = window.document.createElement("dyna-indicator")
		window.document.body.appendChild(indicator)
		indicator.updateProgressInformation(window.dyna.store.dynaplugins.length)
		indicator.slide("in")

		let shouldRestart = false;
		for await (const [index, plugin] of window.dyna.store.dynaplugins.entries()) {
			const info = await fetchPluginInformation(plugin.repo)
			if (info.latest > plugin.version) {
				if (plugin.dev) {
					console.log("plugin in dev mode, not updating")
					continue;
				}

				if (plugin.shouldRestart) {
					shouldRestart = true
				};

				try {
					const updatedPlugin = await fetchWithProgress(`https://raw.githubusercontent.com/${plugin.repo}/main/${info.target ?? "plugin.json"}`)
					parseAndLoadPlugin(updatedPlugin)
				} catch(err) {
					console.error(err)
				}
			} else {
				console.log("Plugin is up-to-date :)")
			}

			updateProgress = ((index + 1) / window.dyna.store.dynaplugins.length) * 100
			indicator.updateProgress(updateProgress)
			console.log(`Progress: ${updateProgress}%`)
		}

		if (shouldRestart) {
			// TODO: Replace with restartWithModalWarning
			window.alert("RELOADING")
			window.location.reload();
		}

		// Remove indicator as all plugins have updated
		indicator.finished()
		setTimeout(() => indicator.slide("out"), 4000);
		setTimeout(() => indicator.remove(), 5000);
	}

	function InternalArtificialDelay(callback) {
		setTimeout(callback, 5000)
	}

	/**
	 * Internal API - Expose internal APIs to debug dyna
	 */
	function allowDebugging() {
		// Only for debugging purposes
		window.dyna.debug = {};
		window.dyna.debug.updatePluginsForced = updateAllPlugins;
		window.dyna.debug.updateStore = gatherPluginsFromState;
		window.dyna.debug.fetch = fetchWithProgress;
		window.dyna.debug.parse = parseAndLoadPlugin;
		window.dyna.debug.getPluginInformation = fetchPluginInformation;
	}

	/**
	 * Dyna plugin API
	 */
	window.dyna.api = {}

	/**
	 * Returns an array of plugins that are using Dyna
	 * @returns {DynaPlugin[]}
	 */
	window.dyna.api.getPlugins = function () {
		const pluginArray = window.dyna.store.dynaplugins;
		return Object.freeze(pluginArray)
	}

	/**
	 * Check for plugin updates
	 * @param {string} author - Author of the plugin to search
	 * @param {string} id - Id of the plugin to search
	 * @returns {boolean} whether the plugin needs an update or the check has failed
	 */
	window.dyna.api.checkUpdatesForPlugin = async function (author, id) {
		try {
			const plugin = window.dyna.store.dynaplugins.find(pl => pl.author == author && pl.id == id);

			/** @type {DynaPluginInformation} */
			const information = await fetchPluginInformation(plugin.repo)

			if (plugin.version != information.latest && !plugin.dev) {
				console.log(`[updater] An update has been found for the plugin ${author}/${id}`);
				return true
			}

			console.log(`[updater] No update has been found...`)
			return false
		} catch (error) {
			console.error("[updater] An error has been thrown:", error)
			return false
		}
	}

	setInterval(updateAllPlugins, CALCULATED_INTERVAL)
	setTimeout(gatherPluginsFromState, 500) // Let plugins load successfully

	return  {
		onUnload: () => {
			// Unload dyna by removing the update interval and removing all related APIs from the window object
			clearInterval(updateAllPlugins, CALCULATED_INTERVAL)
			window.dyna = null
			console.log("DYNA has been unloaded...")
		}
	}
}
