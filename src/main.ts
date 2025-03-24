import {
	debounce,
	Notice,
	requireApiVersion,
	MarkdownView,
	Plugin,
	HeadingCache,
	App,
} from "obsidian";
import { creatToc, createLi, renderHeader } from "src/components/floatingtocUI";
import { FlotingTOCSettingTab } from "src/settings/settingsTab";
import { FlotingTOCSetting, DEFAULT_SETTINGS } from "src/settings/settingsData";
import { toggleCollapse, hasChildHeading } from "src/components/toggleCollapse";

let activeDocument: Document;
let line = 0;
export function selfDestruct() {
	requireApiVersion("0.15.0")
		? (activeDocument = activeWindow.document)
		: (activeDocument = window.document);
	let float_toc_dom = activeDocument.querySelectorAll(".floating-toc-div");
	float_toc_dom.forEach((element) => {
		if (element) {
			element.remove();
		}
	});
}


export function refresh_node(plugin: FloatingToc, view: MarkdownView) {
	requireApiVersion("0.15.0")
		? (activeDocument = activeWindow.document)
		: (activeDocument = window.document);
	//let currentleaf = activeDocument?.querySelector(".workspace-leaf.mod-active");
	//let view=plugin.app.workspace.getActiveViewOfType(MarkdownView)
	let float_toc_dom = view.contentEl?.querySelector(".floating-toc-div");

	if (float_toc_dom) {
		let ul_dom = float_toc_dom.querySelector(
			"ul.floating-toc"
		) as HTMLElement;
		if (!ul_dom)
			(ul_dom = float_toc_dom.createEl("ul")),
				ul_dom.addClass("floating-toc");
		let li_dom = float_toc_dom?.querySelectorAll("li.heading-list-item") as NodeListOf<HTMLElement>;
		let headingdata = plugin.headingdata;

		if (plugin.settings.ignoreHeaders) {
			let levelsToFilter = plugin.settings.ignoreHeaders.split("\n");
			headingdata = plugin.headingdata?.filter(
				(item: { level: { toString: () => string } }) =>
					!levelsToFilter.includes(item.level.toString())
			);
		}

		if (headingdata) {
			if (li_dom.length >= headingdata.length) {
				li_dom?.forEach((el, i) => {
					if (headingdata[i]) {
						if (
							headingdata[i].level ==
							el.getAttribute("data-level") &&
							headingdata[i].heading ==
							(el.children[0] as HTMLElement).innerText &&
							headingdata[i].position.start.line ==
							el.getAttribute("data-line")
						) {

							//级别，内容行号完全一致

							const index = Number(el.getAttribute("data-id"));

							if (hasChildHeading(index, plugin.headingdata)) {
								{
									if (!el.hasAttribute("iscollapsed")) {
										el.setAttribute("isCollapsed", "false");
									}
								}
							} else {
								if (el.hasAttribute("iscollapsed")) {
									el.removeAttribute("isCollapsed");
								}
							}

							return;
						} else {
							el.setAttribute(
								"data-level",
								headingdata[i].level.toString()
							);
							el.setAttribute("data-id", i.toString());
							el.setAttribute(
								"data-line",
								headingdata[i].position.start.line.toString()
							);
							el.children[0].querySelector("a")?.remove();

							renderHeader(
								plugin,
								view,
								headingdata[i].heading,
								el.children[0] as HTMLElement,
								view.file.path,
								null
							);
							//(el.children[0] as HTMLElement).innerHTML = '<a class="text">' + headingdata[i].heading + '</a>'
							// 如果有子标题则用属性标记，然后在css里用::before显示特殊符号
						}
					} else {
						el.remove();
					}
				});
			} else {
				headingdata?.forEach((el: HeadingCache, i: number) => {
					if (i <= li_dom.length - 1) {
						if (
							el.level.toString() ==
							li_dom[i].getAttribute("data-level") &&
							el.heading ==
							(li_dom[i].children[0] as HTMLElement)
								.innerText &&
							el.position.start.line.toString() ==
							li_dom[i].getAttribute("data-line")
						) {
							//级别，内容行号完全一致就不需要更新。

							const index = Number(
								li_dom[i].getAttribute("data-id")
							);

							if (hasChildHeading(index, plugin.headingdata)) {
								if (!li_dom[i].hasAttribute("iscollapsed"))
									li_dom[i].setAttribute(
										"isCollapsed",
										"false"
									);

							} else {
								if (li_dom[i].hasAttribute("iscollapsed"))
									li_dom[i].removeAttribute(
										"isCollapsed"
									);

							}

							return;
						} else {
							li_dom[i].setAttribute(
								"data-level",
								el.level.toString()
							);
							li_dom[i].setAttribute("data-id", i.toString());
							li_dom[i].setAttribute(
								"data-line",
								el.position.start.line.toString()
							);
							//(li_dom[i].children[0] as HTMLElement).innerHTML = '<a class="text">' + el.heading + '</a>'
							li_dom[i].children[0].querySelector("a")?.remove();

							renderHeader(
								plugin,
								view,
								el.heading,
								li_dom[i].children[0] as HTMLElement,
								view.file.path,
								null
							);
						}
					} else {
						createLi(plugin, view, ul_dom, el, i);
					}
				});
			}
			return true;
		} else {
			ul_dom.remove();
			return false;
		}
	} else return false;
}
function siblingElems(elem: Element) {
	var nodes = [];
	if (elem?.previousElementSibling) {
		while ((elem = elem.previousElementSibling)) {
			if (elem.nodeType == 1) {
				nodes.push(elem);
			}
		}
	}
	return nodes;
}
function _handleScroll(app: App, plugin: FloatingToc, evt: Event): any {
	let target = evt.target as HTMLElement;
	if (
		target.parentElement?.classList.contains("cm-editor") ||
		target.parentElement?.classList.contains("markdown-reading-view")
	) {
		const view = app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		
		const current_line = view.currentMode.getScroll() ?? 0;
		const headings = plugin.headingdata;
		if (!headings || headings.length === 0) return;
		
		const floattoc = view.contentEl.querySelector(".floating-toc");
		if (!floattoc) return;
		
		// 缓存DOM查询结果
		const headingItems = floattoc.querySelectorAll("li.heading-list-item");
		if (!headingItems.length) return;
		
		const firstHeadingItem = headingItems[0] as HTMLElement;
		const lastHeadingItem = headingItems[headingItems.length - 1] as HTMLElement;
		
		const firstline = parseInt(firstHeadingItem.getAttribute("data-line") || "0");
		const lastline = parseInt(lastHeadingItem.getAttribute("data-line") || "0");
		
		// 查找当前位置的标题
		let targetLine = 0;
		let targetHeading = null;
		
		// 滚动到顶部的处理
		if (current_line <= 0) {
			targetLine = firstline;
		} else {
			// 使用二分查找快速定位当前滚动位置对应的标题
			let start = 0;
			let end = headings.length - 1;
			let foundIndex = -1;
			
			while (start <= end) {
				let mid = Math.floor((start + end) / 2);
				if (headings[mid].position.start.line <= current_line) {
					foundIndex = mid;
					start = mid + 1;
				} else {
					end = mid - 1;
				}
			}
			
			if (foundIndex !== -1) {
				targetLine = headings[foundIndex].position.start.line;
				targetHeading = headings[foundIndex];
			} else {
				targetLine = firstline;
			}
		}
		
		// 更新UI
		// 1. 移除之前的高亮
		const prevLocation = floattoc.querySelector(".heading-list-item.located");
		if (prevLocation) {
			prevLocation.removeClass("located");
		}
		
		// 2. 添加新的高亮
		const curLocation = floattoc.querySelector(`li[data-line='${targetLine}']`) as HTMLElement;
		if (!curLocation) return;
		
		curLocation.addClass("located");
		
		// 3. 更新焦点元素
		const level = parseInt(curLocation.getAttribute("data-level") || "1");
		const adjustedLevel = level > 1 ? level - 1 : 1;
		
		const focusele = floattoc.querySelector(`li.focus`);
		if (focusele) {
			focusele.removeClass("focus");
		}
		
		// 4. 查找并设置焦点元素
		const siblings = siblingElems(curLocation);
		for (let i = 0; i < siblings.length; i++) {
			const element = siblings[i] as HTMLElement;
			if (element.dataset["level"] <= adjustedLevel.toString()) {
				element.addClass("focus");
				break;
			}
		}
		
		// 5. 滚动到可见区域
		requestAnimationFrame(() => {
			curLocation.scrollIntoView({ block: "nearest", behavior: "smooth" });
		});
	}
}
export default class FloatingToc extends Plugin {
	app: App;
	settings: FlotingTOCSetting;
	headingdata: any;

	async onload() {
		requireApiVersion("0.15.0")
			? (activeDocument = activeWindow.document)
			: (activeDocument = window.document);
		await this.loadSettings();
		const updateHeadingsForView = (view: MarkdownView) => {
			view
				? refresh_node(this, view)
					? false
					: creatToc(this.app, this)
				: false;
		};
		// let isLoadOnMobile = this.settings.isLoadOnMobile;
		// if (Platform.isMobileApp && isLoadOnMobile) {
		// 	console.log(`floating toc disable loading on mobile`);
		// 	return;
		// }
		this.addCommand({
			id: "pin-toc-panel",
			name: "Pinning the Floating TOC panel",
			icon: "pin",
			callback: async () => {
				let view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					let floatingTocWrapper =
						view.contentEl.querySelector(".floating-toc-div");
					if (floatingTocWrapper) {
						if (floatingTocWrapper.classList.contains("pin"))
							floatingTocWrapper.removeClass("pin");
						else floatingTocWrapper.addClass("pin");
					}
				}
			},
		});
		this.addCommand({
			id: "hide-toc-panel",
			name: "Hide/Show the Floating TOC panel",
			icon: "list",
			callback: async () => {
				let view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					let floatingTocWrapper =
						view.contentEl.querySelector(".floating-toc-div");
					if (floatingTocWrapper) {
						if (floatingTocWrapper.classList.contains("hide"))
							floatingTocWrapper.removeClass("hide");
						else floatingTocWrapper.addClass("hide");
					}
				}
			},
		});
		this.addCommand({
			id: "scroll-to-bottom",
			name: "Scroll to Bottom",
			icon: "double-down-arrow-glyph",
			callback: async () => {
				const view =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {


					const file = this.app.workspace.getActiveFile()
					const content = await (this.app as any).vault.cachedRead(file);
					const lines = content.split('\n');
					let numberOfLines = lines.length;
					//in preview mode don't count empty lines at the end
					if (view.getMode() === 'preview') {
						while (numberOfLines > 0 && lines[numberOfLines - 1].trim() === '') {
							numberOfLines--;
						}
					}
					view.currentMode.applyScroll((numberOfLines - 1))


				}
			},
		});
		this.addCommand({
			id: "scroll-to-top",
			name: "Scroll to Top",
			icon: "double-up-arrow-glyph",
			callback: async () => {
				const view =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					view.setEphemeralState({ scroll: 0 });
				}
			},
		});
		this.addCommand({
			id: "toggle-position-style",
			name: "Toggle Floating TOC Position (left/right)",
			icon: "switch",
			callback: () => {
				if (this.settings.positionStyle === "left") {
					this.settings.positionStyle = "right";
				} else if (this.settings.positionStyle === "right") {
					this.settings.positionStyle = "left";
				} else if (this.settings.positionStyle === "both") {
					new Notice("Position style set to both. Toogle position only works when fixed position (left or right) is selected.");
				}
				this.saveSettings();
				dispatchEvent(new Event("refresh-toc"))
			},
		});
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				let view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const current_file = this.app.workspace.getActiveFile();
					let heading =
						this.app.metadataCache.getFileCache(
							current_file
						).headings;
					let cleanheading: HeadingCache[] = [];
					heading?.map((item: HeadingCache) => {
						item.heading = item.heading.replace(
							/<\/?[\s\S]*?(?:".*")*>/g,
							""
						); // clean html tags
						cleanheading.push(item);
					});
					this.headingdata = cleanheading;

					if (this.settings.ignoreHeaders) {
						let levelsToFilter =
							this.settings.ignoreHeaders.split("\n");
						this.headingdata = heading.filter(
							(item) =>
								!levelsToFilter.includes(item.level.toString())
						);
					}
					refresh(view);
				}
			})
		);
		/* 		this.registerEvent(this.app.workspace.on("file-open", (file) => {
					let view = this.app.workspace.getActiveViewOfType(MarkdownView)
					if (view) {
						const current_file = this.app.workspace.getActiveFile()
						let heading = this.app.metadataCache.getFileCache(current_file).headings
						globalThis.headingdata = heading
						console.log("refresh")
						refresh(view);
					}
				}
				)
				); */
		this.registerEvent(
			this.app.metadataCache.on("changed", () => {
				let view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const current_file = view.file;

					let heading =
						this.app.metadataCache.getFileCache(
							current_file
						).headings;
					let cleanheading: HeadingCache[] = [];
					heading?.map((item: HeadingCache) => {
						item.heading = item.heading.replace(
							/<\/?[\s\S]*?(?:".*")*>/g,
							""
						); // clean html tags
						cleanheading.push(item);
					});
					let newheading = cleanheading?.map((item) => {
						return (
							item.level + item.heading + item.position.start.line
						);
					});
					let newheadingdata = this.headingdata?.map(
						(item: HeadingCache) => {
							return (
								item.level +
								item.heading +
								item.position.start.line
							);
						}
					);
					if (
						JSON.stringify(newheadingdata) ==
						JSON.stringify(newheading)
					)
						return; //标题结构行号没有变化不更新
					else {
						//	console.log("refresh")

						this.headingdata = cleanheading;
						if (this.settings.ignoreHeaders) {
							let levelsToFilter =
								this.settings.ignoreHeaders.split("\n");
							this.headingdata = heading.filter(
								(item) =>
									!levelsToFilter.includes(
										item.level.toString()
									)
							);
						}
						refresh(view);
					}
				}
			})
		);

		const refresh_outline = (view: MarkdownView): any => {
			updateHeadingsForView(view);
		};
		const refresh = (view: MarkdownView) =>
			debounce(refresh_outline(view), 300, true);
		/* 		this.registerEvent(
					this.app.workspace.on("editor-change", (editor) => {
						const activeView =
							this.app.workspace.getActiveViewOfType(MarkdownView);
						if (activeView) {
							let resolved = false;
							this.registerEvent(
								this.app.metadataCache.on("resolve", (file) => {
									if (activeView.file === file && !resolved) {
										resolved = true;
										updateHeadingsForView();
									}
								})
							);
						}
					})
				); */

		activeDocument.addEventListener(
			"scroll",
			(event) => {
				this.handleScroll(this.app, this, event);
			},
			true
		);
		this.addSettingTab(new FlotingTOCSettingTab(this.app, this));

		updateHeadingsForView(
			this.app.workspace.getActiveViewOfType(MarkdownView)
		);
		
			this.app.workspace.on("window-open", (leaf) => {
				leaf.doc.addEventListener(
					"scroll",
					(event) => {
						this.handleScroll(this.app, this, event);
					},
					true
				);
			});
		
		
		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.trigger("parse-style-settings");
		});
	}

	handleScroll = (app: App, plugin: FloatingToc, evt: Event) =>
		debounce(_handleScroll(app, plugin, evt), 200);

	onunload() {
		requireApiVersion("0.15.0")
			? (activeDocument = activeWindow.document)
			: (activeDocument = window.document);
		
		// 清理滚动事件监听器
		try {
			activeDocument.removeEventListener(
				"scroll",
				(event) => {
					this.handleScroll(this.app, this, event);
				},
				true
			);
		} catch (e) {
			console.error("Error removing scroll event listener:", e);
		}
		
		// 清理虚拟列表和其他资源
		try {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				const floatingTocWrapper = view.contentEl?.querySelector(".floating-toc-div");
				if (floatingTocWrapper) {
					// 移除所有事件监听器
					const headingItems = floatingTocWrapper.querySelectorAll("li.heading-list-item");
					headingItems.forEach(item => {
						// 尝试移除所有可能的事件监听器
						const clone = item.cloneNode(true);
						if (item.parentNode) {
							item.parentNode.replaceChild(clone, item);
						}
					});
					
					// 清理自定义清理函数
					if ((floatingTocWrapper as any)._tocCleanup) {
						(floatingTocWrapper as any)._tocCleanup();
					}
				}
			}
		} catch (e) {
			console.error("Error cleaning up resources:", e);
		}
		
		// 移除所有浮动目录元素
		selfDestruct();
	}
	setHeadingdata(content: HeadingCache): void {
		this.headingdata = content;
	}
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
